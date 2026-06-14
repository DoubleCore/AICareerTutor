EXPLORE_SYSTEM_PROMPT = "Generate structured career exploration output for the P0 schema."

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
