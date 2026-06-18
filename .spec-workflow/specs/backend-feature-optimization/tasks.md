# Tasks Document

> 分三组,建议按组顺序落地:**Group A 多格式上传 → Group B 账号 → Group C 追问优化**。三组相互独立,可分批审阅/实现。

---

## Group A — 多格式面试材料上传(Requirement 1)

- [ ] A1. 新增后端依赖与配置项
  - File: `apps/api/requirements.txt`, `apps/api/app/core/config.py`, `apps/api/.env.example`
  - 加 `pypdf`(或 `pdfplumber`,实现任务再定)、`python-docx`,锁版本;config 加 `max_upload_mb: int = 10`
  - Purpose: 为解析层备好依赖与大小上限配置
  - _Leverage: `apps/api/app/core/config.py`(pydantic-settings 现有范式)_
  - _Requirements: 1.8_
  - _Prompt: Role: Python 后端工程师,熟悉 FastAPI 配置与依赖管理 | Task: 在 requirements.txt 加 pdf/docx 解析库(锁定版本)、在 config.py 加 max_upload_mb 配置项(默认 10)、在 .env.example 补占位,遵循仓库「锁版本 / 密钥只进 .env」约定 | Restrictions: 不引入超出 pdf/docx 解析所需的额外依赖,不改 SQLite/Supabase 占位结构 | Success: pip install 成功,config.max_upload_mb 可读,typecheck/后端可启动。先把本任务在 tasks.md 标为 [-],完成后用 log-implementation 记录,再标 [x]_

- [ ] A2. 新增 ExtractResponse schema
  - File: `apps/api/app/schemas/interview.py`
  - 加 `ExtractResponse(CamelModel)` { text, source_format, warnings: list[str]=[] }
  - Purpose: 解析端点的响应契约
  - _Leverage: `apps/api/app/schemas/common.py`(CamelModel)_
  - _Requirements: 1.2, 1.3_
  - _Prompt: Role: Python 后端工程师,熟悉 Pydantic | Task: 在 schemas/interview.py 新增 ExtractResponse(继承 CamelModel,字段 text/source_format/warnings),遵循「schema 即契约 + camelCase 序列化」约定 | Restrictions: 不改动现有 InterviewUpload/InterviewReport 等模型 | Success: 模型可被路由引用,序列化为 camelCase。标 [-] → log-implementation → [x]_

- [ ] A3. 升级 file_service 为 dispatch 层(含 mp3 桩)
  - File: `apps/api/app/services/file_service.py`
  - 实现 `extract_text(filename, content)` dispatch + `_extract_plain`(txt/md)+ `extract_pdf` + `extract_docx` + `extract_audio`(`NotImplementedError`);定义 `UnsupportedFormatError`
  - Purpose: 文件→文本核心逻辑,每格式单一职责;mp3 仅留桩
  - _Leverage: 新增依赖(pypdf/python-docx);`core/errors.py` 错误信封_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Prompt: Role: Python 后端工程师,熟悉文件解析 | Task: 把 file_service.py 从 no-op 升级为按扩展名 dispatch 的解析层:txt/md 直接解码、pdf 用 pypdf/pdfplumber、docx 用 python-docx、mp3 抛 NotImplementedError(明确中文消息)、未知扩展名抛 UnsupportedFormatError;空文本要能被上层识别 | Restrictions: mp3 绝不埋假实现,只留桩;不在此处理 HTTP 层(交给路由);所有面向用户消息用简体中文 | Success: 各格式样本能抽出文本,mp3/未知格式抛对应异常。标 [-] → log-implementation → [x]_

- [ ] A4. 新增 POST /interview/extract 路由
  - File: `apps/api/app/api/routes/interview.py`
  - 接收 `UploadFile`,校验大小(max_upload_mb)→ 调 `file_service.extract_text` → 返回 ExtractResponse;异常映射:UnsupportedFormat→422、NotImplementedError(mp3)→501、空内容→422、超大→413/422
  - Purpose: 暴露文件解析端点
  - _Leverage: `services/file_service.py`(A3)、`schemas/interview.py`(A2)、`core/errors.py`_
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_
  - _Prompt: Role: FastAPI 路由工程师 | Task: 在 routes/interview.py 新增 POST /interview/extract(multipart UploadFile),做大小校验后调 file_service.extract_text,把领域异常映射为合适的错误信封(422/501/413),成功返回 ExtractResponse;路由不含解析业务逻辑 | Restrictions: 不在路由里写解析逻辑;错误不回显服务器内部细节;沿用现有 register_exception_handlers 风格 | Success: /docs 可见端点,各格式/错误码符合 design。标 [-] → log-implementation → [x]_

