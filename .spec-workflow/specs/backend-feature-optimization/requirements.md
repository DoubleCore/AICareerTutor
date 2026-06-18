# Requirements Document

## Introduction

本 spec 覆盖一轮后端功能优化,来自三条产品建议:

1. **用户注册/账号体系** —— 当前没有任何用户体系(后端写死 `DEV_USER_ID="dev-user"`,前端写死昵称 `Archer`)。
2. **对话式追问「随回答而动」** —— 已有多轮追问雏形,但完全不处理用户跑题、答非所问、反问、信息量过低的情况。
3. **面试材料多格式上传** —— 当前仅支持纯文本(web 端只读 `.txt`,真机要求粘贴),需支持 txt / md / pdf / docx / mp3,统一转成纯文本 `transcript` 后再分析。

### 关键前提:当前链路现状(决定每条功能落在哪)

移动端**已独立化**:`services/exploreApi.ts` / `interviewApi.ts` 注释明确「App 独立化后不再走后端」,追问、方向推荐、面试报告全部由 `services/ai/index.ts` **直连 DeepSeek**,数据落本地 zustand。后端 `apps/api` 那套链路目前**没有线上客户端调用**。

经与产品确认,本轮采用 **混合链路**:
- **文本类 AI 生成(追问、报告、方向推荐)继续在 App 内直连 DeepSeek**(属「文本」,打包后可独立运行)。
- **文件解析(pdf/docx/mp3)与账号体系走后端**(二进制/音频必须服务端;账号需鉴权)。

经与产品确认,账号采用 **SQLite + JWT,字段对齐 Supabase Auth**(现在不上 Supabase,遵守 `.claude/CLAUDE.md` 的「SQLite 锁定 / Supabase 后置」两条硬规矩;日后云端阶段平滑迁移)。

## Alignment with Product Vision

- 对应仓库阶段「P0 → 收集后端落地」:把后端从内存 mock 推进到真实数据收集与文件处理能力。
- 注册账号为未来「数据跟人走、跨设备同步」打地基(本轮只做身份,不做数据同步)。
- 多格式上传直接提升面试复盘主线的可用性(用户多数手里是录音/Word/PDF,而非现成纯文本)。

## Requirements

### Requirement 1 — 多格式面试材料上传(优先做)

**User Story:** 作为面试复盘用户,我希望能上传 txt / md / pdf / docx / mp3 等格式的面试材料,系统自动转成纯文本,这样我不必手动把内容复制粘贴成文字。

#### Acceptance Criteria

1. WHEN 用户上传 `.txt` 或 `.md` 文件 THEN App SHALL 在端上直接读为纯文本并填入 `transcript`(不经后端)。
2. WHEN 用户上传 `.pdf` 文件 THEN 后端 SHALL 通过解析端点抽取其文本并返回 `{ text }`。
3. WHEN 用户上传 `.docx` 文件 THEN 后端 SHALL 通过解析端点抽取其文本并返回 `{ text }`。
4. WHEN 用户上传 `.mp3` 文件 THEN 后端 SHALL 返回一个明确的「暂未支持语音转写」错误信封(本轮 mp3 仅留接口桩,不做真实 ASR)。
5. WHEN 解析端点收到不支持或无法识别的扩展名 THEN 后端 SHALL 返回 422 错误信封说明支持的格式。
6. IF 文件解析成功但抽取文本为空 THEN 后端 SHALL 返回明确错误(空内容),前端提示用户换文件或直接粘贴。
7. WHEN 任意文件解析或上传失败 THEN 前端 SHALL 保持现有「回退手动粘贴」路径,链路不中断。
8. WHEN 后端解析端点收到超过大小上限的文件 THEN 后端 SHALL 拒绝并返回明确错误(防止超大文件拖垮服务)。

### Requirement 2 — 用户注册 / 登录(云账号,SQLite + JWT)

**User Story:** 作为新用户,我希望能注册并登录一个账号,这样我的身份能被识别,为日后跨设备保存探索/面试记录打基础。

#### Acceptance Criteria

