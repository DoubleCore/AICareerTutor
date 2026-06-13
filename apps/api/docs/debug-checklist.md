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
