# Tasks Document

> 分三组,建议按组顺序落地:**Group A 多格式上传 → Group B 账号 → Group C 追问优化**。三组相互独立,可分批审阅/实现。

---

## Group A — 多格式面试材料上传(Requirement 1,分治:PDF/DOCX 端上 + MP3 后端桩)

- [ ] A1. 新增前端解析依赖
  - File: `apps/mobile/package.json`
  - 加 `expo-pdf-text-extract`(PDF 原生模块)、`fflate`(DOCX 解 zip,纯 JS);确认 `expo-document-picker` 已在依赖
  - Purpose: 备好端上 PDF/DOCX 解析所需依赖
  - _Leverage: 现有 expo 依赖管理_
  - _Requirements: 1.2, 1.3_
  - _Prompt: Role: React Native/Expo 前端工程师 | Task: 在 apps/mobile 加 expo-pdf-text-extract 与 fflate(锁版本),确认 expo-document-picker 可用;expo-pdf-text-extract 是原生模块,记录其需 prebuild/EAS 不能在 Expo Go 测 | Restrictions: 不引入超出 PDF/DOCX 解析所需依赖;不动后端依赖 | Success: 依赖装好,typecheck 通过。先把本任务在 tasks.md 标为 [-],完成后用 log-implementation 记录,再标 [x]_

- [ ] A2. 新增前端端上解析层 services/fileExtract
  - File: `apps/mobile/services/fileExtract/index.ts`(新增)
  - `extractFileText(file)` 按扩展名分发:txt/md(FileReader 路径)、pdf(`extractPdf` 调原生模块)、docx(`extractDocx` 用 fflate 解 zip 取 word/document.xml 文本);返回 `ExtractOutcome`;原生模块缺失/空文本/不支持各自降级
  - Purpose: 端上 PDF/DOCX→文本核心逻辑,单一职责
  - _Leverage: 现有 upload.tsx 的 FileReader 读取逻辑(可抽取复用)_
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.9_
  - _Prompt: Role: React Native 前端工程师,熟悉文件解析 | Task: 新建 services/fileExtract/index.ts,实现 extractFileText 分发:txt/md 解码、pdf 用 expo-pdf-text-extract、docx 用 fflate 解压取 word/document.xml 正文;返回 ExtractOutcome 联合类型;捕获原生模块不可用(native_unavailable)、空文本(empty)、不支持(unsupported) | Restrictions: 不做端上 OCR;原生模块缺失要优雅降级不崩;纯函数不读写 store;全中文用户消息交给屏幕层 | Success: docx 样本能抽文本,空内容/缺模块返回对应 reason。标 [-] → log-implementation → [x]_

- [ ] A3. 后端 MP3 转写桩 + schema
  - File: `apps/api/app/services/file_service.py`, `apps/api/app/schemas/interview.py`, `apps/api/app/core/config.py`, `apps/api/.env.example`
  - `file_service.transcribe_audio(content, filename)` 抛 `NotImplementedError`;schemas 加 `TranscribeResponse`;config 加 `max_upload_mb: int = 25`;保留现有 `store_upload_metadata`
  - Purpose: MP3 后端契约与桩(先流出接口)
  - _Leverage: `core/errors.py`、`schemas/common.py`(CamelModel)、`core/config.py`_
  - _Requirements: 1.4, 1.8_
  - _Prompt: Role: Python 后端工程师 | Task: 在 file_service.py 加 transcribe_audio 桩(抛 NotImplementedError,中文消息),schemas/interview.py 加 TranscribeResponse,config 加 max_upload_mb,.env.example 补占位;保留 store_upload_metadata 不动 | Restrictions: 绝不埋假 ASR 实现;不做 PDF/DOCX(已移至端上) | Success: 桩可被路由引用,config 可读。标 [-] → log-implementation → [x]_

- [ ] A4. 新增 POST /interview/transcribe 路由
  - File: `apps/api/app/api/routes/interview.py`
  - 接收 `UploadFile`(.mp3),校验大小(max_upload_mb)→ 调 `file_service.transcribe_audio`;`NotImplementedError`→501、超大→413/422
  - Purpose: 暴露 MP3 转写端点(本轮返回 501)
  - _Leverage: `services/file_service.py`(A3)、`schemas/interview.py`(A3)、`core/errors.py`_
  - _Requirements: 1.4, 1.8_
  - _Prompt: Role: FastAPI 路由工程师 | Task: 在 routes/interview.py 新增 POST /interview/transcribe(multipart UploadFile),大小校验后调 transcribe_audio,NotImplementedError 映射 501 + 明确文案,超大映射 413/422;路由不含业务逻辑 | Restrictions: 错误不回显服务器内部细节;沿用 register_exception_handlers 风格 | Success: /docs 可见端点,上传 mp3 得 501 错误信封。标 [-] → log-implementation → [x]_

- [ ] A5. 前端上传屏接入分治解析
  - File: `apps/mobile/app/interview/upload.tsx`, `apps/mobile/services/interviewApi.ts`
  - 扩展文件选择(accept 加 pdf/docx/mp3,真机用 expo-document-picker);txt/md/pdf/docx 走 `extractFileText` 端上拿文本填 transcript;mp3 走新增 `interviewApi.transcribeAudio()`(POST 后端,需 `EXPO_PUBLIC_API_URL`);按 ExtractOutcome.reason 显示对应中文提示;任何失败回退手动粘贴
  - Purpose: 端到端打通分治上传
  - _Leverage: `services/fileExtract`(A2)、`services/apiClient.ts`、现有 `useFilePicker`_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9_
  - _Prompt: Role: React Native/Expo 前端工程师 | Task: 在 upload.tsx 扩展文件选择(pdf/docx/mp3,真机接 expo-document-picker),txt/md/pdf/docx 调 fileExtract.extractFileText 端上解析填 transcript,mp3 调 interviewApi.transcribeAudio 走后端(501 时明确提示);按 reason(unsupported/empty/native_unavailable/backend_unsupported)给不同中文提示;任何失败回退现有手动粘贴;用 theme token | Restrictions: 不破坏现有 txt 端上读取与回退;baseUrl 缺失时 mp3 优雅降级;Expo Go/web 选 pdf 给降级提示不崩 | Success: 正式构建选 pdf/docx 能回填文本走完复盘,mp3 有明确提示,typecheck 通过。标 [-] → log-implementation → [x]_

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
  - 后端 `/docs` 手验 MP3 端点(返回 501);前端 `npm run typecheck`;按 design 的 E2E 清单手测三条主线(PDF/DOCX 端上解析需正式构建);清理临时文件
  - Purpose: 确保三组协同、不回归
  - _Leverage: `apps/api/smoke_test.py`、`/docs`_
  - _Requirements: All_
  - _Prompt: Role: 全栈/QA 工程师 | Task: 跑通三条主线手测(PDF/DOCX 端上解析 + mp3 后端 501 提示、注册登录贯通 user_id、追问随回答而动 + 承接语),后端 /docs 验证 transcribe 端点,前端 typecheck 通过,清理临时验证文件 | Restrictions: 不破坏现有 mock 回退链路;mp3 仍为桩;PDF 端上解析需 prebuild/EAS 构建验证 | Success: 三条主线均按 design 行为,typecheck 通过。标 [-] → log-implementation → [x]_