- [ ] A5. 前端上传屏接入文件解析
  - File: `apps/mobile/app/interview/upload.tsx`, `apps/mobile/services/interviewApi.ts`
  - txt/md 仍端上 FileReader 直接读;pdf/docx/mp3 走新增 `extractInterviewFile()`(POST 后端 /interview/extract,需 `EXPO_PUBLIC_API_URL`);更新 `accept` 与提示文案;mp3 显示「暂未支持」明确提示;失败回退手动粘贴
  - Purpose: 端到端打通多格式上传
  - _Leverage: `services/apiClient.ts`(baseUrl/超时/错误解析)、现有 `useFilePicker`_
  - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7_
  - _Prompt: Role: React Native/Expo 前端工程师 | Task: 在 upload.tsx 扩展文件选择(accept 加 pdf/docx/mp3),txt/md 保持端上读取,pdf/docx/mp3 调新增 interviewApi.extractInterviewFile() 走后端解析拿回 text 填入 transcript;mp3 返回 501 时显示明确中文提示;任何失败回退到现有手动粘贴路径;文案全部简体中文 | Restrictions: 不破坏现有 txt 端上读取与回退逻辑;baseUrl 缺失时优雅降级;用 constants/theme 的 token 不硬编码样式 | Success: web 选 pdf/docx 能回填文本走完复盘,mp3 有明确提示,typecheck 通过。标 [-] → log-implementation → [x]_

---

## Group B — 用户注册 / 登录(Requirement 2)

- [ ] B1. 新增鉴权依赖与配置
  - File: `apps/api/requirements.txt`, `apps/api/app/core/config.py`, `apps/api/.env.example`
  - 加 `passlib[bcrypt]`、`python-jose[cryptography]`;config 加 `jwt_secret: str = ""`、`jwt_expire_minutes: int = 10080`;启动期校验 secret 缺失即拒签
  - Purpose: 备好鉴权依赖与密钥配置(密钥只进 .env)
  - _Leverage: `core/config.py`_
  - _Requirements: 2.8_
  - _Prompt: Role: Python 安全工程师 | Task: 加 passlib[bcrypt] 与 python-jose(锁版本),config 加 jwt_secret/jwt_expire_minutes,.env.example 补占位;确保缺失 jwt_secret 时不使用硬编码默认(签发处校验或启动期报错) | Restrictions: 绝不在代码里写死 secret;不把 secret 写进任何提交文件 | Success: 依赖装好,缺 secret 时有明确拒绝。标 [-] → log-implementation → [x]_

- [ ] B2. 新增 core/security.py
  - File: `apps/api/app/core/security.py`
  - `hash_password` / `verify_password`(passlib)+ `create_access_token` / `decode_access_token`(jose, sub=user_id, exp)
  - Purpose: 密码哈希 + JWT 编解码(无业务)
  - _Leverage: `core/config.py`(jwt_secret/expire)_
  - _Requirements: 2.1, 2.3, 2.6_
  - _Prompt: Role: Python 安全工程师,熟悉 passlib/jose | Task: 实现 security.py 四个纯函数:密码哈希/校验、JWT 签发/解码(解码失败或过期返回 None);从 config 读 secret 与过期 | Restrictions: 不含任何 DB/业务逻辑;不明文存密码;不吞掉配置缺失 | Success: 哈希往返、token 往返、过期 token 解码返回 None。标 [-] → log-implementation → [x]_

- [ ] B3. 新增 User 模型
  - File: `apps/api/app/db/models.py`
  - `User(SQLModel, table=True)` { id(uuid str 主键), email(唯一索引), password_hash, nickname, created_at, updated_at }
  - Purpose: 账号持久化,字段对齐 Supabase Auth
  - _Leverage: `db/models.py` 现有 SQLModel 范式、`db/database.py` init_db_
  - _Requirements: 2.1_
  - _Prompt: Role: Python 数据建模工程师,熟悉 SQLModel | Task: 在 models.py 新增 User 表(id 用 uuid 字符串主键、email 唯一索引、password_hash、nickname、时间戳),照现有表范式;字段对齐 Supabase auth.users 以便日后迁移 | Restrictions: 保持 SQLite 锁定,不接 Supabase;不改现有 6 张表结构 | Success: init_db 幂等建出 users 表。标 [-] → log-implementation → [x]_

