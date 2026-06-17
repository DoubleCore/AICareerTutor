import { InterviewAnalysis, InterviewReport, InterviewUpload, TaskStatus, TrainingTask } from "@/types/domain";
import { interviewAnalysis as mockAnalysis, interviewReport as mockReport, trainingTasks as mockTasks } from "@/data/mockData";
import { useAppStore } from "@/store/useAppStore";
import { aiGenerateInterview } from "./ai";

/**
 * 面试接口。App 独立化后不再走后端 —— 上传内容存进 store,生成走 DeepSeek 直连。
 * 关键:复刻原后端「BackgroundTask + 立即返回 generating」语义(方案 A'),
 * 使 analyzing 屏的「先触发、再轮询 status」时序原样可用,屏幕代码零改动。
 */

export type UploadResponse = {
  sessionId: string;
  status: string;
};

export type AnalysisStatusResponse = {
  sessionId: string;
  status: string;
};

/**
 * 后台生成任务句柄:模块级 fire-and-forget,绝不进 store/persist(Promise 不可序列化)。
 * 兼作去重:同一 sessionId 正在生成时不重复触发(防双重烧 token)。
 */
const inFlight = new Map<string, Promise<void>>();

/** 生成唯一 sessionId(避开固定的 "mock-session",否则多次面试缓存互相覆盖)。 */
function newSessionId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 上传面试记录:存进 store,返回本地生成的 sessionId。 */
export function uploadInterview(payload: Partial<Omit<InterviewUpload, "sessionId">>): Promise<UploadResponse> {
  const sessionId = newSessionId();
  const upload: InterviewUpload = {
    sessionId,
    fileName: payload.fileName ?? "",
    jobTitle: payload.jobTitle ?? "",
    company: payload.company ?? "",
    jd: payload.jd ?? "",
    transcript: payload.transcript ?? ""
  };
  useAppStore.getState().setInterviewUpload(sessionId, upload);
  return Promise.resolve({ sessionId, status: "idle" });
}

/**
 * 触发后台异步生成报告 + 深入分析,立即返回 { status: "generating" }(不 await 生成完成)。
 * 后台任务完成后写入 store 并置 ready;失败也回退 mock 并置 ready(对齐后端:回退 mock 也算有效报告)。
 */
export function analyzeInterview(sessionId = "mock-session"): Promise<AnalysisStatusResponse> {
  const store = useAppStore.getState();

  // 已在生成中或已就绪则不重复触发。
  if (inFlight.has(sessionId) || store.interviewStatuses[sessionId] === "ready") {
    return Promise.resolve({ sessionId, status: store.interviewStatuses[sessionId] ?? "generating" });
  }

  const upload = store.interviewUploads[sessionId];
  store.setInterviewStatus(sessionId, "generating");

  const task = (async () => {
    try {
      // upload 缺失(如直接用 mock-session 进来)时用一份空 upload 兜底,让 AI 层走 mock 回退。
      const safeUpload: InterviewUpload = upload ?? { sessionId, fileName: "", jobTitle: "", company: "", jd: "", transcript: "" };
      const { report, analysis } = await aiGenerateInterview(safeUpload);
      useAppStore.getState().setInterviewResult(sessionId, report, analysis);
    } catch {
      // 兜底:任何意外都写 mock 并置 ready,保证 analyzing 屏能跳转、不卡死。
      const fallbackReport: InterviewReport = { ...mockReport, sessionId, priorityTasks: mockTasks };
      useAppStore.getState().setInterviewResult(sessionId, fallbackReport, mockAnalysis);
    } finally {
      inFlight.delete(sessionId);
    }
  })();

  inFlight.set(sessionId, task);
  return Promise.resolve({ sessionId, status: "generating" });
}

/** 轮询报告生成状态(纯读 store)。 */
export function getAnalysisStatus(sessionId = "mock-session"): Promise<AnalysisStatusResponse> {
  const status = useAppStore.getState().interviewStatuses[sessionId] ?? "idle";
  return Promise.resolve({ sessionId, status });
}

/** 面试复盘报告:命中缓存返回;未命中回退 mock(不 reject,保证有内容)。 */
export function getInterviewOverview(sessionId = "mock-session"): Promise<InterviewReport> {
  const report = useAppStore.getState().interviewReports[sessionId];
  return Promise.resolve(report ?? { ...mockReport, sessionId, priorityTasks: mockTasks });
}

/** 深入分析:命中缓存返回;未命中回退 mock。 */
export function getInterviewAnalysis(sessionId = "mock-session"): Promise<InterviewAnalysis> {
  const analysis = useAppStore.getState().interviewAnalyses[sessionId];
  return Promise.resolve(analysis ?? mockAnalysis);
}

/** 训练任务列表:从该 session 报告的 priorityTasks 派生;无则回退 mock。 */
export function getTrainingTasks(sessionId = "mock-session"): Promise<TrainingTask[]> {
  const report = useAppStore.getState().interviewReports[sessionId];
  return Promise.resolve(report?.priorityTasks ?? mockTasks);
}

/** 更新某 session 下单个训练任务状态(改 store),返回更新后的 task。 */
export function updateTrainingTask(sessionId: string, taskId: string, status: TaskStatus): Promise<TrainingTask> {
  const store = useAppStore.getState();
  store.updateInterviewTask(sessionId, taskId, status);
  const updated = store.interviewReports[sessionId]?.priorityTasks.find((task) => task.id === taskId);
  return Promise.resolve(updated ?? { id: taskId, title: "", description: "", status });
}
