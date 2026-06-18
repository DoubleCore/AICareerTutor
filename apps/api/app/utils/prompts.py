# AI 接入:职业方向探索的真实 system prompt。要求模型扮演职业探索教练,
# 基于用户画像(基础信息 + 兴趣偏好 + 经历 + 现实约束 + 追问回答)产出结构化方向推荐结果。
# 所有面向用户的文案必须是简体中文。
EXPLORE_SYSTEM_PROMPT = (
    "你是一位资深的职业探索教练,擅长帮助求职者(尤其应届生、转行者)找到适合自己的职业方向。"
    "用户会提供一份自我画像(当前阶段、学历、专业、兴趣、工作偏好、探索目标、现实约束、经历、做过的事、偏好状态、追问回答)。"
    "请基于这些内容,给出一份客观、可执行的中文方向推荐结果,通过工具调用返回结构化结果。\n"
    "要求:\n"
    "1. 所有文案使用简体中文,语气温和、具体、鼓励但不浮夸,紧扣用户画像、不编造画像里没有的信息。\n"
    "2. conclusion:一句话核心结论,概括用户更适合哪类岗位。\n"
    "3. directions:推荐 2-3 个方向,按匹配度从高到低排列。每个方向含:\n"
    "   - id:短横线英文 id(如 ai-pm / data-analyst);title:中文方向名;match 取 高/较高/可尝试 之一;\n"
    "   - reason:为何匹配(结合画像);portrait:岗位画像(dailyWork 日常工作、challenges 常见挑战、abilities 所需能力 各 2-4 条,path 发展路径一句话);\n"
    "   - whyFirst:为何建议先试这个方向 2-3 条;abilitiesToBuild:建议先补的能力 2-3 项,每项含 title + description;\n"
    "   - weeklyTasks:本周可执行探索任务 3-4 个,每个含短横线英文 id、title,status 一律设为 \"未开始\"。\n"
    "4. transferableAbilities:用户当前更明显的可迁移能力 3-5 个(简短词组)。\n"
    "5. notRecommended:当前不建议优先尝试的方向 1-2 个,每个含 title + reason(说明为何匹配度低)。"
)


def build_explore_user_prompt(profile) -> str:
    """AI 接入:把 ExploreProfile 各字段拼成给模型的用户输入(anthropic 分支用)。

    profile 为 ExploreProfile(snake_case 内部表示);list 字段用顿号连接,空则标「未填写」。
    """
    return (
        f"当前阶段:{profile.stage or '未填写'}\n"
        f"学历状态:{profile.education or '未填写'}\n"
        f"专业背景:{profile.major or '未填写'}\n"
        f"兴趣偏好:{_join(profile.interests)}\n"
        f"工作偏好:{_join(profile.work_preferences)}\n"
        f"探索目标:{profile.goal or '未填写'}\n"
        f"现实约束:{_join(profile.constraints)}\n"
        f"经历类型:{_join(profile.experiences)}\n"
        f"做过的事:{_join(profile.work_types)}\n"
        f"偏好的工作状态:{_join(profile.preferred_states)}\n"
        f"补充追问回答:{_join(profile.followups)}\n\n"
        "请据此生成结构化的职业方向推荐结果。"
    )


def _join(value) -> str:
    """list[str] → 顿号拼接;空列表/None → 「未填写」。供探索/追问 prompt 复用。"""
    if not value:
        return "未填写"
    if isinstance(value, str):
        return value
    items = [str(item) for item in value if item]
    return "、".join(items) if items else "未填写"

# P1-05:面试复盘报告的真实 system prompt。要求模型扮演资深面试官 + 职业教练,
# 基于上传的岗位信息与面试转写,产出结构化复盘报告。所有面向用户的文案必须是中文。
INTERVIEW_SYSTEM_PROMPT = (
    "你是一位资深的技术/产品面试官,同时也是职业教练。"
    "用户会提供岗位信息(岗位名称、公司、JD)和一段面试转写文本。"
    "请基于这些内容,给出一份客观、可执行的中文面试复盘报告,通过工具调用返回结构化结果。\n"
    "要求:\n"
    "1. 所有文案使用简体中文,语气专业、具体、对事不对人。\n"
    "2. passPossibility 为 0-100 的整数,passLevel 取 低/中/高 之一,需与 passPossibility 大致一致。\n"
    "3. coreProblems 给出 2-4 条本次面试最核心的问题。\n"
    "4. interviewerView.impression 一句话整体印象;positives 加分点、concerns 犹豫点各 2-4 条。\n"
    "5. priorityTasks 给出 2-3 个可执行训练任务,status 一律设为 \"未开始\"。\n"
    "6. 紧扣用户提供的真实内容,不要编造转写里没有的事实。"
)


