from datetime import datetime, timezone

from sqlmodel import Session, select

from app.db.database import engine
from app.db.models import (
    DEV_USER_ID,
    CurrentPathRow,
    ExploreProfileRecord,
    ExploreResultRow,
    InterviewSessionRow,
    ReportRow,
    TrainingTaskStatusRow,
)
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

# 探索链路做实:CURRENT_PATH / LATEST_PROFILE 全局已删 —— 画像 / 结果 / 路径改落 SQLite
# (ExploreProfileRecord / ExploreResultRow / CurrentPathRow,按 user_id 单行 upsert)。
# LATEST_UPLOAD 仍保留:面试链路 get_upload 的「未知 session 兜底实例」。
LATEST_UPLOAD = InterviewUpload()

# P1-08:面试链路(上传 / 报告 / 状态)从进程内 dict 改为本地 SQLite 落库,跨重启存活。
# 表:interview_sessions(InterviewSessionRow)、interview_reports(ReportRow,status +
# report_json 整列存)。原 SESSIONS / _SESSION_COUNTER / REPORTS / REPORT_STATUS 已移除。
# LATEST_UPLOAD 仍作为「未命中兜底实例」(未知 session 取上传内容时返回它,保不崩)。
#
# sessionId 仍是 "session-N":N 从 DB 现有最大数字后缀回灌(进程启动时算一次),
# 跨重启不撞号。explore 链路、TRAINING_TASKS 仍在内存(不在 P1-08 范围)。
_SESSION_COUNTER = 0


def _seed_session_counter() -> None:
    """从 DB 已有 session-N 行回灌计数器,使新 session 不与历史撞号(跨重启)。

    幂等:进程启动(init_db 后)调一次即可;表为空时计数器保持 0。
    """
    global _SESSION_COUNTER
    max_n = 0
    with Session(engine) as session:
        rows = session.exec(select(InterviewSessionRow.session_id)).all()
    for sid in rows:
        if sid.startswith("session-"):
            suffix = sid.removeprefix("session-")
            if suffix.isdigit():
                max_n = max(max_n, int(suffix))
    _SESSION_COUNTER = max_n


def get_followups(_: ExploreProfile) -> list[FollowupQuestion]:
    return [
        FollowupQuestion(id="f1", question="你刚刚提到自己做过产品设计、数据分析和协调沟通。在这些经历里，哪一类事情最让你有成就感？"),
        FollowupQuestion(id="f2", question="如果要从基础岗位开始，你更能接受偏分析、偏沟通，还是偏执行推进的岗位？"),
        FollowupQuestion(id="f3", question="你最担心新方向里的哪类困难？"),
    ]


# ---------------------------------------------------------------------------
# 探索链路做实:画像 / 结果 / 路径从进程内全局改为本地 SQLite 落库(按 user_id 单行 upsert)。
# 范式照面试侧 P1-08:save_*(model_dump_json → upsert)、get_*(命中→validate_json,未命中→回退 mock)。
# 默认单用户(dev-user),非并发(与 P0 设计一致)。
# ---------------------------------------------------------------------------


def save_explore_profile(profile: ExploreProfile, user_id: str = DEV_USER_ID) -> ExploreProfile:
    """提交画像 → 落 ExploreProfileRecord(按 user_id upsert)。schema(camelCase)↔record(snake_case)字段映射。"""
    with Session(engine) as session:
        row = session.exec(select(ExploreProfileRecord).where(ExploreProfileRecord.user_id == user_id)).first()
        if row is None:
            row = ExploreProfileRecord(user_id=user_id)
        row.stage = profile.stage
        row.education = profile.education
        row.major = profile.major
        row.goal = profile.goal
        row.constraints = profile.constraints
        row.interests = profile.interests
        row.work_preferences = profile.work_preferences
        row.experiences = profile.experiences
        row.work_types = profile.work_types
        row.preferred_states = profile.preferred_states
        row.followups = profile.followups
        row.updated_at = datetime.now(timezone.utc)
        session.add(row)
        session.commit()
    return profile


