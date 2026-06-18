from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.explore import ExploreProfile, ExploreResult, FollowupQuestion, FollowupResponse, FollowupTurn
from app.schemas.interview import InterviewAnalysis, InterviewReport
from app.services import mock_state
from app.utils import prompts

logger = get_logger("app.ai_service")


# 多轮追问硬上限:已问满 6 轮则强制结束(防模型不肯停)。前端也会兜一道。
_FOLLOWUP_MAX_TURNS = 6


def generate_followup(profile: ExploreProfile, history: list[FollowupTurn] | None = None) -> FollowupResponse:
    """AI 接入:对话式多轮追问 —— 基于画像 + 已问历史生成「下一题」或判定结束(done)。

    - 硬上限:已问满 _FOLLOWUP_MAX_TURNS 轮直接 done(防失控,即便模型不肯停)。
    - mock(默认):走固定题库(mock_state.get_followups),按已问轮数取第 N 题;取完返回 done。
    - real:基于画像 + 历史调真实模型(anthropic tool-use / openai JSON),产出单题或 done。
    任何前置缺失(未配 key / SDK 不可用)或调用失败,都回退 mock,保证 followup 屏不卡死。
    """
    turns = history or []
    if len(turns) >= _FOLLOWUP_MAX_TURNS:
        return FollowupResponse(question=None, done=True)

    if settings.ai_mode != "real" or not settings.ai_api_key:
        if settings.ai_mode == "real":
            logger.warning("AI_MODE=real 但未配置 AI_API_KEY,回退 mock 追问")
        return _mock_followup(profile, turns)

    try:
        resp = _real_followup(profile, turns)
        logger.info("真实 LLM 追问生成成功(provider=%s, model=%s, 第 %d 轮, done=%s)", settings.ai_provider, settings.ai_model, len(turns) + 1, resp.done)
        return resp
    except Exception as exc:  # noqa: BLE001 —— 任何失败都回退 mock,演示优先
        logger.warning("真实 LLM 追问生成失败,回退 mock:%s", exc)
        return _mock_followup(profile, turns)


def _mock_followup(profile: ExploreProfile, turns: list[FollowupTurn]) -> FollowupResponse:
    """mock 多轮:从固定题库按已问轮数取第 N 题;取完(题库耗尽)返回 done。"""
    bank = mock_state.get_followups(profile)
    idx = len(turns)
    if idx >= len(bank):
        return FollowupResponse(question=None, done=True)
    return FollowupResponse(question=bank[idx], done=False)


def generate_explore_result(profile: ExploreProfile | None = None, user_id: str | None = None) -> ExploreResult:
    """AI 接入:方向推荐生成 —— peek 缓存命中即返回(纯读不烧 LLM),未命中再 mock / real / 回退生成。

    - 命中缓存:直接返回(刷新/聚合页不重生成,real 模式下避免重复烧 LLM)。
    - 未命中:mock 或缺 key → build_mock + save;real → 基于画像调真实模型,成功 save,失败回退 mock + save。
    画像来源:路由传入则用之,否则读已落库画像(mock_state.get_explore_profile)。
    user_id:按用户分区缓存/画像(B7);None 时各 mock_state 调用走其默认 DEV_USER_ID。
    """
    uid = user_id or mock_state.DEV_USER_ID
    cached = mock_state.peek_explore_result(uid)
    if cached is not None:
        return cached

    if settings.ai_mode != "real" or not settings.ai_api_key:
        if settings.ai_mode == "real":
            logger.warning("AI_MODE=real 但未配置 AI_API_KEY,回退 mock 方向推荐")
        return mock_state.save_explore_result(mock_state.build_mock_explore_result(), uid)

    resolved = profile if profile is not None else mock_state.get_explore_profile(uid)
    try:
        result = _real_explore_result(resolved)
        logger.info("真实 LLM 方向推荐生成成功(provider=%s, model=%s)", settings.ai_provider, settings.ai_model)
        return mock_state.save_explore_result(result, uid)
    except Exception as exc:  # noqa: BLE001 —— 任何失败都回退 mock,演示优先
        logger.warning("真实 LLM 方向推荐生成失败,回退 mock:%s", exc)
        return mock_state.save_explore_result(mock_state.build_mock_explore_result(), uid)