def build_interview_user_prompt(job_title: str, company: str, jd: str, transcript: str) -> str:
    """P1-05:把本次上传内容拼成给模型的用户输入。"""
    return (
        f"岗位名称:{job_title}\n"
        f"公司:{company}\n"
        f"岗位 JD:{jd}\n\n"
        f"面试转写文本:\n{transcript}\n\n"
        "请据此生成结构化的面试复盘报告。"
    )


# DeepSeek V4 等思考模型在 OpenAI /v1 端点不支持强制 tool_choice(官方 issue #1376),
# 故 openai provider 改用 JSON Output 模式:response_format={"type":"json_object"}。
# 该模式要求 prompt 中出现 "json" 字样并给出期望的 JSON 结构示例,模型直接把 JSON 写进 content。
_INTERVIEW_JSON_EXAMPLE = """{
  "title": "AI产品经理一面",
  "overall": "整体表现：中等偏上",
  "conclusion": "核心结论,2-3 句。",
  "passPossibility": 62,
  "passLevel": "中",
  "coreProblems": ["核心问题1", "核心问题2"],
  "interviewerView": {
    "impression": "一句话整体印象",
    "positives": ["加分点1", "加分点2"],
    "concerns": ["犹豫点1", "犹豫点2"]
  },
  "priorityTasks": [
    {"id": "quantify-result", "title": "任务标题", "description": "任务说明", "status": "未开始"}
  ]
}"""


def build_interview_json_prompt(job_title: str, company: str, jd: str, transcript: str) -> str:
    """openai provider(JSON Output 模式)专用:在基础输入后追加 JSON 格式约束 + 示例。

    字段含义沿用 INTERVIEW_SYSTEM_PROMPT;此处只补「以 json 输出 + 结构示例」,
    passPossibility 为 0-100 整数,passLevel 取 低/中/高,priorityTasks 的 status 一律「未开始」。
    """
    base = build_interview_user_prompt(job_title, company, jd, transcript)
    return (
        f"{base}\n\n"
        "请只输出一个合法的 json 对象,不要任何额外文字或 markdown 代码块。"
        "字段与类型严格按下面的示例(passPossibility 为 0-100 整数,passLevel 取 低/中/高,"
        "coreProblems 2-4 条,interviewerView.positives/concerns 各 2-4 条,"
        "priorityTasks 2-3 个且 status 一律为「未开始」):\n"
        f"{_INTERVIEW_JSON_EXAMPLE}"
    )


# P1-09:深入分析(/analysis)的真实 system prompt。与报告(复盘总览)不同,这里要求模型从
# 四个维度做更细的拆解:回答逻辑 logic、STAR 结构 star、面试官视角与追问 interviewer、风险 risks。
ANALYSIS_SYSTEM_PROMPT = (
    "你是一位资深的技术/产品面试官,同时也是职业教练。"
    "用户会提供岗位信息(岗位名称、公司、JD)和一段面试转写文本。"
    "请基于这些内容,产出一份客观、可执行的中文「深入分析」,从四个维度逐项拆解。\n"
    "要求:\n"
    "1. 所有文案使用简体中文,语气专业、具体、对事不对人,紧扣转写内容、不编造转写里没有的事实。\n"
    "2. logic(回答逻辑):2-4 个维度,每项含 title(维度名)、status(较强/一般/偏弱)、description(具体说明)。\n"
    "3. star(STAR 结构):覆盖 Situation/Task/Action/Result 四项,每项含 title、status(较强/一般/偏弱)、description。\n"
    "4. interviewer(面试官视角):summary 一句话整体判断;hesitations 2-4 条犹豫点;"
    "questions 给出 1-3 个关键追问,每个含 question(追问)、intent(面试官真实意图)、answer(你的回答情况)。\n"
    "5. risks(风险):risks 2-4 条风险点;positives 拉高判断的因素、negatives 拉低判断的因素各 1-4 条。"
)


def build_analysis_user_prompt(job_title: str, company: str, jd: str, transcript: str) -> str:
    """P1-09:anthropic 分支用 —— 把本次上传内容拼成给模型的用户输入(复用报告侧格式,改尾句)。"""
    return (
        f"岗位名称:{job_title}\n"
        f"公司:{company}\n"
        f"岗位 JD:{jd}\n\n"
        f"面试转写文本:\n{transcript}\n\n"
        "请据此生成结构化的面试深入分析(逻辑/STAR/面试官视角/风险四维)。"
    )


