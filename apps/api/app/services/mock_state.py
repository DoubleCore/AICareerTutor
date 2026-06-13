from app.schemas.explore import CurrentPathResponse, DirectionRecommendation, ExploreProfile, ExploreResult, ExploreTask, FollowupQuestion, JobPortrait
from app.schemas.interview import InterviewAnalysis, InterviewReport, InterviewUpload, TrainingTask


def _tasks(prefix: str = "") -> list[ExploreTask]:
    return [
        ExploreTask(id=f"{prefix}read-jd", title="阅读 3 个该方向岗位 JD"),
        ExploreTask(id=f"{prefix}read-stories", title="看 2 篇相关从业者经验分享"),
        ExploreTask(id=f"{prefix}map-experience", title="梳理 1 段最贴近该方向的经历"),
        ExploreTask(id=f"{prefix}intro-draft", title="写 1 版针对该方向的自我介绍草稿"),
    ]


DIRECTIONS = [
    DirectionRecommendation(
        id="ai-pm",
        title="AI产品经理",
        match="高",
        reason="你的沟通表达、结构化思考和推进落地倾向，与该方向较匹配。",
        portrait=JobPortrait(
            daily_work=["需求分析", "跨团队协作", "产品方案设计", "推动项目落地"],
            challenges=["技术理解门槛高", "需要平衡业务与技术需求"],
            abilities=["沟通表达", "逻辑分析", "产品思维", "推动力"],
            path="产品助理 -> 产品经理 -> AI产品经理 / 解决方案产品经理",
        ),
        why_first=["同时需要逻辑分析和沟通协作，和你的优势更贴近", "进入门槛相对可控，适合先低成本验证", "已有经历和能力可以迁移到这个方向"],
        abilities_to_build=[
            {"title": "结构化表达", "description": "帮助你更清楚地介绍自己和经历"},
            {"title": "项目经历梳理", "description": "帮助你判断自己与这个方向的匹配度"},
            {"title": "需求理解 / 问题拆解", "description": "帮助你更快理解岗位核心工作"},
        ],
        weekly_tasks=_tasks(),
    ),
    DirectionRecommendation(
        id="data-analyst",
        title="数据分析师",
        match="较高",
        reason="你具备数据理解和逻辑分析倾向，适合先从分析型岗位切入。",
        portrait=JobPortrait(daily_work=["指标拆解", "数据清洗", "业务分析"], challenges=["需要补足工具能力"], abilities=["数据理解", "逻辑分析", "报告表达"], path="数据助理 -> 数据分析师 -> 业务分析"),
        why_first=["能把你的逻辑兴趣转成可见作品", "岗位样本多，适合快速验证"],
        abilities_to_build=[{"title": "Excel / SQL 基础", "description": "先能完成基础数据处理"}],
        weekly_tasks=_tasks("da-"),
    ),
    DirectionRecommendation(
        id="ops-strategy",
        title="运营策略",
        match="可尝试",
        reason="你在沟通协作和执行推进方面有优势，适合在业务场景中快速积累经验。",
        portrait=JobPortrait(daily_work=["活动策划", "用户分析", "策略复盘"], challenges=["节奏较快"], abilities=["沟通协作", "执行推进", "内容策划"], path="运营专员 -> 策略运营 -> 业务负责人"),
        why_first=["能快速接触真实业务", "能发挥沟通和推进优势"],
        abilities_to_build=[{"title": "业务复盘", "description": "知道一个动作为什么有效或无效"}],
        weekly_tasks=_tasks("ops-"),
    ),
]

TRAINING_TASKS = [
    TrainingTask(id="quantify-result", title="补齐项目结果量化", description="把核心项目中的结果改成可验证、可量化的表达", status="未开始"),
    TrainingTask(id="star-structure", title="统一 STAR 回答结构", description="让回答更聚焦，减少背景过长和重点后置", status="进行中"),
    TrainingTask(id="keywords", title="强化岗位关键词表达", description="让面试官更快感受到你的岗位匹配度", status="已完成"),
]

CURRENT_PATH = CurrentPathResponse()
LATEST_UPLOAD = InterviewUpload()

# P1-04:按 sessionId 真实存储每次上传内容(进程内内存,重启即清空,非并发安全 —— P0 有意设计)。
# 历史默认 session 仍可用,保证 profile.py 无参取报告、未知 session 不崩。
SESSIONS: dict[str, InterviewUpload] = {"mock-session": LATEST_UPLOAD}
_SESSION_COUNTER = 0

# P1-06:按 sessionId 缓存「已生成」的报告。/analyze 生成后写入,/overview 读取,
# 避免每次 GET 重新拼装(real 模式下更是避免重复烧 LLM)。进程内内存,重启即清空。
REPORTS: dict[str, InterviewReport] = {}


def get_followups(_: ExploreProfile) -> list[FollowupQuestion]:
    return [
        FollowupQuestion(id="f1", question="你刚刚提到自己做过产品设计、数据分析和协调沟通。在这些经历里，哪一类事情最让你有成就感？"),
        FollowupQuestion(id="f2", question="如果要从基础岗位开始，你更能接受偏分析、偏沟通，还是偏执行推进的岗位？"),
        FollowupQuestion(id="f3", question="你最担心新方向里的哪类困难？"),
    ]