def run_analysis(session_id: str) -> InterviewReport:
    """方案C:面试复盘报告生成(阻塞式全量生成),供 BackgroundTask 在后台线程调用。

    - mock(默认):走 mock_state,零依赖零密钥,演示/CI 安全。
    - real:基于本次上传内容调用真实模型(ai_provider: anthropic / openai),
      按 InterviewReport schema 结构化输出。openai provider 兼容 DeepSeek 等任意
      OpenAI 协议端点(配 ai_base_url)。任何前置缺失(未配 key / SDK 不可用)或
      调用失败,都回退 mock,保证链路不中断。

    P1-06:无论 mock 还是 real,生成成功后都把报告按 sessionId 写入缓存(save_report),
    供 /overview 纯读返回,避免每次 GET 重新生成(real 模式下避免重复烧 LLM)。

    方案C:报告(成功或回退 mock)入缓存后把状态置 "ready",前端轮询到 ready 才跳 overview。
    回退 mock 也是一份有效报告,故同样置 ready(不阻塞演示)。

    session_id 由服务端权威生成并回填,不信任模型返回的该字段。

    P1-09:报告生成后,接着生成「深入分析」(同一次 analyze 的第二份产物),两份都入缓存后再置 ready。
    analysis 任一失败已在 _generate_analysis 内部回退 mock,不阻塞 ready。
    """
    report = _generate_report(session_id)
    _generate_analysis(session_id)
    mock_state.set_report_status(session_id, "ready")
    return report


def _generate_report(session_id: str) -> InterviewReport:
    """实际生成逻辑:mock / real / 回退三分支,各自 save_report 入缓存。"""
    if settings.ai_mode != "real":
        return mock_state.save_report(mock_state.build_mock_report(session_id))

    if not settings.ai_api_key:
        logger.warning("AI_MODE=real 但未配置 AI_API_KEY,回退 mock 报告(session=%s)", session_id)
        return mock_state.save_report(mock_state.build_mock_report(session_id))

    try:
        report = _real_interview_report(session_id)
        logger.info(
            "真实 LLM 面试报告生成成功(session=%s, provider=%s, model=%s)",
            session_id, settings.ai_provider, settings.ai_model,
        )
        return mock_state.save_report(report)
    except Exception as exc:  # noqa: BLE001 —— 任何失败都回退 mock,演示优先
        logger.warning("真实 LLM 报告生成失败,回退 mock(session=%s):%s", session_id, exc)
        return mock_state.save_report(mock_state.build_mock_report(session_id))


def get_analysis_status(session_id: str) -> str:
    """方案C:读报告生成状态(generating / ready / idle),转发 mock_state。"""
    return mock_state.get_report_status(session_id)


def _generate_analysis(session_id: str) -> InterviewAnalysis:
    """P1-09:深入分析生成 —— 对称 _generate_report 的 mock / real / 回退三分支,各自 save_analysis 入缓存。"""
    if settings.ai_mode != "real":
        return mock_state.save_analysis(session_id, mock_state.build_mock_analysis())

    if not settings.ai_api_key:
        logger.warning("AI_MODE=real 但未配置 AI_API_KEY,回退 mock 分析(session=%s)", session_id)
        return mock_state.save_analysis(session_id, mock_state.build_mock_analysis())

    try:
        analysis = _real_interview_analysis(session_id)
        logger.info(
            "真实 LLM 深入分析生成成功(session=%s, provider=%s, model=%s)",
            session_id, settings.ai_provider, settings.ai_model,
        )
        return mock_state.save_analysis(session_id, analysis)
    except Exception as exc:  # noqa: BLE001 —— 任何失败都回退 mock,演示优先
        logger.warning("真实 LLM 分析生成失败,回退 mock(session=%s):%s", session_id, exc)
        return mock_state.save_analysis(session_id, mock_state.build_mock_analysis())


