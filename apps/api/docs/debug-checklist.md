# 后端联调验收记录

按计划「自测验收总框架」(L1 后端自测 / L2 文档 / L3 接口 / L4 前端联调 / L5 回归)逐任务记录。

---

## P1-04 上传做实(文本)

- **分支**:`claude/determined-swanson-f93884`
- **改动文件**:
  - `app/services/mock_state.py`:新增 `SESSIONS` dict + `_SESSION_COUNTER`;`upload_interview` 生成唯一 `session-N` 并存内容;`get_report` 按 sessionId 回填 `jobTitle` 进标题,未知 session 回退 `LATEST_UPLOAD`。
  - `app/api/routes/interview.py`:`/upload` 对空 transcript 返回 422(统一错误信封)。
  - `apps/mobile/app/interview/upload.tsx`:点「开始生成」真实调 `uploadInterview`,拿 sessionId 透传到 analyzing;失败回退 mock-session。
  - `apps/mobile/app/interview/analyzing.tsx`:读 sessionId param,触发 `analyzeInterview`,动画与分析双满足后带 sessionId 跳 overview。
  - `apps/mobile/app/interview/overview.tsx`:按 param sessionId 拉报告(不再写死 mock-session)。
- **启动命令**:`uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- **测试接口**:`POST /interview/upload` → `GET /interview/overview/{sessionId}`
- **成功返回**:
  - upload → `{"sessionId":"session-1","status":"uploaded"}`(唯一,不再硬编码)
  - 自定义 jobTitle「数据分析师」上传 → overview 标题回填为「数据分析师一面」
  - 两次上传 sessionId 不同(`session-1`/`session-2`),互不覆盖
- **失败情况**:
  - 空 transcript(`"   "`)→ `422 {"error":{"code":"http_error","message":"面试转写文本不能为空"}}`
  - 未知 sessionId → 回退默认,200 不崩(对 `profile.py` 无参调用安全)
- **前端验证页面**:上传页提交 → analyzing(真实 analyze)→ overview(按 sessionId 取真实报告)
- **校验结果**:
  - L1 `python smoke_test.py interview` → PASS=7 FAIL=0
  - 针对性脚本:sessionId 唯一性 / 标题回填 / 未覆盖 / 回退 / 422 全部正确
  - 前端 `npx tsc --noEmit` → EXIT:0
  - L5 `python smoke_test.py all` → PASS=16 FAIL=0(回归无破坏)
- **是否通过**:✅ 通过

---

## P1-05 LLM 报告(mock/real 双模式)

- **分支**:`claude/determined-swanson-f93884`
- **目标**:把 `ai_service.analyze_interview` 从「只转发 mock」改造成**配置驱动的双模式**。默认 `mock`(零依赖零密钥,演示/CI 安全);`AI_MODE=real` 且配了 `AI_API_KEY` 时走真实 Claude 结构化输出,按 `InterviewReport` schema 产出。**任何前置缺失或调用失败一律回退 mock**,链路不中断。接缝锁在 `ai_service.py`,不跑 `/new-sdk-app`。
- **改动文件**:
  - `app/core/config.py`:新增 `ai_mode: Literal["mock","real"]="mock"`、`ai_model` 默认 `claude-sonnet-4-6`、`ai_max_tokens=2000`。
  - `app/utils/prompts.py`:补面试复盘真实 `INTERVIEW_SYSTEM_PROMPT`(中文、资深面试官+教练设定)+ `build_interview_user_prompt()` 拼接本次上传内容。
  - `app/services/ai_service.py`:`analyze_interview` 按 `ai_mode` 分发;`_real_interview_report` 用 Anthropic tool-use(`tool_choice` 强制)按手写 camelCase JSON Schema 约束输出;`anthropic` 仅在 real 分支内**延迟导入**;sessionId 服务端权威回填、title 兜底。
  - `requirements.txt`:加 `anthropic>=0.40.0`(real 模式需要,mock 不依赖)。
  - `.env.example`:AI 段补 `AI_MODE` / `AI_MAX_TOKENS` 与双模式说明(占位,无真实密钥)。
- **密钥安全**:真实 key 只进本地 `.env`(gitignore + settings deny),提交文件里无任何密钥。
- **启动命令**:`uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`(默认 mock);real 模式在 `.env` 设 `AI_MODE=real` + `AI_API_KEY=...`。
- **测试接口**:`POST /interview/analyze?session_id=...` → `GET /interview/overview/{sessionId}`
- **校验结果**:
  - L1 `import app.main` OK,`settings.ai_mode=mock`(默认安全)
  - 双模式分发针对性验证(monkeypatch settings,无需真 key):
    - real + 无 key → 回退 mock(`AI产品经理一面` pass=62),不崩
    - mock → 正常
    - real + 假 key → 真实调用失败 → 回退 mock,不崩
  - real 路径 payload 校验:模拟 LLM 返回的 camelCase dict + sessionId 回填 → `InterviewReport.model_validate` 通过,序列化键为 camelCase
  - L5 `python smoke_test.py interview` → PASS=7;`all` → PASS=16 FAIL=0(mock 模式行为与 P1-04 完全一致,零回归)
- **前端**:无改动 —— 纯后端任务,前端仍走同一 sessionId 链路;mock 模式对前端透明。
- **未做(留后续)**:真实 key 的端到端联调(需用户在本地 `.env` 配 key 后自测)、analysis 接口的 real 模式(本任务只做 report)。
- **是否通过**:✅ 通过(mock 全绿;real 分发逻辑与回退已验证,真实出参待用户配 key 联调)

---

## P1-06 报告读取(按 sessionId,缓存不重生成)

- **分支**:`claude/determined-swanson-f93884`
- **目标**:把报告从「每次 GET 重新拼装」改成「生成一次、按 sessionId 缓存、读操作只读缓存」。修掉 P1-05 的隐患:real 模式下 `/overview` 每次刷新都会重新烧一次 LLM。同时把 `/overview` 收回到 `ai_service` 这一层(此前直接调 `mock_state`,绕过了 service 分层)。
- **改动文件**:
  - `app/services/mock_state.py`:新增 `REPORTS: dict[str, InterviewReport]` 缓存;原 `get_report` 的构造逻辑拆成 `build_mock_report`(纯构造,不读缓存);新增 `save_report`(写缓存);`get_report` 改为**读缓存优先、未命中回退 `build_mock_report`**。
  - `app/services/ai_service.py`:`analyze_interview` 的 mock/real/回退三条分支统一改为 `save_report(build_mock_report(...))` 或 `save_report(real_report)` —— 生成成功即入缓存;新增 `get_interview_report`(纯读,转发 `mock_state.get_report`)。
  - `app/api/routes/interview.py`:`/overview/{session_id}` 改为经 `ai_service.get_interview_report`(纯读,不再直接调 `mock_state`,绝不触发 real LLM)。
- **写/读分离语义**:
  - `/analyze`(写,可能 real)→ 生成 + `save_report` 入缓存。
  - `/overview`(读)→ 命中缓存直接返回;未命中回退构造 mock,**不烧 LLM**。
  - `profile.py` 无参 `get_report()` → 行为不变(`mock-session` 兜底)。
- **启动命令**:`uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- **测试接口**:`POST /interview/analyze?session_id=...` → `GET /interview/overview/{sessionId}`
- **校验结果**:
  - L1 import OK;TestClient 针对性验证:
    - upload→analyze 后 `sid in REPORTS == True`(已缓存)
    - 篡改缓存 title 为 `CACHED-MARKER`,再 GET overview 读到该值 → **证明读缓存不重拼**(real 模式即不重复烧 LLM)
    - 未 analyze 的未知 session → overview 回退构造 mock,不崩
    - profile `/home` 无参取报告仍正常
    - real + 无 key → 回退 mock **且写进缓存**(`cached? True`)
  - L5 `python smoke_test.py all` → PASS=16 FAIL=0(零回归)
