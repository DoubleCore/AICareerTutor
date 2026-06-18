import {
  directions as mockDirections,
  followupQuestions as mockFollowups,
  interviewAnalysis as mockAnalysis,
  interviewReport as mockReport,
  trainingTasks as mockTrainingTasks
} from "@/data/mockData";
import {
  DirectionRecommendation,
  ExploreProfile,
  FollowupQuestion,
  InterviewAnalysis,
  InterviewReport,
  InterviewUpload
} from "@/types/domain";
import { chatJson, hasAiKey } from "./deepseekClient";
import {
  ANALYSIS_SYSTEM_PROMPT,
  EXPLORE_SYSTEM_PROMPT,
  FOLLOWUP_SYSTEM_PROMPT,
  FollowupTurn,
  INTERVIEW_SYSTEM_PROMPT,
  buildAnalysisJsonPrompt,
  buildExploreJsonPrompt,
  buildFollowupJsonPrompt,
  buildInterviewJsonPrompt
} from "./prompts";

/**
 * AI 生成编排层:对齐后端 ai_service.py 的「真调成功返回 / 任何失败回退 mock」范式。
 * 纯函数,不读写 store(store 编排留给 service 层)。
 * 这一层取代了后端的 ai_service + mock_state.build_mock_*,使 App 可独立运行。
 */

const FOLLOWUP_MAX_TURNS = 6;
const EXPLORE_MAX_TOKENS = 4000;
const INTERVIEW_MAX_TOKENS = 2000;

export type ExploreResult = {
  conclusion: string;
  directions: DirectionRecommendation[];
  transferableAbilities: string[];
  notRecommended: { title: string; reason: string }[];
};

export type FollowupResponse = {
  reply?: string; // 承接语:对用户上一句的简短回应(可选;首轮或缺失时为空)
  question: FollowupQuestion | null;
  done: boolean;
};

// ---- mock 回退构造(对齐后端 build_mock_*) ----

function buildMockExploreResult(): ExploreResult {
  return {
    conclusion: "你更适合兼顾逻辑分析与沟通协作的岗位,建议先从匹配度高的方向低成本验证。",
    directions: mockDirections,
    transferableAbilities: ["结构化表达", "沟通协作", "逻辑分析", "项目推进"],
    notRecommended: [{ title: "纯算法研发", reason: "通常要求更强的数学与编程长期积累,当前匹配度较低。" }]
  };
}

function mockFollowupAt(turnCount: number): FollowupResponse {
  if (turnCount >= mockFollowups.length) {
    return { question: null, done: true };
  }
  return { question: mockFollowups[turnCount], done: false };
}

// ---- 三个生成函数 ----

/** 动态追问:基于画像 + 历史生成下一题或 done。6 轮硬上限;缺 key/失败回退 mock 题库。 */
export async function aiGenerateFollowup(profile: ExploreProfile, history: FollowupTurn[]): Promise<FollowupResponse> {
  const turnCount = history.length;
  if (turnCount >= FOLLOWUP_MAX_TURNS) {
    return { question: null, done: true };
  }
  if (!hasAiKey()) {
    return mockFollowupAt(turnCount);
  }
  try {
    const payload = (await chatJson({
      system: FOLLOWUP_SYSTEM_PROMPT,
      user: buildFollowupJsonPrompt(profile, history)
    })) as { reply?: unknown; question?: { id?: string; question?: string } | null; done?: boolean };
    const reply = typeof payload?.reply === "string" && payload.reply.trim() ? payload.reply.trim() : undefined;
    const q = payload?.question;
    if (q && typeof q.id === "string" && typeof q.question === "string" && q.question.trim()) {
      return { reply, question: { id: q.id, question: q.question }, done: false };
    }
    return { reply, question: null, done: true };
  } catch {
    return mockFollowupAt(turnCount);
  }
}

/** 方向推荐:结构大,maxTokens 4000;缺 key/失败回退 mock 方向。 */
export async function aiGenerateExploreResult(profile: ExploreProfile): Promise<ExploreResult> {
  if (!hasAiKey()) {
    return buildMockExploreResult();
  }
  try {
    const payload = (await chatJson({
      system: EXPLORE_SYSTEM_PROMPT,
      user: buildExploreJsonPrompt(profile),
      maxTokens: EXPLORE_MAX_TOKENS
    })) as ExploreResult;
    // 基础形状校验:directions 必须是非空数组,否则视为无效回退 mock。
    if (!payload || !Array.isArray(payload.directions) || payload.directions.length === 0) {
      return buildMockExploreResult();
    }
    return {
      conclusion: payload.conclusion ?? "",
      directions: payload.directions,
      transferableAbilities: Array.isArray(payload.transferableAbilities) ? payload.transferableAbilities : [],
      notRecommended: Array.isArray(payload.notRecommended) ? payload.notRecommended : []
    };
  } catch {
    return buildMockExploreResult();
  }
}

/**
 * 面试复盘报告 + 深入分析:两次独立 LLM 调用,各自失败各自回退 mock。
 * report 的 sessionId / title 由本端权威回填(不信模型漏字段),对齐后端。
 */
export async function aiGenerateInterview(upload: InterviewUpload): Promise<{ report: InterviewReport; analysis: InterviewAnalysis }> {
  const { sessionId, jobTitle, company, jd, transcript } = upload;
  const report = await generateReport(sessionId, jobTitle, company, jd, transcript);
  const analysis = await generateAnalysis(jobTitle, company, jd, transcript);
  return { report, analysis };
}

async function generateReport(sessionId: string, jobTitle: string, company: string, jd: string, transcript: string): Promise<InterviewReport> {
  const fallback = (): InterviewReport => ({ ...mockReport, sessionId, title: `${jobTitle || "面试"}一面`, priorityTasks: mockTrainingTasks });
  if (!hasAiKey()) {
    return fallback();
  }
  try {
    const payload = (await chatJson({
      system: INTERVIEW_SYSTEM_PROMPT,
      user: buildInterviewJsonPrompt(jobTitle, company, jd, transcript),
      maxTokens: INTERVIEW_MAX_TOKENS
    })) as Partial<InterviewReport>;
    if (!payload || !Array.isArray(payload.priorityTasks) || !Array.isArray(payload.coreProblems)) {
      return fallback();
    }
    // 权威回填:sessionId 必填、title 漏则兜底。
    return {
      ...(payload as InterviewReport),
      sessionId,
      title: payload.title || `${jobTitle || "面试"}一面`
    };
  } catch {
    return fallback();
  }
}

async function generateAnalysis(jobTitle: string, company: string, jd: string, transcript: string): Promise<InterviewAnalysis> {
  if (!hasAiKey()) {
    return mockAnalysis;
  }
  try {
    const payload = (await chatJson({
      system: ANALYSIS_SYSTEM_PROMPT,
      user: buildAnalysisJsonPrompt(jobTitle, company, jd, transcript),
      maxTokens: INTERVIEW_MAX_TOKENS
    })) as Partial<InterviewAnalysis>;
    if (!payload || !Array.isArray(payload.logic) || !Array.isArray(payload.star) || !payload.interviewer || !payload.risks) {
      return mockAnalysis;
    }
    return payload as InterviewAnalysis;
  } catch {
    return mockAnalysis;
  }
}
