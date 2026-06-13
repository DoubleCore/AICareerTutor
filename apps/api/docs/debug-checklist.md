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