1. WHEN 用户提交注册(邮箱 + 密码 + 昵称)THEN 后端 SHALL 校验邮箱唯一性、对密码做哈希存储(绝不明文)、创建 `User` 记录。
2. IF 注册邮箱已存在 THEN 后端 SHALL 返回明确的「邮箱已注册」错误信封(409 或统一错误码)。
3. WHEN 用户用正确邮箱 + 密码登录 THEN 后端 SHALL 校验密码哈希并签发 JWT(含 `user_id`)。
4. IF 登录密码错误 THEN 后端 SHALL 返回统一的鉴权失败错误(不区分「用户不存在」与「密码错误」,避免账号枚举)。
5. WHEN 已登录请求携带有效 JWT THEN 后端 SHALL 从 token 解出 `user_id`,并以该 `user_id` 替代写死的 `DEV_USER_ID` 作为 explore/interview 各表的分区键。
6. IF 请求携带无效/过期 JWT THEN 后端 SHALL 返回 401。
7. WHEN 用户已登录 THEN App SHALL 在「我的」页显示真实昵称,替代写死的 `Archer`。
8. WHEN JWT 密钥配置缺失 THEN 后端 SHALL 拒绝启动或拒绝签发,绝不使用硬编码默认密钥(密钥只进 `.env`)。

> 范围边界:本轮只做「身份」(注册/登录/识别 user_id)。端上已生成数据(报告/路径)**同步回后端**不在本轮范围,作为后续独立工作。

### Requirement 3 — 对话式追问「随回答而动」(处理答非所问)

**User Story:** 作为正在做职业探索的用户,当我跑题、答非所问或反问时,我希望 AI 能像真人教练一样接住我的话再继续,而不是机械地抛下一个问题。

#### Acceptance Criteria

1. WHEN 用户的回答跑题或与当前问题无关 THEN AI 追问 SHALL 先温和拉回或换一种问法重问,而不是直接进入下一个新问题。
2. WHEN 用户的回答信息量过低(如「不知道」「随便」)THEN AI 追问 SHALL 换一个更具体、更易回答的角度重新提问。
3. WHEN 用户在回答里反问 AI THEN AI SHALL 先给一句简短回应,再自然地引导回探索追问。
4. WHEN AI 生成下一题 THEN 输出 SHALL 包含一个「承接语」字段(对用户上一句的简短回应),前端在追问气泡中渲染,使对话更连贯。
5. WHEN 已问满 6 轮 或 信息已足够 THEN AI SHALL 返回 `done=true` 并结束(沿用现有硬上限,防失控)。
6. WHEN AI 调用失败或超时 THEN 前端 SHALL 沿用现有本地 mock 题库回退,链路不卡死。
7. WHEN 「承接语」字段缺失或为空 THEN 前端 SHALL 正常渲染问题本身(承接语为可选增强,不破坏旧行为)。

## Non-Functional Requirements

### Code Architecture and Modularity

- **schema 即契约**:`apps/api/app/schemas/*.py` 改动需前后端对齐;前端 `types/domain.ts` 同步(camelCase ↔ snake_case 由服务封装层转换)。
- **解析层单一职责**:`file_service.py` 升级为 dispatch 层,每种格式一个 `extract_*` 纯函数,互不耦合;mp3 桩独立。
- **prompt 两处同步**:追问优化必须同时改前端 `services/ai/prompts.ts`(打包后实际生效的那份)与后端 `apps/api/app/utils/prompts.py`(保持对齐),否则只改后端对独立 App 无效。
- **回退不中断**:延续现有「真调成功返回 / 任何失败回退 mock」范式,所有新链路失败都要有兜底。

### Performance

- 文件解析端点对单文件大小设上限(建议 pdf/docx ≤ 10MB,后续可调),拒绝超限文件。
- 文本类 AI 生成继续在端上直连,不因本轮新增后端依赖而变慢。

### Security

- **密钥安全**:JWT secret、任何 AI/第三方 key 只进 `.env`(已被 `.gitignore` 忽略且被 settings deny 读取);`.env.example` 只放占位。
- 密码必须哈希存储(如 bcrypt/argon2),绝不明文或可逆加密。
- 鉴权失败信息不泄露账号是否存在(防枚举)。
- 解析端点不回显文件原始路径/服务器内部错误细节给客户端。
- App 内直连 DeepSeek 的 key 通过 `EXPO_PUBLIC_*` 注入,属已知的端上暴露风险(沿用现状,不在本轮扩大)。

### Reliability

- **SQLite 锁定**:数据层保持 SQLModel + 本地 SQLite,`db/supabase_client.py` 保持占位;新增 `User` 表照现有 `models.py` 范式落 SQLite。
- mp3 仅留接口桩(`NotImplementedError` / 明确错误信封),不埋假实现;ASR 选型与接入作为后续独立工作。
- 解析新增依赖(pdf/docx 库)用固定版本,延续 `requirements.txt` 锁版本约定。

### Usability

- 所有面向用户的新增文案均为简体中文。
- 上传屏需更新提示文案,反映新支持的格式;mp3 给出「暂未支持,敬请期待」的明确说明而非静默失败。
