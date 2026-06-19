"""MP3 语音转写真实实现 —— 阿里云百炼 Paraformer + DashScope 临时上传凭证。

链路(见 spec mp3-asr-aliyun.md;OSS 用 DashScope 自带临时凭证,免自建):
  1. getPolicy(model)            → 拿上传凭证(policy/signature/upload_host/upload_dir...)
  2. POST upload_host (multipart) → 文件传到临时 OSS,拼出 oss:// URL
  3. 提交转写任务(file_urls=[oss://...],双 Header:Async + OssResourceResolve) → task_id
  4. 轮询 GET/POST /tasks/{task_id} → SUCCEEDED → 拿 transcription_url
  5. 下载 transcription_url JSON → 拼 transcripts[].text 为纯文本

凭证:仅 settings.dashscope_api_key(进 .env)。缺 key 时 is_configured()=False,
上层(file_service)回退 501 桩,不在此处抛 key 缺失。

临时 URL 限制(DashScope 自带凭证):48h 有效、上传凭证接口 100QPS、官方说勿用于生产。
先打通验证用;生产换正经 OSS(改 _upload 一处即可,其余链路不变)。
"""

import json
import time
from pathlib import Path

import requests

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("app.asr_service")

_BASE = "https://dashscope.aliyuncs.com"
_UPLOAD_POLICY_URL = f"{_BASE}/api/v1/uploads"
_TRANSCRIPTION_URL = f"{_BASE}/api/v1/services/audio/asr/transcription"
_TASK_URL = f"{_BASE}/api/v1/tasks"

_HTTP_TIMEOUT = 30  # 单次 HTTP 请求超时(秒);轮询总超时另由 settings.asr_poll_timeout_s 控制


class AsrError(Exception):
    """语音转写过程出错(凭证/上传/任务失败/超时)——路由映射为 5xx,前端回退手动粘贴。"""


def is_configured() -> bool:
    """是否已配置 DashScope key。未配置时 file_service 回退 501 桩。"""
    return bool(settings.dashscope_api_key)


def _auth_header() -> dict:
    return {"Authorization": f"Bearer {settings.dashscope_api_key}"}


def _get_upload_policy(model: str) -> dict:
    """步骤1:获取临时上传凭证。"""
    resp = requests.get(
        _UPLOAD_POLICY_URL,
        headers={**_auth_header(), "Content-Type": "application/json"},
        params={"action": "getPolicy", "model": model},
        timeout=_HTTP_TIMEOUT,
    )
    if resp.status_code != 200:
        raise AsrError(f"获取上传凭证失败(HTTP {resp.status_code})")
    data = resp.json().get("data")
    if not data or "upload_host" not in data:
        raise AsrError("上传凭证响应缺少必要字段")
    return data


def _upload_to_oss(policy: dict, content: bytes, filename: str) -> str:
    """步骤2:按凭证 multipart 上传到临时 OSS,返回 oss:// URL。"""
    key = f"{policy['upload_dir']}/{filename}"
    # file 必须是最后一个表单域(文档要求);其余顺序无所谓。
    form = {
        "OSSAccessKeyId": (None, policy["oss_access_key_id"]),
        "Signature": (None, policy["signature"]),
        "policy": (None, policy["policy"]),
        "x-oss-object-acl": (None, policy["x_oss_object_acl"]),
        "x-oss-forbid-overwrite": (None, policy["x_oss_forbid_overwrite"]),
        "key": (None, key),
        "success_action_status": (None, "200"),
        "file": (filename, content),
    }
    resp = requests.post(policy["upload_host"], files=form, timeout=_HTTP_TIMEOUT)
    if resp.status_code != 200:
        raise AsrError(f"上传音频到临时存储失败(HTTP {resp.status_code})")
    return f"oss://{key}"


