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
