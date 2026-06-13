from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.explore import ExploreProfile, ExploreResult, FollowupQuestion
from app.schemas.interview import InterviewAnalysis, InterviewReport
from app.services import mock_state
from app.utils import prompts

logger = get_logger("app.ai_service")


def generate_followups(profile: ExploreProfile) -> list[FollowupQuestion]:
    return mock_state.get_followups(profile)


def generate_explore_result(_: ExploreProfile | None = None) -> ExploreResult:
    return mock_state.get_explore_result()


def analyze_interview(session_id: str) -> InterviewReport:
    """P1-05:面试复盘报告生成,mock/real 双模式。

    - mock(默认):走 mock_state,零依赖零密钥,演示/CI 安全。
    - real:基于本次上传内容调用真实 Claude,按 InterviewReport schema 结构化输出。
      任何前置缺失(未配 key / SDK 不可用)或调用失败,都回退 mock,保证链路不中断。

    P1-06:无论 mock 还是 real,生成成功后都把报告按 sessionId 写入缓存(save_report),
    供 /overview 纯读返回,避免每次 GET 重新生成(real 模式下避免重复烧 LLM)。

    session_id 由服务端权威生成并回填,不信任模型返回的该字段。
    """
    if settings.ai_mode != "real":
        return mock_state.save_report(mock_state.build_mock_report(session_id))

    if not settings.ai_api_key:
        logger.warning("AI_MODE=real 但未配置 AI_API_KEY,回退 mock 报告(session=%s)", session_id)
        return mock_state.save_report(mock_state.build_mock_report(session_id))

    try:
        report = _real_interview_report(session_id)
        logger.info("真实 LLM 面试报告生成成功(session=%s, model=%s)", session_id, settings.ai_model)
        return mock_state.save_report(report)
    except Exception as exc:  # noqa: BLE001 —— 任何失败都回退 mock,演示优先
        logger.warning("真实 LLM 报告生成失败,回退 mock(session=%s):%s", session_id, exc)
        return mock_state.save_report(mock_state.build_mock_report(session_id))


def _real_interview_report(session_id: str) -> InterviewReport:
    """调用 Anthropic,用 tool-use 强制按 InterviewReport schema 输出。

    anthropic 仅在此延迟导入:mock 模式下即使未安装 SDK 也不受影响。
    """
    import anthropic

    upload = mock_state.SESSIONS.get(session_id, mock_state.LATEST_UPLOAD)
    user_prompt = prompts.build_interview_user_prompt(
        job_title=upload.job_title,
        company=upload.company,
        jd=upload.jd,
        transcript=upload.transcript,
    )

    client = anthropic.Anthropic(api_key=settings.ai_api_key)
    tool = {
        "name": "submit_interview_report",
        "description": "提交结构化的中文面试复盘报告",
        "input_schema": _interview_report_input_schema(),
    }
    response = client.messages.create(
        model=settings.ai_model,
        max_tokens=settings.ai_max_tokens,
        system=prompts.INTERVIEW_SYSTEM_PROMPT,
        tools=[tool],
        tool_choice={"type": "tool", "name": "submit_interview_report"},
        messages=[{"role": "user", "content": user_prompt}],
    )

    payload = _extract_tool_input(response, "submit_interview_report")
    # 服务端权威字段:sessionId 回填、title 用真实岗位名兜底,避免模型漏字段。
    payload["session_id"] = session_id
    payload.setdefault("title", f"{upload.job_title}一面")
    return InterviewReport.model_validate(payload)


def _extract_tool_input(response, tool_name: str) -> dict:
    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and block.name == tool_name:
            return dict(block.input)
    raise ValueError("模型未返回预期的 tool_use 结果")


def _interview_report_input_schema() -> dict:
    """InterviewReport 的 JSON Schema(camelCase,供 Claude tool-use 约束输出)。

    手写而非直接用 model_json_schema(),以保持 prompt 精简、字段含义清晰可控,
    并避免把 session_id/默认值等服务端字段暴露给模型。
    """
    return {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "报告标题,如「AI产品经理一面」"},
            "overall": {"type": "string", "description": "整体表现一句话,如「整体表现：中等偏上」"},
            "conclusion": {"type": "string", "description": "核心结论,2-3 句"},
            "passPossibility": {"type": "integer", "description": "通过可能性 0-100"},
            "passLevel": {"type": "string", "enum": ["低", "中", "高"]},
            "coreProblems": {"type": "array", "items": {"type": "string"}, "description": "2-4 条核心问题"},
            "interviewerView": {
                "type": "object",
                "properties": {
                    "impression": {"type": "string"},
                    "positives": {"type": "array", "items": {"type": "string"}},
                    "concerns": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["impression", "positives", "concerns"],
            },
            "priorityTasks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "短横线英文 id,如 quantify-result"},
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "status": {"type": "string", "enum": ["未开始", "进行中", "已完成"]},
                    },
                    "required": ["id", "title", "description", "status"],
                },
            },
        },
        "required": [
            "title",
            "overall",
            "conclusion",
            "passPossibility",
            "passLevel",
            "coreProblems",
            "interviewerView",
            "priorityTasks",
        ],
    }


def get_interview_report(session_id: str) -> InterviewReport:
    """P1-06:读取报告(纯读,不生成)—— 命中缓存直接返回,未命中回退 mock。

    /overview 走这里:绝不触发 real LLM,避免每次刷新重复生成。
    """
    return mock_state.get_report(session_id)


def generate_interview_analysis(_: str) -> InterviewAnalysis:
    return mock_state.get_analysis()
