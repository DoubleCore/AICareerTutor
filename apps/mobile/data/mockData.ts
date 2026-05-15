import { DirectionRecommendation, ExploreProfile, FollowupQuestion, InterviewAnalysis, InterviewReport, TrainingTask } from "@/types/domain";

export const defaultProfile: ExploreProfile = {
  stage: "应届毕业生",
  education: "本科",
  major: "市场营销",
  interests: ["产品设计", "沟通表达", "创意策划"],
  workPreferences: ["高成长", "强逻辑", "创新感"],
  goal: "想知道自己适合什么工作",
  constraints: ["希望尽快就业", "能接受加班", "可以接受从基础岗位开始"],
  experiences: ["项目经历", "实习经历"],
  workTypes: ["做数据分析", "做产品设计", "协调沟通", "研究分析"],
  preferredStates: ["团队协作", "沟通表达", "推进项目落地", "创意构思"],
  followups: ["在产品设计、数据分析和协调沟通里，最有成就感的是推动事情真正落地。"]
};

export const basicQuestions = [
  { key: "stage", title: "你目前处于什么阶段？", options: [ "在校学生", "应届毕业生", "工作1-3年","工作 3 年以上", "暂时待业 / 过渡中","正在考虑转行 / 转岗", "暂不确定", "其他"] },
  { key: "education", title: "你的学历状态是？", options: ["专科", "本科", "硕士", "博士", "其他"] },
  { key: "major", title: "你所学专业更接近哪一类？", options: ["市场营销", "计算机", "设计传媒", "经管类", "语言文学", "其他"] },
  { key: "interests", title: "你更感兴趣的事情有哪些？", options: ["产品设计", "沟通表达", "创意策划", "数据分析", "技术实现", "研究写作", "其他"] },
  { key: "workPreferences", title: "你更看重什么样的工作特点？", options: ["稳定", "高成长", "高收入", "工作生活平衡", "强逻辑", "创新感", "与人沟通多", "独立思考多", "其他"] },
  { key: "goal", title: "你这次最想解决的问题是什么？", options: ["想知道自己适合什么工作", "想知道该先尝试哪个方向", "判断适不适合转行", "想知道方向发展前景", "其他"] },
  { key: "constraints", title: "哪些现实条件会影响你的选择？", options: ["能接受加班", "不能接受频繁加班", "能接受出差", "不能接受频繁出差", "能接受转城市", "希望尽快就业", "优先考虑稳定", "可以接受从基础岗位开始", "暂时不考虑继续深造", "其他", "暂无特别限制"] }
] as const;

export const experienceQuestions = [
  { key: "experiences", title: "你是否参与过以下经历？", options: ["项目经历", "比赛经历", "实习经历", "社团 / 学生组织经历", "兼职 / 社会实践", "暂无特别典型的经历", "其他"] },
  { key: "workTypes", title: "你做过哪些更接近以下类型的事情？", options: ["策划活动 / 写方案", "做数据分析", "写文案 / 做内容输出", "做产品设计", "协调沟通", "编程开发", "研究分析", "推动事情落地", "其他"] },
  { key: "preferredStates", title: "你更享受哪种工作状态？", options: ["团队协作", "沟通表达", "独立思考", "推进项目落地", "创意构思", "深度研究", "其他"] }
] as const;

export const followupQuestions: FollowupQuestion[] = [
  { id: "f1", question: "你刚刚提到自己做过产品设计、数据分析和协调沟通。在这些经历里，哪一类事情最让你有成就感？" },
  { id: "f2", question: "如果要从基础岗位开始，你更能接受偏分析、偏沟通，还是偏执行推进的岗位？" },
  { id: "f3", question: "你最担心新方向里的哪类困难？" }
];

const baseTasks = [
  { id: "read-jd", title: "阅读 3 个该方向岗位 JD", status: "未开始" as const },
  { id: "read-stories", title: "看 2 篇相关从业者经验分享", status: "未开始" as const },
  { id: "map-experience", title: "梳理 1 段最贴近该方向的经历", status: "未开始" as const },
  { id: "intro-draft", title: "写 1 版针对该方向的自我介绍草稿", status: "未开始" as const }
];

