import { InterviewAnalysis, InterviewReport, InterviewUpload, TaskStatus, TrainingTask } from "@/types/domain";
import { request } from "./apiClient";

/**
 * 面试相关接口,路径对齐 apps/api/app/api/routes/interview.py(前缀 /interview)。
 * 后端已通过 CamelModel 输出 camelCase,响应可直接当作 types/domain.ts 的类型用。
 */

/** 上传响应:{ sessionId, status }(P1-02 对齐后的结构)。 */
export type UploadResponse = {
  sessionId: string;
  status: string;
};

/** POST /interview/upload —— 上传面试记录,拿到 sessionId。 */
export function uploadInterview(payload: Partial<Omit<InterviewUpload, "sessionId">>): Promise<UploadResponse> {
  return request<UploadResponse>("/interview/upload", { method: "POST", body: payload });
}

/**
 * 报告生成状态响应(方案C),对齐后端 AnalysisStatusResponse。
 * status: generating(后台生成中)/ ready(已生成,可读 overview)/ idle(未触发)/ failed。
 */
export type AnalysisStatusResponse = {
  sessionId: string;
  status: string;
};

/**
 * POST /interview/analyze —— 触发后台异步生成报告,立即返回 { sessionId, status: "generating" }。
 * 真正的报告由后端后台线程生成(real 模式下真调 LLM,耗时较长),前端需轮询 getAnalysisStatus。
 */
export function analyzeInterview(sessionId = "mock-session"): Promise<AnalysisStatusResponse> {
  return request<AnalysisStatusResponse>(`/interview/analyze?session_id=${encodeURIComponent(sessionId)}`, { method: "POST" });
}

/** GET /interview/status/{sessionId} —— 轮询报告生成状态,ready 后即可读 overview。 */
export function getAnalysisStatus(sessionId = "mock-session"): Promise<AnalysisStatusResponse> {
  return request<AnalysisStatusResponse>(`/interview/status/${encodeURIComponent(sessionId)}`);
}

/** GET /interview/overview/{sessionId} —— 面试复盘报告。 */
export function getInterviewOverview(sessionId = "mock-session"): Promise<InterviewReport> {
  return request<InterviewReport>(`/interview/overview/${encodeURIComponent(sessionId)}`);
}

/** GET /interview/analysis/{sessionId} —— 深入分析(逻辑/STAR/面试官/风险)。 */
export function getInterviewAnalysis(sessionId = "mock-session"): Promise<InterviewAnalysis> {
  return request<InterviewAnalysis>(`/interview/analysis/${encodeURIComponent(sessionId)}`);
}

/** GET /interview/training/{sessionId} —— 训练任务列表。 */
export function getTrainingTasks(sessionId = "mock-session"): Promise<TrainingTask[]> {
  return request<TrainingTask[]>(`/interview/training/${encodeURIComponent(sessionId)}`);
}

/** PATCH /interview/training/{sessionId}/task/{taskId} —— 更新某 session 下单个训练任务状态。 */
export function updateTrainingTask(sessionId: string, taskId: string, status: TaskStatus): Promise<TrainingTask> {
  return request<TrainingTask>(`/interview/training/${encodeURIComponent(sessionId)}/task/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: { status }
  });
}