- [ ] B4. 新增 auth schemas
  - File: `apps/api/app/schemas/auth.py`
  - RegisterRequest / LoginRequest / AuthUser / AuthResponse(CamelModel)
  - Purpose: 鉴权端点请求/响应契约
  - _Leverage: `schemas/common.py`(CamelModel)_
  - _Requirements: 2.1, 2.3_
  - _Prompt: Role: Python 后端工程师 | Task: 新建 schemas/auth.py 定义注册/登录请求与 AuthUser/AuthResponse 响应,CamelModel 序列化 | Restrictions: password 仅入参不回显 | Success: 模型可被路由引用。标 [-] → log-implementation → [x]_

- [ ] B5. 新增 auth_service
  - File: `apps/api/app/services/auth_service.py`
  - `register`(唯一性校验+哈希+落库)/ `authenticate`(校验哈希)/ `get_user`
  - Purpose: 账号业务逻辑
  - _Leverage: `core/security.py`(B2)、`db/models.py` User(B3)、`db/database.py` engine_
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Prompt: Role: Python 后端工程师 | Task: 实现 auth_service:register 校验邮箱唯一(重复抛冲突)、哈希密码、生成 uuid、落库;authenticate 校验密码返回 User 或 None;get_user 按 id 取 | Restrictions: 登录失败不区分「无此用户/密码错」;不在 service 处理 HTTP | Success: 注册/登录/取用户行为正确。标 [-] → log-implementation → [x]_

- [ ] B6. 新增 auth 路由 + get_current_user_id 依赖
  - File: `apps/api/app/api/routes/auth.py`, `apps/api/app/main.py`
  - POST /auth/register、POST /auth/login、GET /auth/me;FastAPI 依赖 `get_current_user_id`(解 Bearer→user_id,无效抛 401);main.py 挂载 `/auth` 路由
  - Purpose: 暴露鉴权端点
  - _Leverage: `services/auth_service.py`(B5)、`core/security.py`(B2)、`schemas/auth.py`(B4)_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - _Prompt: Role: FastAPI 工程师 | Task: 新建 routes/auth.py 三个端点(注册/登录/me)签发并校验 JWT,实现 get_current_user_id 依赖,main.py 挂载 /auth;邮箱冲突→409、鉴权失败→统一 401 | Restrictions: 路由不写业务(转 service);错误不泄露账号存在性 | Success: /docs 可见三端点,注册→登录→/me 全通。标 [-] → log-implementation → [x]_

- [ ] B7. explore/interview 路由可选接入 user_id
  - File: `apps/api/app/api/routes/explore.py`, `apps/api/app/api/routes/interview.py`
  - 加**可选** `get_current_user_id` 依赖:带 token 用真实 id、不带回退 `DEV_USER_ID`,透传给 `mock_state.*`
  - Purpose: user_id 贯通且兼容未登录旧调用
  - _Leverage: `mock_state.*` 现有 user_id 形参、`get_current_user_id`(B6)_
  - _Requirements: 2.5_
  - _Prompt: Role: FastAPI 工程师 | Task: 给 explore/interview 路由加可选鉴权依赖,把解出的 user_id(无 token 时回退 DEV_USER_ID)透传给 mock_state 的 save_*/get_*;保持未登录调用仍可用 | Restrictions: 不一刀切要求登录;不改 mock_state 函数签名(已支持 user_id) | Success: 带 token 数据按真实 user_id 分区,不带 token 仍回退 dev-user。标 [-] → log-implementation → [x]_

- [ ] B8. 前端登录/注册屏 + 登录态
  - File: `apps/mobile/app/auth/*`(新增 login/register 屏), `apps/mobile/services/authApi.ts`(新增), `apps/mobile/store/useAppStore.ts`, `apps/mobile/app/(tabs)/me.tsx`, `apps/mobile/types/domain.ts`
  - 新增 authApi(register/login/me 调后端,需 EXPO_PUBLIC_API_URL)、store 存 authToken/currentUser、登录/注册屏、「我的」页昵称读 currentUser.nickname
  - Purpose: 端到端账号体验
  - _Leverage: `services/apiClient.ts`、`store/useAppStore.ts`、`components/ui/primitives.tsx`、`constants/theme.ts`_
  - _Requirements: 2.3, 2.5, 2.7_
  - _Prompt: Role: React Native/Expo 前端工程师 | Task: 新增 authApi 与登录/注册屏,登录后把 token+user 存 store(持久化),me.tsx 用真实昵称替换写死的 Archer;请求带 Bearer token | Restrictions: 用 theme token 不硬编码;后端不可达时给明确提示不崩;沿用 apiClient 错误解析 | Success: 注册→登录→「我的」显示真实昵称,typecheck 通过。标 [-] → log-implementation → [x]_