def _real_interview_report(session_id: str) -> InterviewReport:
    """按 ai_provider 分发到具体 SDK。两条分支产出同一份 camelCase payload,
    再统一回填服务端权威字段(sessionId / title 兜底)并校验为 InterviewReport。

    SDK 均在各自分支内延迟导入:mock 模式下即使未安装也不受影响。
    """
    upload = mock_state.get_upload(session_id)

    if settings.ai_provider == "openai":
        payload = _openai_report_payload(upload)
    else:
        payload = _anthropic_report_payload(upload)

    # 服务端权威字段:sessionId 回填、title 用真实岗位名兜底,避免模型漏字段。
    payload["session_id"] = session_id
    payload.setdefault("title", f"{upload.job_title}一面")
    return InterviewReport.model_validate(payload)


def _anthropic_report_payload(upload) -> dict:
    """官方 Claude:Anthropic SDK,tool-use 强制按 schema 输出。"""
    import anthropic

    user_prompt = prompts.build_interview_user_prompt(
        job_title=upload.job_title, company=upload.company, jd=upload.jd, transcript=upload.transcript,
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
    return _extract_tool_input(response, "submit_interview_report")


def _openai_report_payload(upload) -> dict:
    """OpenAI 兼容端点(DeepSeek 等):用 JSON Output 模式产出结构化报告。

    DeepSeek V4 思考模型在 /v1 端点不支持强制 tool_choice(官方 issue #1376),
    故不用 function calling,改 response_format={"type":"json_object"} —— 思考模型完整支持,
    模型把 JSON 直接写进 message.content,再 json.loads 解析。
    base_url 来自 settings.ai_base_url(DeepSeek 填 https://api.deepseek.com)。
    """
    import json

    from openai import OpenAI

    user_prompt = prompts.build_interview_json_prompt(
        job_title=upload.job_title, company=upload.company, jd=upload.jd, transcript=upload.transcript,
    )
    client = OpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url or None)
    response = client.chat.completions.create(
        model=settings.ai_model,
        max_tokens=settings.ai_max_tokens,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": prompts.INTERVIEW_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = response.choices[0].message.content
    if not content or not content.strip():
        raise ValueError("模型返回空内容(JSON Output 模式偶发,可重试或调整 prompt)")
    return json.loads(content)


def _real_interview_analysis(session_id: str) -> InterviewAnalysis:
    """P1-09:按 ai_provider 分发产出深入分析。两条分支产出同一份 camelCase payload,校验为 InterviewAnalysis。

    analysis 无 session_id/title 这类服务端字段,payload 直接校验(比报告更简单)。
    SDK 均在各自分支内延迟导入:mock 模式下即使未安装也不受影响。
    """
    upload = mock_state.get_upload(session_id)

    if settings.ai_provider == "openai":
        payload = _openai_analysis_payload(upload)
    else:
        payload = _anthropic_analysis_payload(upload)

    return InterviewAnalysis.model_validate(payload)


def _anthropic_analysis_payload(upload) -> dict:
    """官方 Claude:Anthropic SDK,tool-use 强制按 schema 输出深入分析。"""
    import anthropic

    user_prompt = prompts.build_analysis_user_prompt(
        job_title=upload.job_title, company=upload.company, jd=upload.jd, transcript=upload.transcript,
    )
    client = anthropic.Anthropic(api_key=settings.ai_api_key)
    tool = {
        "name": "submit_interview_analysis",
        "description": "提交结构化的中文面试深入分析(逻辑/STAR/面试官/风险四维)",
        "input_schema": _interview_analysis_input_schema(),
    }
    response = client.messages.create(
        model=settings.ai_model,
        max_tokens=settings.ai_max_tokens,
        system=prompts.ANALYSIS_SYSTEM_PROMPT,
        tools=[tool],
        tool_choice={"type": "tool", "name": "submit_interview_analysis"},
        messages=[{"role": "user", "content": user_prompt}],
    )
    return _extract_tool_input(response, "submit_interview_analysis")


def _openai_analysis_payload(upload) -> dict:
    """OpenAI 兼容端点(DeepSeek 等):JSON Output 模式产出深入分析(同报告侧理由,思考模型不支持强制 tool_choice)。"""
    import json

    from openai import OpenAI

    user_prompt = prompts.build_analysis_json_prompt(
        job_title=upload.job_title, company=upload.company, jd=upload.jd, transcript=upload.transcript,
    )
    client = OpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url or None)
    response = client.chat.completions.create(
        model=settings.ai_model,
        max_tokens=settings.ai_max_tokens,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": prompts.ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = response.choices[0].message.content
    if not content or not content.strip():
        raise ValueError("模型返回空内容(JSON Output 模式偶发,可重试或调整 prompt)")
    return json.loads(content)


# 探索方向推荐结果体量较大(2-3 个方向 × 嵌套 portrait/weeklyTasks/abilitiesToBuild),
# 给一个更大的 max_tokens,避免默认 2000 截断导致 JSON 不完整。
_EXPLORE_MAX_TOKENS = 4000


def _real_followup(profile, history: list[FollowupTurn]) -> FollowupResponse:
    """AI 接入:按 ai_provider 分发产出「下一题或 done」。两条分支产出同一份 {question, done} payload,校验为 FollowupResponse。

    SDK 均在各自分支内延迟导入:mock 模式下即使未安装也不受影响。
    """
    if settings.ai_provider == "openai":
        payload = _openai_followup_payload(profile, history)
    else:
        payload = _anthropic_followup_payload(profile, history)

    # 模型给了问题就用问题(done 视为 False);否则按 done 结束。容错:question 缺失/为空 → done。
    q = payload.get("question")
    if q and q.get("question"):
        return FollowupResponse(question=FollowupQuestion.model_validate(q), done=False)
    return FollowupResponse(question=None, done=True)


def _anthropic_followup_payload(profile, history: list[FollowupTurn]) -> dict:
    """官方 Claude:Anthropic SDK,tool-use 强制按 schema 输出下一题或 done。"""
    import anthropic

    user_prompt = prompts.build_followup_user_prompt(profile, history)
    client = anthropic.Anthropic(api_key=settings.ai_api_key)
    tool = {
        "name": "submit_followup",
        "description": "基于画像与历史提交下一个追问;信息足够或已达上限则 done=true、question 留空",
        "input_schema": _followup_input_schema(),
    }
    response = client.messages.create(
        model=settings.ai_model,
        max_tokens=settings.ai_max_tokens,
        system=prompts.FOLLOWUP_SYSTEM_PROMPT,
        tools=[tool],
        tool_choice={"type": "tool", "name": "submit_followup"},
        messages=[{"role": "user", "content": user_prompt}],
    )
    return _extract_tool_input(response, "submit_followup")


def _openai_followup_payload(profile, history: list[FollowupTurn]) -> dict:
    """OpenAI 兼容端点(DeepSeek 等):JSON Output 模式产出下一题或 done。"""
    import json

    from openai import OpenAI

    user_prompt = prompts.build_followup_json_prompt(profile, history)
    client = OpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url or None)
    response = client.chat.completions.create(
        model=settings.ai_model,
        max_tokens=settings.ai_max_tokens,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": prompts.FOLLOWUP_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = response.choices[0].message.content
    if not content or not content.strip():
        raise ValueError("模型返回空内容(JSON Output 模式偶发,可重试或调整 prompt)")
    return json.loads(content)


def _real_explore_result(profile) -> ExploreResult:
    """AI 接入:按 ai_provider 分发产出方向推荐。两条分支产出同一份 camelCase payload,校验为 ExploreResult。

    ExploreResult 无服务端权威字段(不像报告有 session_id),payload 直接校验。
    SDK 均在各自分支内延迟导入:mock 模式下即使未安装也不受影响。
    """
    if settings.ai_provider == "openai":
        payload = _openai_explore_payload(profile)
    else:
        payload = _anthropic_explore_payload(profile)

    return ExploreResult.model_validate(payload)


def _anthropic_explore_payload(profile) -> dict:
    """官方 Claude:Anthropic SDK,tool-use 强制按 schema 输出方向推荐。"""
    import anthropic

    user_prompt = prompts.build_explore_user_prompt(profile)
    client = anthropic.Anthropic(api_key=settings.ai_api_key)
    tool = {
        "name": "submit_explore_result",
        "description": "提交结构化的中文职业方向推荐结果",
        "input_schema": _explore_result_input_schema(),
    }
    response = client.messages.create(
        model=settings.ai_model,
        max_tokens=_EXPLORE_MAX_TOKENS,
        system=prompts.EXPLORE_SYSTEM_PROMPT,
        tools=[tool],
        tool_choice={"type": "tool", "name": "submit_explore_result"},
        messages=[{"role": "user", "content": user_prompt}],
    )
    return _extract_tool_input(response, "submit_explore_result")


def _openai_explore_payload(profile) -> dict:
    """OpenAI 兼容端点(DeepSeek 等):JSON Output 模式产出方向推荐(理由同报告侧,思考模型不支持强制 tool_choice)。"""
    import json

    from openai import OpenAI

    user_prompt = prompts.build_explore_json_prompt(profile)
    client = OpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url or None)
    response = client.chat.completions.create(
        model=settings.ai_model,
        max_tokens=_EXPLORE_MAX_TOKENS,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": prompts.EXPLORE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = response.choices[0].message.content
    if not content or not content.strip():
        raise ValueError("模型返回空内容(JSON Output 模式偶发,可重试或调整 prompt)")
    return json.loads(content)


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


def _interview_analysis_input_schema() -> dict:
    """InterviewAnalysis 的 JSON Schema(camelCase,供 Claude tool-use 约束输出)。

    手写而非 model_json_schema(),保持 prompt 精简、字段含义清晰。logic/star 为 {title,status,description}
    对象数组(status 取值「较强/一般/偏弱」),interviewer 含 summary/hesitations/questions,risks 含三组字符串数组。
    """
    metric_item = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "status": {"type": "string", "description": "较强 / 一般 / 偏弱"},
            "description": {"type": "string"},
        },
        "required": ["title", "status", "description"],
    }
    return {
        "type": "object",
        "properties": {
            "logic": {"type": "array", "items": metric_item, "description": "回答逻辑 2-4 个维度"},
            "star": {"type": "array", "items": metric_item, "description": "STAR 四项:Situation/Task/Action/Result"},
            "interviewer": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "hesitations": {"type": "array", "items": {"type": "string"}},
                    "questions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "question": {"type": "string"},
                                "intent": {"type": "string"},
                                "answer": {"type": "string"},
                            },
                            "required": ["question", "intent", "answer"],
                        },
                    },
                },
                "required": ["summary", "hesitations", "questions"],
            },
            "risks": {
                "type": "object",
                "properties": {
                    "risks": {"type": "array", "items": {"type": "string"}},
                    "positives": {"type": "array", "items": {"type": "string"}},
                    "negatives": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["risks", "positives", "negatives"],
            },
        },
        "required": ["logic", "star", "interviewer", "risks"],
    }