def get_explore_profile(user_id: str = DEV_USER_ID) -> ExploreProfile:
    """读已提交画像 —— 命中 record 还原为 ExploreProfile,未命中回退默认 ExploreProfile()。"""
    with Session(engine) as session:
        row = session.exec(select(ExploreProfileRecord).where(ExploreProfileRecord.user_id == user_id)).first()
    if row is None:
        return ExploreProfile()
    return ExploreProfile(
        stage=row.stage,
        education=row.education,
        major=row.major,
        goal=row.goal,
        constraints=row.constraints,
        interests=row.interests,
        work_preferences=row.work_preferences,
        experiences=row.experiences,
        work_types=row.work_types,
        preferred_states=row.preferred_states,
        followups=row.followups,
    )


def build_mock_explore_result() -> ExploreResult:
    # 探索链路做实:固定构造一份 mock 方向推荐结果(纯构造,不读/写缓存),供 mock 分支与回退使用。
    # 原 get_explore_result() 的固定构造逻辑改名至此;get_explore_result 改为按 user_id 读缓存(未命中回退此函数)。
    return ExploreResult(
        conclusion="你更适合兼顾逻辑分析与沟通协作的岗位，而不是高度封闭、纯技术导向的方向。",
        directions=DIRECTIONS,
        transferable_abilities=["结构化表达", "沟通协作", "项目推进", "数据理解", "创意策划"],
        not_recommended=[
            {"title": "纯算法研发", "reason": "该方向通常要求更强的数学、编程和长期技术积累，与你当前的经历与兴趣匹配度较低。"},
            {"title": "高度重复型执行岗位", "reason": "你更适合有一定分析、表达或推动空间的岗位，而不是长期纯重复执行工作。"},
        ],
    )


def save_explore_result(result: ExploreResult, user_id: str = DEV_USER_ID) -> ExploreResult:
    """已生成的方向推荐结果按 user_id 落库(upsert ExploreResultRow.result_json,整列 JSON)。"""
    payload = result.model_dump_json()
    with Session(engine) as session:
        row = session.get(ExploreResultRow, user_id)
        if row is None:
            row = ExploreResultRow(user_id=user_id, result_json=payload)
        else:
            row.result_json = payload
        session.add(row)
        session.commit()
    return result


def get_explore_result(user_id: str = DEV_USER_ID) -> ExploreResult:
    """读方向推荐结果(get-or-create)—— 命中缓存直接返回(刷新不重构造);未命中构造 mock 并入缓存。

    /generate-result 走这里:对齐报告侧「生成成功即入缓存」+「纯读命中不重构造」语义。
    本任务纯 mock(不调 LLM),故 build + save 即等价于生成;real 版留后续。
    """
    with Session(engine) as session:
        row = session.get(ExploreResultRow, user_id)
        if row is not None and row.result_json:
            return ExploreResult.model_validate_json(row.result_json)
    return save_explore_result(build_mock_explore_result(), user_id)


def save_path(direction_id: str, user_id: str = DEV_USER_ID) -> CurrentPathResponse:
    """保存学习路径 —— 按 direction_id 取方向 + 其 weekly_tasks 快照,落 CurrentPathRow(整列 JSON)。"""
    direction = next((item for item in DIRECTIONS if item.id == direction_id), DIRECTIONS[0])
    path = CurrentPathResponse(direction=direction, tasks=[task.model_copy() for task in direction.weekly_tasks])
    with Session(engine) as session:
        row = session.get(CurrentPathRow, user_id)
        if row is None:
            row = CurrentPathRow(user_id=user_id, path_json=path.model_dump_json())
        else:
            row.path_json = path.model_dump_json()
        session.add(row)
        session.commit()
    return path


def get_current_path(user_id: str = DEV_USER_ID) -> CurrentPathResponse:
    """读已保存路径快照 —— 命中(有 path_json)还原,未命中回退空 CurrentPathResponse()。纯读,不落库。"""
    with Session(engine) as session:
        row = session.get(CurrentPathRow, user_id)
    if row is not None and row.path_json:
        return CurrentPathResponse.model_validate_json(row.path_json)
    return CurrentPathResponse()