---

## Group C — 对话式追问「随回答而动」(Requirement 3)

- [ ] C1. 改前端追问 prompt(实际生效)
  - File: `apps/mobile/services/ai/prompts.ts`
  - `FOLLOWUP_SYSTEM_PROMPT` 加跑题/低信息/反问策略;`FOLLOWUP_JSON_EXAMPLE` 与 `buildFollowupJsonPrompt` 加 `reply` 承接语字段
  - Purpose: 让独立 App 的追问随回答而动
  - _Leverage: 现有 `buildFollowupJsonPrompt` / `FOLLOWUP_JSON_EXAMPLE`_
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Prompt: Role: Prompt 工程师,熟悉中文对话设计 | Task: 在 prompts.ts 的追问 system prompt 增加策略(跑题温和拉回/低信息换角度重问/反问先回应再引导),并在 JSON 示例与 builder 中加可空的 reply 承接语字段(≤30字);保持 JSON Output 要求(出现 "json" 字样) | Restrictions: 保留 6 轮上限与 done 语义;reply 必须可空;全中文 | Success: 示例含 reply,prompt 含三类策略。标 [-] → log-implementation → [x]_

- [ ] C2. 后端追问 prompt 同步对齐
  - File: `apps/api/app/utils/prompts.py`
  - `FOLLOWUP_SYSTEM_PROMPT` / `_FOLLOWUP_JSON_EXAMPLE` / `build_followup_json_prompt` 同步 C1 的策略与 reply 字段
  - Purpose: 保持前后端 prompt 对齐(后端日后接回时一致)
  - _Leverage: C1 的措辞_
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Prompt: Role: Python 后端工程师 | Task: 把 utils/prompts.py 的追问 prompt 与 JSON 示例同步成与前端 prompts.ts 一致(策略 + reply 字段) | Restrictions: 与前端措辞保持一致;不改其它 prompt | Success: 前后端追问 prompt 一致。标 [-] → log-implementation → [x]_

- [ ] C3. 前端解析 + 渲染承接语
  - File: `apps/mobile/services/ai/index.ts`, `apps/mobile/services/exploreApi.ts`, `apps/mobile/app/explore/followup.tsx`
  - `FollowupResponse` 加 `reply?: string`;`aiGenerateFollowup` 取出 reply 返回;followup 屏 AI 气泡渲染 reply(有则显示)
  - Purpose: 承接语端到端可见
  - _Leverage: 现有 `aiGenerateFollowup`、followup 屏 ChatMessage_
  - _Requirements: 3.4, 3.6, 3.7_
  - _Prompt: Role: React Native 前端工程师 | Task: 给 FollowupResponse 加可选 reply,aiGenerateFollowup 解析并返回 reply,followup.tsx 在问题气泡渲染承接语(缺失则只渲染问题);失败仍回退 mock 题库 | Restrictions: reply 缺失不得破坏现有渲染;保留 6 轮上限与 mock 回退 | Success: 答非所问时出现承接语,断网回退不卡死,typecheck 通过。标 [-] → log-implementation → [x]_

---

## 跨组验证

- [ ] V1. 整体回归与文档
  - File: (验证为主,必要时 `CLAUDE.md` 补注)
  - 后端 `/docs` 手验新端点;前端 `npm run typecheck`;按 design 的 E2E 清单手测三条主线;清理临时文件
  - Purpose: 确保三组协同、不回归
  - _Leverage: `apps/api/smoke_test.py`、`/docs`_
  - _Requirements: All_
  - _Prompt: Role: 全栈/QA 工程师 | Task: 跑通三条主线手测(多格式上传含 mp3 提示、注册登录贯通 user_id、追问随回答而动 + 承接语),后端 /docs 验证端点,前端 typecheck 通过,清理临时验证文件 | Restrictions: 不破坏现有 mock 回退链路;mp3 仍为桩 | Success: 三条主线均按 design 行为,typecheck 通过。标 [-] → log-implementation → [x]_