- **前端**:无改动 —— 纯后端任务,sessionId 链路不变;对前端透明(读到的报告与之前一致,只是不再每次重生成)。
- **未做(留后续)**:报告落库持久化(进缓存仍是进程内内存,重启清空 —— 等 P1-08 SQLite);analysis 接口的 real 模式与缓存(仍纯 mock,且每次重拼,可在后续单独做)。
- **是否通过**:✅ 通过

---

## AI-DeepSeek 接入(OpenAI 兼容 provider + 真实端到端联调)

- **分支**:`claude/determined-swanson-f93884`
- **目标**:把 real 模式从「写死 Anthropic」扩成**按 `ai_provider` 分发**,新增 `openai` 分支以接入 **DeepSeek**(官方、合规、允许服务端调用、OpenAI 协议兼容)。用真实 key 端到端验证报告能真出参,且 mock 默认与回退链路零破坏。
- **为什么不接讯飞 Coding Plan / PackyAPI**:两者均为「编程工具交互式场景」用途,ToS **明令禁止自建后端/服务端调用**(违规封号),PackyAPI 多为逆向号池,数据安全无保障。DeepSeek 官方 API 是唯一干净的服务端调用路径。
- **改动文件**:
  - `app/core/config.py`:新增 `ai_provider`(anthropic/openai)、`ai_base_url`(openai 用,DeepSeek 填 `https://api.deepseek.com`)。
  - `app/services/ai_service.py`:`_real_interview_report` 按 provider 分发;拆出 `_anthropic_report_payload`(tool-use)与 `_openai_report_payload`;两者产出同一份 camelCase payload 后统一回填 sessionId/title。
  - `app/utils/prompts.py`:新增 `build_interview_json_prompt` + JSON 结构示例(JSON Output 模式需 prompt 含 "json" 字样并给示例)。
  - `requirements.txt`:加 `openai>=1.40.0`。
  - `.env.example`:AI 段补 `AI_PROVIDER`/`AI_BASE_URL` 双 provider 说明 + DeepSeek 接入示例(占位,无密钥)。