def upload_interview(upload: InterviewUpload) -> str:
    """P1-04/08:为每次上传生成唯一 sessionId 并落库,返回该 sessionId。"""
    global LATEST_UPLOAD, _SESSION_COUNTER
    _SESSION_COUNTER += 1
    session_id = f"session-{_SESSION_COUNTER}"
    with Session(engine) as session:
        session.add(
            InterviewSessionRow(
                session_id=session_id,
                file_name=upload.file_name,
                job_title=upload.job_title,
                company=upload.company,
                jd=upload.jd,
                transcript=upload.transcript,
            )
        )
        session.commit()
    LATEST_UPLOAD = upload
    return session_id


def get_upload(session_id: str = "mock-session") -> InterviewUpload:
    """P1-08:按 sessionId 取回上传内容(从 DB)。未命中返回兜底实例,保「未知 session 不崩」。

    替代原 SESSIONS.get(sid, LATEST_UPLOAD):default session(mock-session)从未落库,
    会走兜底 InterviewUpload() —— 与原 SESSIONS 初值({"mock-session": LATEST_UPLOAD})等价。
    """
    with Session(engine) as session:
        row = session.get(InterviewSessionRow, session_id)
    if row is None:
        return LATEST_UPLOAD
    return InterviewUpload(
        file_name=row.file_name,
        job_title=row.job_title,
        company=row.company,
        jd=row.jd,
        transcript=row.transcript,
    )


def build_mock_report(session_id: str = "mock-session") -> InterviewReport:
    # P1-04/06/08:按 sessionId 取回该次上传(从 DB),把岗位/公司回填进报告标题;未知 session 回退默认。
    # 这是「构造」一份 mock 报告(不读/写缓存),供 ai_service 的 mock 分支与回退使用。
    upload = get_upload(session_id)
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
    """P1-06/08:把已生成的报告按 sessionId 落库(upsert)。/analyze 生成成功后调用。

    写 report_json(整列 JSON)并置 status="ready" —— 有报告即就绪,对齐旧「缓存命中→ready」语义。
    行已存在(/analyze 先建过 generating 行)则更新,否则新建。
    """
    payload = report.model_dump_json()
    with Session(engine) as session:
        row = session.get(ReportRow, report.session_id)
        if row is None:
            row = ReportRow(session_id=report.session_id, status="ready", report_json=payload)
        else:
            row.status = "ready"
            row.report_json = payload
        session.add(row)
        session.commit()
    return report


def get_report(session_id: str = "mock-session") -> InterviewReport:
    """P1-06/08:读取已生成的报告 —— 命中 DB(有 report_json)直接返回,未命中回退构造 mock。

    /overview 走这里:纯读操作,绝不触发 real LLM,也不落库,避免每次刷新重复生成/烧钱。
    """
    with Session(engine) as session:
        row = session.get(ReportRow, session_id)
    if row is not None and row.report_json:
        return InterviewReport.model_validate_json(row.report_json)
    return build_mock_report(session_id)


def set_report_status(session_id: str, status: str) -> None:
    """方案C/P1-08:写报告生成状态(upsert ReportRow.status)。

    /analyze 触发后台前置 "generating"(新建行,report_json 暂空),后台跑完 save_report 置 "ready"。
    """
    with Session(engine) as session:
        row = session.get(ReportRow, session_id)
        if row is None:
            row = ReportRow(session_id=session_id, status=status)
        else:
            row.status = status
        session.add(row)
        session.commit()


def get_report_status(session_id: str = "mock-session") -> str:
    """方案C/P1-08:读报告生成状态(从 DB)。

    无 ReportRow 记录时返回 "idle"(从未触发 analyze);有行但仅显式状态为准。
    若行有 report_json 而 status 异常缺失,视为 "ready"(对齐旧「有报告即就绪」语义)。
    前端据此判断是否继续轮询。
    """
    with Session(engine) as session:
        row = session.get(ReportRow, session_id)
    if row is None:
        return "idle"
    if row.status:
        return row.status
    return "ready" if row.report_json else "idle"