def get_explore_result() -> ExploreResult:
    return ExploreResult(
        conclusion="你更适合兼顾逻辑分析与沟通协作的岗位，而不是高度封闭、纯技术导向的方向。",
        directions=DIRECTIONS,
        transferable_abilities=["结构化表达", "沟通协作", "项目推进", "数据理解", "创意策划"],
        not_recommended=[
            {"title": "纯算法研发", "reason": "该方向通常要求更强的数学、编程和长期技术积累，与你当前的经历与兴趣匹配度较低。"},
            {"title": "高度重复型执行岗位", "reason": "你更适合有一定分析、表达或推动空间的岗位，而不是长期纯重复执行工作。"},
        ],
    )


def save_path(direction_id: str) -> CurrentPathResponse:
    global CURRENT_PATH
    direction = next((item for item in DIRECTIONS if item.id == direction_id), DIRECTIONS[0])
    CURRENT_PATH = CurrentPathResponse(direction=direction, tasks=[task.model_copy() for task in direction.weekly_tasks])
    return CURRENT_PATH


def upload_interview(upload: InterviewUpload) -> str:
    """P1-04:为每次上传生成唯一 sessionId 并存内容,返回该 sessionId(不再硬编码)。"""
    global LATEST_UPLOAD, _SESSION_COUNTER
    _SESSION_COUNTER += 1
    session_id = f"session-{_SESSION_COUNTER}"
    SESSIONS[session_id] = upload
    LATEST_UPLOAD = upload
    return session_id


def build_mock_report(session_id: str = "mock-session") -> InterviewReport:
    # P1-04/06:按 sessionId 取回该次上传,把岗位/公司回填进报告标题;未知 session 回退默认上传内容。
    # 这是「构造」一份 mock 报告(不读缓存),供 ai_service 的 mock 分支与回退使用。
    upload = SESSIONS.get(session_id, LATEST_UPLOAD)
    return InterviewReport(
        session_id=session_id,
        title=f"{upload.job_title}一面",
        overall="整体表现：中等偏上",
        conclusion="你这次最主要的问题不是没有内容，而是没有把个人贡献和结果价值说清楚。",
        pass_possibility=62,
        pass_level="中",
        core_problems=["项目贡献表达不够明确", "回答里结果量化不足", "STAR 结构里 Action 和 Result 部分偏弱"],
        interviewer_view={"impression": "有一定经历基础，但录用信心不足。", "positives": ["有真实项目经历", "方向理解基本在线"], "concerns": ["个人贡献不够清楚", "结果证据不足", "回答有时偏散"]},
        priority_tasks=TRAINING_TASKS,
    )


def save_report(report: InterviewReport) -> InterviewReport:
    """P1-06:把已生成的报告按 sessionId 写入缓存。/analyze 生成成功后调用。"""
    REPORTS[report.session_id] = report
    return report


def get_report(session_id: str = "mock-session") -> InterviewReport:
    """P1-06:读取已生成的报告 —— 命中缓存直接返回,未命中回退构造一份 mock 报告。

    /overview 走这里:是纯读操作,绝不触发 real LLM,避免每次刷新重复生成/烧钱。
    """
    cached = REPORTS.get(session_id)
    if cached is not None:
        return cached
    return build_mock_report(session_id)


def get_analysis() -> InterviewAnalysis:
    return InterviewAnalysis(
        logic=[
            {"title": "回答主线", "status": "一般", "description": "回答有内容，但关键信息出现偏后，面试官需要自己提炼重点。"},
            {"title": "个人贡献表达", "status": "偏弱", "description": "更多在讲项目背景和团队动作，个人角色不够突出。"},
            {"title": "结果支撑", "status": "偏弱", "description": "回答中缺少量化结果，导致说服力不足。"},
        ],
        star=[
            {"title": "Situation", "status": "较强", "description": "你能说明项目背景，但篇幅略长。"},
            {"title": "Task", "status": "一般", "description": "任务目标有提到，但不够聚焦。"},
            {"title": "Action", "status": "偏弱", "description": "行动细节不足，个人做了什么没有充分展开。"},
            {"title": "Result", "status": "偏弱", "description": "缺少结果量化和业务影响说明。"},
        ],
        interviewer={
            "summary": "有一定经历基础，但个人贡献和结果证据不足，录用信心仍不稳定。",
            "hesitations": ["个人 ownership 不够清楚", "结果证据不足", "回答有时偏散"],
            "questions": [{"question": "你在这个项目里具体负责什么？", "intent": "确认你的个人 ownership", "answer": "更多在讲项目整体，个人贡献不够集中"}],
        },
        risks={"risks": ["项目贡献不清", "结果量化不足", "回答偏散"], "positives": ["有真实项目经历"], "negatives": ["STAR 结构不稳定"]},
    )


def update_training_task(task_id: str, status: str) -> TrainingTask | None:
    for task in TRAINING_TASKS:
        if task.id == task_id:
            task.status = status  # type: ignore[assignment]
            return task
    return None