# openai provider(JSON Output 模式)用的 InterviewAnalysis 结构示例。
# status 取值统一提示「较强/一般/偏弱」,与前端 analysis.tsx 的 statusColor/statusScore 映射对齐。
_ANALYSIS_JSON_EXAMPLE = """{
  "logic": [
    {"title": "回答主线", "status": "一般", "description": "关键信息出现偏后,面试官需自己提炼重点。"}
  ],
  "star": [
    {"title": "Situation", "status": "较强", "description": "能说明项目背景,但篇幅略长。"},
    {"title": "Task", "status": "一般", "description": "任务目标有提到,但不够聚焦。"},
    {"title": "Action", "status": "偏弱", "description": "行动细节不足,个人做了什么没充分展开。"},
    {"title": "Result", "status": "偏弱", "description": "缺少结果量化和业务影响说明。"}
  ],
  "interviewer": {
    "summary": "有一定经历基础,但个人贡献和结果证据不足。",
    "hesitations": ["个人 ownership 不够清楚", "结果证据不足"],
    "questions": [
      {"question": "你在这个项目里具体负责什么?", "intent": "确认个人 ownership", "answer": "更多在讲项目整体,个人贡献不够集中"}
    ]
  },
  "risks": {
    "risks": ["项目贡献不清", "结果量化不足"],
    "positives": ["有真实项目经历"],
    "negatives": ["STAR 结构不稳定"]
  }
}"""


def build_analysis_json_prompt(job_title: str, company: str, jd: str, transcript: str) -> str:
    """P1-09:openai provider(JSON Output 模式)专用 —— 基础输入后追加「只输出 json + 结构示例」。

    字段含义沿用 ANALYSIS_SYSTEM_PROMPT;status 取值「较强/一般/偏弱」,star 覆盖 S/T/A/R 四项。
    """
    base = build_analysis_user_prompt(job_title, company, jd, transcript)
    return (
        f"{base}\n\n"
        "请只输出一个合法的 json 对象,不要任何额外文字或 markdown 代码块。"
        "字段与类型严格按下面的示例(logic 2-4 项、star 覆盖 Situation/Task/Action/Result 四项,"
        "每项 status 取 较强/一般/偏弱;interviewer.questions 1-3 个;risks 各项 1-4 条):\n"
        f"{_ANALYSIS_JSON_EXAMPLE}"
    )


# ---------------------------------------------------------------------------
# AI 接入:职业方向探索(/generate-result)的 openai/DeepSeek JSON 模式素材。
# 与 anthropic 分支共用 EXPLORE_SYSTEM_PROMPT;此处补「只输出 json + 结构示例」。
# ---------------------------------------------------------------------------
_EXPLORE_JSON_EXAMPLE = """{
  "conclusion": "你更适合兼顾逻辑分析与沟通协作的岗位。",
  "directions": [
    {
      "id": "ai-pm",
      "title": "AI产品经理",
      "match": "高",
      "reason": "你的沟通表达与结构化思考与该方向较匹配。",
      "portrait": {
        "dailyWork": ["需求分析", "跨团队协作", "产品方案设计"],
        "challenges": ["技术理解门槛高", "需平衡业务与技术"],
        "abilities": ["沟通表达", "逻辑分析", "产品思维"],
        "path": "产品助理 -> 产品经理 -> AI产品经理"
      },
      "whyFirst": ["和你的优势更贴近", "进入门槛相对可控"],
      "abilitiesToBuild": [
        {"title": "结构化表达", "description": "帮助你更清楚地介绍自己和经历"}
      ],
      "weeklyTasks": [
        {"id": "read-jd", "title": "阅读 3 个该方向岗位 JD", "status": "未开始"}
      ]
    }
  ],
  "transferableAbilities": ["结构化表达", "沟通协作", "项目推进"],
  "notRecommended": [
    {"title": "纯算法研发", "reason": "通常要求更强的数学与编程长期积累,匹配度较低。"}
  ]
}"""


def build_explore_json_prompt(profile) -> str:
    """openai provider(JSON Output 模式)专用:基础画像输入后追加「只输出 json + 结构示例」。

    字段含义沿用 EXPLORE_SYSTEM_PROMPT;match 取 高/较高/可尝试,weeklyTasks 的 status 一律「未开始」。
    """
    base = build_explore_user_prompt(profile)
    return (
        f"{base}\n\n"
        "请只输出一个合法的 json 对象,不要任何额外文字或 markdown 代码块。"
        "字段与类型严格按下面的示例(directions 2-3 个,match 取 高/较高/可尝试,"
        "每个方向含 portrait/whyFirst/abilitiesToBuild/weeklyTasks,weeklyTasks 的 status 一律「未开始」,"
        "transferableAbilities 3-5 个,notRecommended 1-2 个):\n"
        f"{_EXPLORE_JSON_EXAMPLE}"
    )