def _submit_transcription(oss_url: str, model: str) -> str:
    """步骤3:提交异步转写任务,返回 task_id。

    双 Header:X-DashScope-Async(异步任务制)+ X-DashScope-OssResourceResolve(解析 oss:// 临时 URL)。
    """
    headers = {
        **_auth_header(),
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
        "X-DashScope-OssResourceResolve": "enable",
    }
    body = {
        "model": model,
        "input": {"file_urls": [oss_url]},
        "parameters": {"channel_id": [0], "language_hints": ["zh"], "disfluency_removal_enabled": True},
    }
    resp = requests.post(_TRANSCRIPTION_URL, headers=headers, data=json.dumps(body), timeout=_HTTP_TIMEOUT)
    if resp.status_code != 200:
        raise AsrError(f"提交转写任务失败(HTTP {resp.status_code})")
    task_id = resp.json().get("output", {}).get("task_id")
    if not task_id:
        raise AsrError("提交转写任务响应缺少 task_id")
    return task_id


def _poll_task(task_id: str) -> dict:
    """步骤4:轮询任务直至 SUCCEEDED/FAILED 或超时。返回 output。

    特例:code=SUCCESS_WITH_NO_VALID_FRAGMENT 表示「处理成功但音频无有效语音」,
    虽 task_status=FAILED,但语义是空结果而非故障 —— 当作正常结束返回(上层拼出空文本,
    路由映射 asr_empty 提示换文件/粘贴),不抛 AsrError。
    """
    deadline = settings.asr_poll_timeout_s
    waited = 0.0
    while waited < deadline:
        resp = requests.post(f"{_TASK_URL}/{task_id}", headers=_auth_header(), timeout=_HTTP_TIMEOUT)
        if resp.status_code != 200:
            raise AsrError(f"查询任务失败(HTTP {resp.status_code})")
        output = resp.json().get("output", {})
        status = output.get("task_status")
        if status == "SUCCEEDED":
            return output
        if status == "FAILED":
            if output.get("code") == "SUCCESS_WITH_NO_VALID_FRAGMENT":
                return output  # 无有效语音:当空结果处理,不算故障
            raise AsrError(f"转写任务失败:{output.get('message') or output.get('code') or '未知原因'}")
        time.sleep(settings.asr_poll_interval_s)
        waited += settings.asr_poll_interval_s
    raise AsrError("转写超时,请重试或粘贴文本")


def _fetch_result_text(output: dict) -> str:
    """步骤5:从任务结果取 transcription_url,下载 JSON,拼 transcripts[].text。"""
    results = output.get("results") or []
    texts: list[str] = []
    for item in results:
        if item.get("subtask_status") != "SUCCEEDED":
            continue
        url = item.get("transcription_url")
        if not url:
            continue
        resp = requests.get(url, timeout=_HTTP_TIMEOUT)
        if resp.status_code != 200:
            raise AsrError("下载转写结果失败")
        data = resp.json()
        for tr in data.get("transcripts", []):
            text = tr.get("text", "").strip()
            if text:
                texts.append(text)
    return "\n".join(texts).strip()


def transcribe(content: bytes, filename: str) -> str:
    """编排五步,返回纯文本转写。任何环节失败抛 AsrError(上层映射 5xx + 回退手动粘贴)。"""
    model = settings.asr_model
    # 文件名兜底(临时 OSS key 不接受空名/异常字符;用扩展名保住 .mp3)。
    safe_name = Path(filename).name or "audio.mp3"
    try:
        policy = _get_upload_policy(model)
        oss_url = _upload_to_oss(policy, content, safe_name)
        task_id = _submit_transcription(oss_url, model)
        logger.info("ASR 任务已提交(model=%s, task_id=%s)", model, task_id)
        output = _poll_task(task_id)
        text = _fetch_result_text(output)
        logger.info("ASR 完成(task_id=%s, 文本长度=%d)", task_id, len(text))
        return text
    except AsrError:
        raise
    except requests.RequestException as exc:
        raise AsrError(f"网络请求失败:{exc}") from exc
    except Exception as exc:  # noqa: BLE001 —— 兜底,统一成 AsrError 交路由
        raise AsrError(f"语音转写异常:{exc}") from exc