export const directions: DirectionRecommendation[] = [
  {
    id: "ai-pm",
    title: "AI产品经理",
    match: "高",
    reason: "你的沟通表达、结构化思考和推进落地倾向，与该方向较匹配。",
    portrait: {
      dailyWork: ["需求分析", "跨团队协作", "产品方案设计", "推动项目落地"],
      challenges: ["技术理解门槛高", "需要平衡业务与技术需求"],
      abilities: ["沟通表达", "逻辑分析", "产品思维", "推动力"],
      path: "产品助理 -> 产品经理 -> AI产品经理 / 解决方案产品经理"
    },
    whyFirst: ["同时需要逻辑分析和沟通协作，和你的优势更贴近", "进入门槛相对可控，适合先低成本验证", "已有经历和能力可以迁移到这个方向"],
    abilitiesToBuild: [
      { title: "结构化表达", description: "帮助你更清楚地介绍自己和经历" },
      { title: "项目经历梳理", description: "帮助你判断自己与这个方向的匹配度" },
      { title: "需求理解 / 问题拆解", description: "帮助你更快理解岗位核心工作" },
      { title: "行业认知", description: "帮助你判断这个方向是否值得继续投入" }
    ],
    weeklyTasks: baseTasks
  },
  {
    id: "data-analyst",
    title: "数据分析师",
    match: "较高",
    reason: "你具备数据理解和逻辑分析倾向，适合先从分析型岗位切入。",
    portrait: {
      dailyWork: ["指标拆解", "数据清洗", "业务分析", "输出分析报告"],
      challenges: ["需要补足工具能力", "需要把结论讲给业务听"],
      abilities: ["数据理解", "逻辑分析", "报告表达"],
      path: "数据助理 -> 数据分析师 -> 业务分析 / 策略分析"
    },
    whyFirst: ["能把你的逻辑兴趣转成可见作品", "岗位样本多，适合快速验证", "能和产品、运营方向互相迁移"],
    abilitiesToBuild: [
      { title: "Excel / SQL 基础", description: "先能完成基础数据处理" },
      { title: "指标意识", description: "理解业务问题如何转化为指标" },
      { title: "分析报告表达", description: "把结论说清楚，而不只是列数据" }
    ],
    weeklyTasks: baseTasks.map((task) => ({ ...task, id: `da-${task.id}` }))
  },
  {
    id: "ops-strategy",
    title: "运营策略",
    match: "可尝试",
    reason: "你在沟通协作和执行推进方面有优势，适合在业务场景中快速积累经验。",
    portrait: {
      dailyWork: ["活动策划", "用户分析", "策略复盘", "跨团队推进"],
      challenges: ["节奏较快", "需要持续复盘和拿结果"],
      abilities: ["沟通协作", "执行推进", "内容策划"],
      path: "运营专员 -> 策略运营 -> 业务负责人"
    },
    whyFirst: ["能快速接触真实业务", "能发挥沟通和推进优势", "对转向产品或策略仍有迁移价值"],
    abilitiesToBuild: [
      { title: "业务复盘", description: "知道一个动作为什么有效或无效" },
      { title: "用户理解", description: "提升对真实需求的敏感度" },
      { title: "方案表达", description: "把想法变成可执行计划" }
    ],
    weeklyTasks: baseTasks.map((task) => ({ ...task, id: `ops-${task.id}` }))
  }
];

export const trainingTasks: TrainingTask[] = [
  { id: "quantify-result", title: "补齐项目结果量化", description: "把核心项目中的结果改成可验证、可量化的表达", status: "未开始" },
  { id: "star-structure", title: "统一 STAR 回答结构", description: "让回答更聚焦，减少背景过长和重点后置", status: "进行中" },
  { id: "keywords", title: "强化岗位关键词表达", description: "让面试官更快感受到你的岗位匹配度", status: "已完成" }
];

export const interviewReport: InterviewReport = {
  sessionId: "mock-session",
  title: "AI产品经理一面",
  overall: "整体表现：中等偏上",
  conclusion: "你这次最主要的问题不是没有内容，而是没有把个人贡献和结果价值说清楚。",
  passPossibility: 62,
  passLevel: "中",
  coreProblems: ["项目贡献表达不够明确", "回答里结果量化不足", "STAR 结构里 Action 和 Result 部分偏弱"],
  interviewerView: {
    impression: "有一定经历基础，但录用信心不足。",
    positives: ["有真实项目经历", "方向理解基本在线"],
    concerns: ["个人贡献不够清楚", "结果证据不足", "回答有时偏散"]
  },
  priorityTasks: trainingTasks
};

export const interviewAnalysis: InterviewAnalysis = {
  logic: [
    { title: "回答主线", status: "一般", description: "回答有内容，但关键信息出现偏后，面试官需要自己提炼重点。" },
    { title: "个人贡献表达", status: "偏弱", description: "更多在讲项目背景和团队动作，个人角色不够突出。" },
    { title: "结果支撑", status: "偏弱", description: "回答中缺少量化结果，导致说服力不足。" },
    { title: "是否围绕主线展开", status: "一般", description: "整体没有明显跑题，但表达略有发散。" }
  ],
  star: [
    { title: "Situation", status: "较强", description: "你能说明项目背景，但篇幅略长。" },
    { title: "Task", status: "一般", description: "任务目标有提到，但不够聚焦。" },
    { title: "Action", status: "偏弱", description: "行动细节不足，个人做了什么没有充分展开。" },
    { title: "Result", status: "偏弱", description: "缺少结果量化和业务影响说明。" }
  ],
  interviewer: {
    summary: "有一定经历基础，但个人贡献和结果证据不足，录用信心仍不稳定。",
    hesitations: ["个人 ownership 不够清楚", "结果证据不足", "回答有时偏散"],
    questions: [
      { question: "你在这个项目里具体负责什么？", intent: "确认你的个人 ownership，而不是团队做了什么", answer: "更多在讲项目整体，个人贡献不够集中" },
      { question: "最后结果怎么样？", intent: "确认你的工作有没有产出和价值", answer: "提到了结果，但缺少可验证的数据或变化" },
      { question: "为什么这样做？", intent: "确认你的决策思考，而不仅是执行过程", answer: "描述了过程，但没有突出判断逻辑" }
    ]
  },
  risks: {
    risks: ["项目贡献不清，影响岗位匹配感", "结果量化不足，影响说服力", "回答偏散，影响面试官信心"],
    positives: ["有真实项目经历", "岗位方向理解基本在线"],
    negatives: ["个人贡献表达偏弱", "STAR 结构不稳定", "缺少结果证据"]
  }
};