- **关键技术决策(踩坑后定的)**:DeepSeek V4(`deepseek-v4-pro`/`flash`)**默认思考模式**,在 OpenAI `/v1` 端点**拒绝一切强制 `tool_choice`**(官方 issue #1376,实测报 `400 Thinking mode does not support this tool_choice`)。故 openai 分支**不用 function calling**,改用 **JSON Output 模式**(`response_format={"type":"json_object"}`)—— 思考模型完整支持,模型把 JSON 写进 `message.content`,`json.loads` 解析。anthropic 分支仍走 tool-use 不变。
- **密钥安全**:真实 key 只写进本地 `.env`(已确认 `git check-ignore` 命中 + `git status` 不可见),提交文件零密钥。临时写 `.env` 的脚本用完即删。
- **校验结果**:
  - 分发三路径(monkeypatch):mock 正常;real+openai+无key→回退;real+openai+假key→真实 **401**→回退(证明真连到了 DeepSeek 端点);openai payload(JSON 字符串)解析+校验通过。
  - **真实端到端**(本地 `.env` 配真 key,model=`deepseek-v4-pro`):上传含细节的转写 → analyze → 真实报告。判定为真出参而非 mock:`passPossibility=45`/`passLevel=低`(mock 固定 62/中);`coreProblems` 精准复述转写细节;`priorityTasks.id` 为模型新造(`star-method`/`quantify-metrics`,非 mock 固定 id)。
  - L5 `python smoke_test.py all` → PASS=16 FAIL=0(mock 默认零回归)。
- **前端**:无改动 —— provider 切换对前端透明,仍走同一 sessionId 链路。
- **未做(留后续)**:`/analysis` 接口尚未接 real(仍纯 mock);explore 流的 real(可复用此 provider 分发接缝);报告落库待 P1-08。
- **是否通过**:✅ 通过(DeepSeek 真实出参已验证;mock 默认 + 回退零破坏)

---

## 方案C 异步生成 + 轮询(让真实 AI 报告在前端可见)

- **分支**:`claude/determined-swanson-f93884`
- **触发**:首次端到端联调(Expo web + Playwright)发现真 bug —— 前端演示**永远只看到 mock 报告**。根因:`analyzing.tsx` 阻塞式调 `/analyze`(real 模式真调 DeepSeek 15~24s)被 `apiClient` 的 12s 超时掐断(`net::ERR_ABORTED`);随即跳 overview 只 GET 一次,此时后端还没算完 → 缓存空 → 回退 mock。后端线程其实十几秒后才把真报告入缓存,但前端早跳过去了。curl 无超时所以之前能拿到真报告,前端有。**第二个问题**:overview 任务区渲染的是本地 store `trainingTasks` 而非报告的 `priorityTasks`,即便报告是真 AI 也恒显示 mock 任务。
- **方案**:同步阻塞 → **异步生成 + 前端轮询**。`/analyze` 立即返回 `generating` 并把生成丢后台线程;前端 analyzing 页每 2s 轮询 `/status`,`ready` 才跳 overview。读 overview 必命中真报告。
- **改动文件**:
  - `app/schemas/interview.py`:新增 `AnalysisStatusResponse(session_id, status)`。
  - `app/services/mock_state.py`:新增 `REPORT_STATUS` dict + `set_report_status` / `get_report_status`(未知 session 命中 `REPORTS` 返回 `ready`,否则 `idle`)。
  - `app/services/ai_service.py`:`analyze_interview` 拆成 `run_analysis`(阻塞全量生成 + 末尾置 `ready`,供 BackgroundTask 调)、`_generate_report`(原 mock/real/回退三分支)、`get_analysis_status`(转发)。`get_interview_report` 纯读不变。
  - `app/api/routes/interview.py`:`/analyze` 改 `BackgroundTasks` —— 先 `set_report_status(generating)` → `add_task(run_analysis)` → 立即返回 `AnalysisStatusResponse`;新增 `GET /status/{session_id}`。
  - `apps/mobile/services/interviewApi.ts`:`analyzeInterview` 返回 `AnalysisStatusResponse`;新增 `getAnalysisStatus` + 类型。
  - `apps/mobile/app/interview/analyzing.tsx`:单次 analyze → kick off + 每 2s 轮询(上限 90s),`ready`/失败/超时都跳 overview;保留 ≥10s 最小动画;卸载 cleanup。
  - `apps/mobile/app/interview/overview.tsx`:任务区从 store `trainingTasks` 改读 `interviewReport.priorityTasks`,本地 `useState` 承接点击切换(apiReport 到达后 effect 同步);持久化留给 P1-07。
- **校验结果**:
  - 后端 TestClient(mock):analyze→`generating`;BackgroundTask 跑完→`ready`;overview 命中缓存;未触发 session→`idle`。
  - 后端 curl(real,`deepseek-v4-pro`):analyze **7ms** 秒回 generating;轮询 4s→ready;overview `passPossibility=40`(非 62,真 AI)。
  - 前端 `npm run typecheck` → EXIT 0。
  - **端到端(Playwright web,real)**:填"短视频推荐系统冷启动"转写 → analyzing 轮询约 24s → overview **显示真实 DeepSeek 报告**:52%/中(非 mock 62);核心问题精准复述("AB实验分组/显著性检验说不清""新用户无数据只说参考热门");任务区为 AI 任务("AB实验设计专项""冷启动用户分层策略");任务点击未开始→进行中切换正常。
  - L5 `python smoke_test.py all` → PASS=16 FAIL=0(mock 默认零回归;TestClient 等 BackgroundTask 跑完再返回,smoke 无破坏)。
- **踩坑**:旧后端进程(real 模式)未随 TaskStop 真正退出,仍占 8000 端口,导致新代码起不来、答请求的是旧进程(analyze 仍同步、`/status` 404)。`netstat` 定位 PID → `taskkill //F` 释放端口后重启,新代码生效。
- **未做(留后续)**:`/analysis` 接口仍纯 mock 未接 real;explore 流 real;报告 + 训练任务状态落库待 P1-08 / P1-07(当前 overview 任务点击是本地 state,刷新重置)。
- **是否通过**:✅ 通过(前端首次看到真实 AI 报告;mock 默认 + 回退零破坏)

---

## P1-08 SQLite 落库(面试链路持久化)

- **分支**:`claude/determined-swanson-f93884`
- **目标**:把面试链路的三块进程内 dict(`SESSIONS`/`REPORTS`/`REPORT_STATUS`)落进**本地 SQLite**,数据跨重启存活 —— 修掉「uvicorn `--reload` 一重启真实 AI 报告就没了、演示中途重启即丢档」。用 **SQLModel + 本地 SQLite**(CLAUDE.md 锁定数据层),`db/supabase_client.py` 保持占位,不碰云端。
- **两个已敲定决策**:① **报告 JSON 整列存**(`InterviewReport` 深度嵌套,`model_dump_json()` 进一个 TEXT 列,不拆嵌套表;将来迁 Postgres 平滑切 JSONB)。② **训练任务状态持久化分开**留给 P1-07(本次 `priorityTasks` 仍随 `report_json` 只读持久化;overview 点击仍本地 state、刷新重置)。
- **关键现状发现**:`app/db/`(`database.py` engine/init_db/get_session、`models.py` 的 `ExploreProfileRecord`)是 commit `b29c540` 的**死代码脚手架** —— 在 `app/db/` 外零调用点,`main.py` 不调 `init_db`,无 db 文件。P1-08 是**第一次把 SQLite 真正接进运行链路**。故:`models.py` 保留 `ExploreProfileRecord` 只追加面试表;`database.py` 从硬编码路径改为读 `settings.database_url`(否则 smoke 环境变量隔离无效)。
- **改动文件**:
  - `requirements.txt`:加 `sqlmodel>=0.0.16`(自带 SQLAlchemy,兼容 pydantic v2)。
  - `app/core/config.py`:新增 `database_url`,默认**绝对路径**(`_APPS_API_DIR / career_tutor.db`,锚定 apps/api,不随 cwd 漂移),可被 `.env` 的 `DATABASE_URL` 覆盖。
  - `app/db/database.py`:engine 改读 `settings.database_url`;`check_same_thread=False`(/analyze 的 BackgroundTask 在线程池另一线程写库)。
  - `app/db/models.py`:**追加** `InterviewSessionRow`(5 扁平字段)+ `ReportRow`(`status` + `report_json` 整列,同表同生命周期)。
  - `app/services/mock_state.py`:删 `SESSIONS`/`_SESSION_COUNTER` dict/`REPORTS`/`REPORT_STATUS`;`upload_interview`/`get_upload`(新增)/`build_mock_report`/`save_report`/`get_report`/`set_report_status`/`get_report_status` 全改 DB(短生命周期 `with Session(engine)`);新增 `_seed_session_counter`(从 DB 现有 `session-N` 最大后缀回灌,跨重启不撞号)。
  - `app/services/ai_service.py`:`_real_interview_report` 里 `mock_state.SESSIONS.get(...)` → `mock_state.get_upload(...)`(唯一外部引用)。
  - `app/main.py`:`lifespan` 启动时 `init_db()` + `mock_state._seed_session_counter()`,日志加 db 路径。
  - `smoke_test.py`:导入 app **前** `os.environ.setdefault("DATABASE_URL", "sqlite:///./_smoke_test.db")` 隔离;导入后显式 `init_db()`(TestClient 不走 lifespan);末尾 `engine.dispose()` 后删临时库(含 -journal/-wal/-shm)。
  - `.gitignore`:补 `*.db`/`*.db-journal`/`*.db-wal`/`*.db-shm`/`*.sqlite`/`*.sqlite3`。
- **踩坑**:① venv 缺 `pydantic_settings`(环境漂移),`pip install -r requirements.txt` 未补上,显式 `pip install pydantic-settings` 才好。② smoke 首跑临时库残留 —— SQLite 连接池未关,Windows 文件被占用 `os.remove` 静默失败;删库前加 `engine.dispose()` 修复。
- **校验结果**:
  - L1:`import app.main` OK;`init_db()` 建三表(`explore_profile`/`interview_sessions`/`interview_reports`);`DATABASE_URL` 覆盖生效;空库 seed_counter=0。
  - TestClient 针对性(临时库,mock):upload→`session-1`;analyze→`generating`;status→`ready`;overview 标题回填「数据分析师一面」;未知 session→status `idle`+overview 回退 mock 不崩;**DB 行真实落库**(session row 存在、report row status=ready 且 report_json 非空)。
  - **持久化铁证(跨进程重启)**:进程A upload+analyze 写 `_persist.db` 后退出 → **全新进程B** 重开同库:seed_counter 回灌=1、读 session-1 报告与A一致、status=ready 也持久化、新上传拿 session-2 不撞号。**内存态绝做不到这点**。
  - L5 回归:`python smoke_test.py all` → PASS=16 FAIL=0(临时库跑完自删、开发库零污染;mock 行为不变)。
  - 前端:无改动;`npm run typecheck` → EXIT 0。
- **线程/并发**:`check_same_thread=False` + 每函数短生命周期 `Session`。SQLite 单写,高并发可能 "database is locked";P0 单用户演示无碍 —— 与现有「非并发安全」设计一致。
- **未做(留后续)**:训练任务按 session 状态持久化(P1-07);explore 链路落库(`ExploreProfileRecord` 仍是脚手架未接);`/analysis` 仍纯 mock;`supabase_client.py` 占位(云端阶段)。
- **是否通过**:✅ 通过(跨重启持久化已铁证;mock 默认 + smoke 隔离零破坏)

---

## P1-07 训练任务状态按 session 持久化

- **分支**:`claude/determined-swanson-f93884`
- **目标**:把训练任务的完成状态落库,修掉 overview 页「点击切换任务状态、刷新即重置」。承接 P1-08。
- **关键现状发现**:训练任务在**四处各存一份、互不同步**:① 后端全局 `TRAINING_TASKS` 列表(`GET /training/{session_id}` **忽略 session_id** 直接返回它,`PATCH` 在它上面就地改 —— 所有 session 共用一份);② 报告 `priority_tasks`(随 `report_json` 只读落库);③ 前端 store `trainingTasks`(mockData);④ overview 本地 `useState`(点击只改本地、**不调任何 API**)。且前端 `interviewApi.ts` 的 `getTrainingTasks`/`updateTrainingTask` 定义了但从未被调用。
- **两个已敲定决策**:① **overview 页闭环**(只接 overview;`training.tsx`/底部 tab 仍走 store mock,统一留后续)。② **PATCH 路径带 session**(`PATCH /training/{session_id}/task/{task_id}` —— mock 模式下多 session 共用同组 task_id,不带 session 会跨 session 撞状态)。
- **设计**:延续 P1-08「report_json 只读」—— **不改写报告 JSON**,新建独立状态表,读时叠加。任务**清单**(id/title/description)来自报告 `priority_tasks`(只读);任务**状态**来自新表(可写)。读 overview/training 时对每个 priorityTask 查状态表覆盖 status(未命中用报告里的初始 status)。
- **改动文件**:
  - `app/db/models.py`:**追加** `TrainingTaskStatusRow`(复合主键 `(session_id, task_id)` + `status` 列)。保留既有三表只追加。
  - `app/services/mock_state.py`:`update_training_task` 签名改 `(session_id, task_id, status)` —— 先从该 session 报告 `priority_tasks` 校验 task 存在(不存在返 `None`→404),upsert `TrainingTaskStatusRow`,返回该 task(status 用新值,`model_copy(update=...)`);**新增** `get_training_tasks(session_id)`(取报告 priorityTasks + 叠加状态)、`_apply_task_status(session_id, tasks)` 私有助手(查该 session 全部状态行 → dict 覆盖)。`TRAINING_TASKS` 全局列表仍作为 mock 报告清单来源保留(`build_mock_report` 用),只是不再被就地改写。
  - `app/api/routes/interview.py`:`GET /training/{session_id}` 改调 `get_training_tasks`;`PATCH` 路径加 `{session_id}` 段,传 `(session_id, task_id, status)`,`None`→404。
  - `apps/mobile/services/interviewApi.ts`:`updateTrainingTask` 加 `sessionId` 参数 + 路径段。
  - `apps/mobile/app/interview/overview.tsx`:`cycleTaskStatus` 改乐观更新(保留交互手感)+ 真调 `updateTrainingTask(session, taskId, target)`,失败回滚 + `console.warn`(对齐本页「失败回退本地」风格)。
  - `smoke_test.py`:interview 用例 PATCH 路径改 `/interview/training/{sid}/task/{task_id}`(旧路径加了 session 段会 404)。
- **踩坑**:针对性脚本里取 sessionId 误用 `session_id` 键(响应是 camelCase `sessionId`,smoke 靠 try/except 静默回退 mock-session 才没暴露 —— latent,非本次范围),改 `sessionId`;手写脚本未调 `_seed_session_counter()` 且复用了上次残留临时库 → `UNIQUE constraint failed: session-1` 撞号,清残留 + 显式 seed 后通过。
- **校验结果**:
  - L1:`import app.main` OK;`init_db()` 建出 `training_task_status` 表(连同既有三表),复合主键 `(session_id, task_id)` 正确。
  - TestClient 针对性(临时库,mock):upload→analyze→`GET /training/{sid}` 返回报告 priorityTasks(status 初值);`PATCH {sid}/task/quantify-result`→已完成,再 GET 该 task 已完成(**状态叠加生效**);**跨 session 隔离铁证** —— session-1 改 `quantify-result`,session-2 同名 task_id 仍是初值「未开始」;未知 task_id→**404**。
  - **持久化铁证(跨进程重启)**:进程A `PATCH quantify-result→已完成` 写 `_persist07.db` 后退出 → **全新进程B** 重开同库 `GET /training/session-1` 仍读到该 task=已完成。**内存态做不到**。
  - L5 回归:`python smoke_test.py all` → PASS=16 FAIL=0(新 PATCH 路径 `/interview/training/mock-session/task/quantify-result` 走通;临时库自删、开发库零污染)。
  - 前端:`npm run typecheck` → EXIT 0。
- **兜底**:未 analyze 的 session(无报告)→ `get_report` 回退 `build_mock_report`,priorityTasks 是 mock 三任务 —— `get_training_tasks` 仍能返回、PATCH 能命中,状态照常落库(即便 mock 报告也能记状态,行为合理)。
- **线程/并发**:沿用 P1-08(每函数短生命周期 `Session(engine)`,`check_same_thread=False`)。
- **未做(留后续)**:`training.tsx`/底部 tab/store `trainingTasks` 仍走 store mock(统一接后端是更大工程);explore 链路落库;`/analysis` 接 real;`supabase_client.py` 占位。
- **是否通过**:✅ 通过(状态叠加 + 跨 session 隔离 + 跨重启持久化均铁证;mock 默认 + smoke 零破坏)

---

## P1-09 /analysis 接 real AI(后端做实 + 缓存 + 接前端)

- **分支**:`claude/determined-swanson-f93884`
- **目标**:把面试链路最后一块纯 mock —— 深入分析(`/analysis`,逻辑/STAR/面试官追问/风险四维)—— 抬到和报告同水位。改造前:后端 `generate_interview_analysis(session_id)` 直接转发 `mock_state.get_analysis()`(**无参、忽略 session、每次 GET 重构造固定 mock、不缓存、绝不调 LLM**);前端 `analysis.tsx` **根本不调后端**,直接 `import { interviewAnalysis } from "@/data/mockData"` 渲染静态 mock(`getInterviewAnalysis` 定义了全项目无人调)。
- **两个已敲定决策(AskUserQuestion)**:① 前端范围 = **后端 + 接前端**(analysis.tsx 接上,闭环);② 生成时机 = **随报告后台生成**(惰性首次 GET 同步阻塞 ~20s 会超前端 12s 超时,故挂进 `run_analysis` 后台任务)。
- **设计**:最大化复用报告侧 P1-05/06/08 接缝,不发明新模式。analysis 缓存**复用 `ReportRow`、追加 `analysis_json` 列**(不新建表)—— analysis 与 report 同一次 analyze 的两个产物、同 session 同生命周期(一起 generating→一起 ready),拆表只增跨表一致性协调;延续「嵌套结构整列存 JSON」。
- **改动文件**:
  - `app/db/models.py`:`ReportRow` 追加 `analysis_json: str | None = None`(默认空,老行/未生成回退 mock)。
  - `app/utils/prompts.py`:新增 `ANALYSIS_SYSTEM_PROMPT`(四维拆解、status 取较强/一般/偏弱)+ `build_analysis_user_prompt`(anthropic)+ `build_analysis_json_prompt`(openai,附 `_ANALYSIS_JSON_EXAMPLE`)。
  - `app/services/mock_state.py`:`get_analysis()` 固定构造改名 `build_mock_analysis()`(纯构造);新增 `save_analysis(session_id, analysis)`(写 `analysis_json`,不动 status/report_json)、`get_analysis(session_id)`(改签名:读缓存、未命中回退 mock,纯读)。
  - `app/services/ai_service.py`:`run_analysis` 在 `_generate_report` 后接 `_generate_analysis` 再置 ready;新增 `_generate_analysis`(对称三分支)、`_real_interview_analysis`(provider 分发)、`_anthropic_analysis_payload`(tool-use + `_interview_analysis_input_schema`)、`_openai_analysis_payload`(JSON Output);`generate_interview_analysis` 改纯读 `get_analysis(session_id)`。复用 `_extract_tool_input`。
  - `apps/mobile/app/interview/overview.tsx`:「查看深入分析」跳转透传 `?sessionId=`。
  - `apps/mobile/app/interview/analysis.tsx`:按 sessionId 拉 `getInterviewAnalysis`(失败回退 mockData);四 panel(Logic/Star/Interviewer/Risk)由闭包引用模块级 mock 改为**接收 `analysis` prop**;样式/展示组件全不动。
- **路由**:`/analysis/{session_id}` 签名不变(内部转纯读)。
- **关键发现**:worktree `apps/api/.env` 存在(用户为早前 real 联调配的 DeepSeek key,`AI_PROVIDER=openai`),venv 缺 `openai` 模块 → real 分支抛 `No module named 'openai'` → 回退 mock。这恰好验证了**回退链路**(报告 + 分析都回退、不阻塞 ready),所有 mock 验证仍成立。`.env` 已 `git check-ignore` 命中,不提交。
- **校验结果**:
  - L1:`import app.main` OK;`init_db()` 后 `interview_reports` 列 = `[session_id, status, report_json, analysis_json]`(新列已建),4 表齐全。
  - TestClient 针对性(临时库,mock)**8/8 通过**:analyze→ready;GET analysis 返回四维 + DB `analysis_json` 非空;**缓存不重生成铁证**(篡改缓存 `logic[0].title=CACHED-MARKER`,再 GET 读到该值 → 纯读未重构造);未知 session 回退 mock 不崩;real+无key 回退 mock **且写进缓存**。
  - **跨进程重启铁证**:进程A upload+analyze 写 `_persist09.db` 退出 → 全新进程B 重开同库 `GET /analysis/session-1` 仍 200、logic 非空(内存态做不到)。
  - L5:`python smoke_test.py all` → **PASS=16 FAIL=0**(`/interview/analysis/mock-session` 返回四维分析;零回归)。
  - 前端:`npm run typecheck` → **EXIT 0**。
- **收尾**:删开发库 `career_tutor.db`(SQLite 无迁移,老库缺 `analysis_json` 列 —— P0 演示数据可丢,下次 uvicorn 启动按新 schema 重建);临时脚本/库用完即删,git 仅 6 个目标源文件改动。
- **未做(留后续)**:`/analysis` 的 real 端到端真出参(需用户本地 `.env` 配可用 key + 装 `openai`,Playwright web 自测);explore 链路落库;training 页/底部 tab 统一接后端;`supabase_client.py` 占位。
- **是否通过**:✅ 通过(后端做实 + 缓存 + 接前端均验证;mock 默认 + 回退 + smoke 零破坏;real 出参待用户配 key 联调)
