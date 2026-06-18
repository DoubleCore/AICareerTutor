import { AuthUser } from "@/types/domain";
import { request } from "./apiClient";

/**
 * 账号接口(Group B)。走后端 /auth(需 EXPO_PUBLIC_API_URL 指向可达后端)。
 *
 * 与探索/面试的「独立化直连」不同:账号天然依赖后端(鉴权、跨设备)。
 * 后端不可达时,调用方(屏幕层)捕获 ApiError 给提示,App 其余功能(本地 mock)不受影响。
 * 登录态(token + user)由 store 持久化;请求时带 Authorization: Bearer。
 */

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

/** 注册:邮箱 + 密码 + 昵称。成功返回 token + user;邮箱已存在抛 ApiError(code=email_exists)。 */
export function register(email: string, password: string, nickname: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", { method: "POST", body: { email, password, nickname } });
}

/** 登录:邮箱 + 密码。失败抛 ApiError(code=invalid_credentials)。 */
export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
}

/** 取当前用户(校验 token 有效性)。token 失效抛 ApiError(401)。 */
export function fetchMe(token: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
}