def _followup_input_schema() -> dict:
    """单题追问的 JSON Schema(camelCase,供 Claude tool-use 约束输出)。

    {reply: 承接语(可空), question: {id, question} | 省略, done: bool}。
    信息足够或达上限时 done=true 且不给 question。reply 为对用户上一句的简短承接。
    """
    return {
        "type": "object",
        "properties": {
            "reply": {"type": "string", "description": "对用户上一句的一句话承接,不超过 30 个中文字符;首轮可为空串"},
            "question": {
                "type": "object",
                "description": "下一个追问;若 done=true 可省略",
                "properties": {
                    "id": {"type": "string", "description": "短横线英文 id,如 work-proof"},
                    "question": {"type": "string", "description": "追问文本,不超过 40 个中文字符"},
                },
                "required": ["id", "question"],
            },
            "done": {"type": "boolean", "description": "信息已足够或已达上限则为 true(此时不给 question)"},
        },
        "required": ["done"],
    }


def _explore_result_input_schema() -> dict:
    """ExploreResult 的 JSON Schema(camelCase,供 Claude tool-use 约束输出)。

    手写而非 model_json_schema():保持 prompt 精简、字段含义清晰。嵌套 directions(含 portrait /
    whyFirst / abilitiesToBuild / weeklyTasks)+ transferableAbilities + notRecommended,对齐 schemas/explore.py。
    """
    str_array = {"type": "array", "items": {"type": "string"}}
    direction_item = {
        "type": "object",
        "properties": {
            "id": {"type": "string", "description": "短横线英文 id,如 ai-pm"},
            "title": {"type": "string", "description": "中文方向名"},
            "match": {"type": "string", "enum": ["高", "较高", "可尝试"]},
            "reason": {"type": "string"},
            "portrait": {
                "type": "object",
                "properties": {
                    "dailyWork": str_array,
                    "challenges": str_array,
                    "abilities": str_array,
                    "path": {"type": "string", "description": "发展路径一句话"},
                },
                "required": ["dailyWork", "challenges", "abilities", "path"],
            },
            "whyFirst": {"type": "array", "items": {"type": "string"}, "description": "为何先试 2-3 条"},
            "abilitiesToBuild": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"title": {"type": "string"}, "description": {"type": "string"}},
                    "required": ["title", "description"],
                },
            },
            "weeklyTasks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "短横线英文 id"},
                        "title": {"type": "string"},
                        "status": {"type": "string", "enum": ["未开始", "进行中", "已完成"]},
                    },
                    "required": ["id", "title", "status"],
                },
            },
        },
        "required": ["id", "title", "match", "reason", "portrait", "whyFirst", "abilitiesToBuild", "weeklyTasks"],
    }
    return {
        "type": "object",
        "properties": {
            "conclusion": {"type": "string", "description": "一句话核心结论"},
            "directions": {"type": "array", "items": direction_item, "description": "2-3 个推荐方向,匹配度从高到低"},
            "transferableAbilities": {"type": "array", "items": {"type": "string"}, "description": "3-5 个可迁移能力(简短词组)"},
            "notRecommended": {
                "type": "array",
                "description": "1-2 个当前不建议优先的方向",
                "items": {
                    "type": "object",
                    "properties": {"title": {"type": "string"}, "reason": {"type": "string"}},
                    "required": ["title", "reason"],
                },
            },
        },
        "required": ["conclusion", "directions", "transferableAbilities", "notRecommended"],
    }


def get_interview_report(session_id: str) -> InterviewReport:
    """P1-06:读取报告(纯读,不生成)—— 命中缓存直接返回,未命中回退 mock。

    /overview 走这里:绝不触发 real LLM,避免每次刷新重复生成。
    """
    return mock_state.get_report(session_id)


def generate_interview_analysis(session_id: str) -> InterviewAnalysis:
    """P1-09:读取深入分析(纯读,不生成)—— 命中缓存直接返回,未命中回退 mock。

    /analysis 走这里:绝不触发 real LLM(生成已挪到 run_analysis 后台任务里),对齐 get_interview_report。
    """
    return mock_state.get_analysis(session_id)
