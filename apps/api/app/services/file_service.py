from app.schemas.interview import InterviewUpload


def store_upload_metadata(upload: InterviewUpload) -> InterviewUpload:
    """P0 stores only structured upload metadata; real file storage is deferred."""
    return upload


def transcribe_audio(content: bytes, filename: str) -> str:
    """MP3 语音转写 —— 本轮仅留接口桩。

    分治架构(见 spec):PDF/DOCX 端上解析,MP3 走后端云 ASR。真实方案选定
    阿里云百炼 Paraformer(只收公网 URL → 需 OSS 中转 → 异步提交/轮询/下载结果),
    完整接法见 .spec-workflow/specs/backend-feature-optimization/mp3-asr-aliyun.md。

    本轮不接 OSS / DashScope,直接抛 NotImplementedError(路由映射为 501 + 明确中文提示),
    保证「先流出接口、链路打通」:上传 mp3 能拿到确定的「暂未支持」反馈,而非静默失败。
    """
    raise NotImplementedError("mp3 语音转写暂未支持")