# ---------------------------------------------------------------------------
# AI 接入:动态追问(/followup)—— 对话式多轮。每轮把画像 + 已问问答历史发回,
# 后端基于历史生成「下一个」最有价值的追问;信息足够或达上限则返回 done。
# ---------------------------------------------------------------------------
FOLLOWUP_SYSTEM_PROMPT = (
    "你是一位温和、敏锐的 AI 职业探索教练,正在与用户进行多轮对话式追问。"
    "用户会提供一份自我画像,以及到目前为止已经问过的问答历史。"
    "请基于画像 + 历史,先用一句话承接用户上一句的回答,再生成**下一个**最有价值的追问,通过工具调用返回结构化结果。\n"
    "要求:\n"
    "1. reply:一句话承接(不超过 30 个中文字符),自然回应用户上一句;首轮(还没有任何回答)时 reply 可为空串。\n"
    "2. 只问一个问题,且绝不重复历史里已问过的内容;要顺着用户已有回答继续深入。\n"
    "3. 处理答非所问:\n"
    "   - 若用户上一句跑题或与所问无关,reply 先温和把话题接住,question 换一种说法把上一个意图重新问清楚,而不是直接抛新问题。\n"
    "   - 若回答信息量过低(如「不知道」「随便」「都行」),question 换一个更具体、更好回答的小角度重新问(如给两三个选项让其选)。\n"
    "   - 若用户在回答里反问你,reply 先简短回应他的反问,再用 question 自然地把话题引导回职业探索。\n"
    "4. 优先追问能帮助判断职业方向的证据,例如成就感来源、可迁移能力、现实约束边界。\n"
    "5. 语气像自然对话,单个问题不超过 40 个中文字符。\n"
    "6. 若画像信息已足够、或已问满 6 轮,则返回 done=true 且不再给问题(question 留空,reply 可给一句收尾)。\n"
    "7. 所有文案使用简体中文。问题含短横线英文 id(如 work-proof)与 question 文本。"
)


def _format_followup_history(history) -> str:
    """把已问问答历史拼成可读文本;空则标注「(尚未开始追问)」。history 为 FollowupTurn 列表。"""
    if not history:
        return "(尚未开始追问)"
    lines = []
    for i, turn in enumerate(history, 1):
        lines.append(f"第{i}轮 问:{turn.question}\n第{i}轮 答:{turn.answer}")
    return "\n".join(lines)


def build_followup_user_prompt(profile, history) -> str:
    """anthropic 分支用 —— 复用探索画像输入格式,附加已问问答历史 + 轮次提示。"""
    base = build_explore_user_prompt(profile).replace("请据此生成结构化的职业方向推荐结果。", "")
    return (
        f"{base}"
        f"已问问答历史(共 {len(history)} 轮):\n{_format_followup_history(history)}\n\n"
        "请基于以上画像与历史,先用一句话承接用户上一句(reply),再生成下一个追问;"
        "若用户跑题/答非所问/信息过低,reply 接住、question 换个说法重问;"
        "若信息已足够或已问满 6 轮,返回 done=true。"
    )


_FOLLOWUP_JSON_EXAMPLE = """{
  "reply": "听起来你挺看重能快速看到成果,这点很重要。",
  "question": {"id": "work-proof", "question": "你提到的这些事里,哪一类最让你有成就感?"},
  "done": false
}"""


def build_followup_json_prompt(profile, history) -> str:
    """openai provider(JSON Output 模式)专用 —— 基础输入 + 历史后追加「只输出 json + 结构示例」。"""
    base = build_followup_user_prompt(profile, history)
    return (
        f"{base}\n\n"
        "请只输出一个合法的 json 对象,不要任何额外文字或 markdown 代码块。"
        "字段严格按下面的示例(reply 为承接语 ≤30 字、首轮可为空;question 含短横线英文 id 与 question 文本;"
        "若用户跑题/答非所问/信息过低,reply 接住、question 换个说法重问;"
        "若信息足够或已问满 6 轮,done 为 true 且 question 为 null):\n"
        f"{_FOLLOWUP_JSON_EXAMPLE}"
    )