def build_mock_analysis() -> InterviewAnalysis:
    # P1-09:构造一份固定的 mock 深入分析(纯构造,不读/写缓存),供 ai_service 的 mock 分支与回退使用。
    # 原 get_analysis() 的固定构造逻辑改名至此;get_analysis 改为按 session 读缓存(未命中回退此函数)。
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


def save_analysis(session_id: str, analysis: InterviewAnalysis) -> InterviewAnalysis:
    """P1-09:把已生成的深入分析按 sessionId 落库(写 ReportRow.analysis_json)。

    与 save_report 对称、复用同一 ReportRow:行已存在(/analyze 先建过 generating 行或已存报告)
    则补 analysis_json,否则新建。不动 status / report_json —— analysis 与 report 同生命周期,
    status 由报告侧/run_analysis 末尾统一置 ready。
    """
    payload = analysis.model_dump_json()
    with Session(engine) as session:
        row = session.get(ReportRow, session_id)
        if row is None:
            row = ReportRow(session_id=session_id, analysis_json=payload)
        else:
            row.analysis_json = payload
        session.add(row)
        session.commit()
    return analysis


def get_analysis(session_id: str = "mock-session") -> InterviewAnalysis:
    """P1-09:读取深入分析 —— 命中 DB(有 analysis_json)直接返回,未命中回退构造 mock。

    /analysis 走这里(经 ai_service.generate_interview_analysis 转发):纯读操作,绝不触发 real LLM,
    也不落库,避免每次刷新重复生成/烧钱。对齐 get_report 的纯读语义。
    """
    with Session(engine) as session:
        row = session.get(ReportRow, session_id)
    if row is not None and row.analysis_json:
        return InterviewAnalysis.model_validate_json(row.analysis_json)
    return build_mock_analysis()


def _apply_task_status(session_id: str, tasks: list[TrainingTask]) -> list[TrainingTask]:
    """P1-07:把该 session 持久化的任务状态叠加到报告任务清单上。

    任务清单(id/title/description)来自报告 priority_tasks(只读);状态来自
    training_task_status 表。命中表则用表里的 status,未命中保留报告里的初始 status。
    """
    with Session(engine) as session:
        rows = session.exec(select(TrainingTaskStatusRow).where(TrainingTaskStatusRow.session_id == session_id)).all()
    overrides = {row.task_id: row.status for row in rows}
    return [task.model_copy(update={"status": overrides[task.id]}) if task.id in overrides else task for task in tasks]


def get_training_tasks(session_id: str = "mock-session") -> list[TrainingTask]:
    """P1-07:返回该 session 的训练任务(清单取自报告 priority_tasks,状态叠加持久化值)。

    /training/{session_id} 走这里。未 analyze 的 session 会回退 mock 报告,priorityTasks
    是 mock 三任务 —— 仍能返回、状态也能叠加(即便 mock 报告也能记状态,行为合理)。
    """
    tasks = get_report(session_id).priority_tasks
    return _apply_task_status(session_id, tasks)


def update_training_task(session_id: str, task_id: str, status: str) -> TrainingTask | None:
    """P1-07:更新某 session 下单个训练任务的状态并落库(upsert)。

    任务必须存在于该 session 报告的 priority_tasks 里(否则返回 None → 路由转 404)。
    状态写进 training_task_status(复合主键 session+task),跨 session 隔离、跨重启存活。
    """
    tasks = get_report(session_id).priority_tasks
    target = next((task for task in tasks if task.id == task_id), None)
    if target is None:
        return None
    with Session(engine) as session:
        row = session.get(TrainingTaskStatusRow, (session_id, task_id))
        if row is None:
            row = TrainingTaskStatusRow(session_id=session_id, task_id=task_id, status=status)
        else:
            row.status = status
        session.add(row)
        session.commit()
    return target.model_copy(update={"status": status})
