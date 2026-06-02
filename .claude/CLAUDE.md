# AI职场导师 — 项目说明

AI 职场导师 App。本仓库为 monorepo:Expo/React Native 前端 + FastAPI 后端。
当前阶段:**P0 → 收集后端落地**。后端正从内存 mock 切换到真实数据收集与 AI 接入。

## 仓库结构

```
apps/
  mobile/   Expo + expo-router + zustand 前端
  api/      FastAPI 后端(本阶段重点)
.spec-workflow/   spec 驱动开发的 steering / specs
```

后端分层(`apps/api/app/`):
- `api/routes/`   路由:health, explore, interview, profile
- `schemas/`      Pydantic 模型,既是请求/响应契约,也是 AI 结构化输出契约
- `services/`     ai_service(AI 调用)、file_service(上传)、mock_state(内存态)
- `db/`           supabase_client.py(当前返回 None 占位)
- `utils/`        parser、prompts

## 常用命令

```powershell
npm run api          # 启动后端(uvicorn --reload)
npm run mobile       # 启动 Expo
npm run mobile:web   # web 预览
npm run typecheck    # 前端 tsc --noEmit
```

后端测试:`python -m pytest`(在 apps/api 下;测试框架待按需引入)。

## 已接入的插件 / Skill

通过 `.claude/settings.json` 固化,克隆后 `claude` 会自动启用。

**supabase**(数据收集链路 + 工程基建)
- skill:`supabase`(Auth / DB / Storage / Edge Functions / Realtime 全产品指引)、`supabase-postgres-best-practices`(schema、索引、RLS、性能)
- 自带 Supabase MCP server(HTTP 型,首次使用走 OAuth 授权,**不需要把密钥写进配置文件**)
- 用途:把 `db/supabase_client.py` 从占位换成真实连接;落地 explore/interview 表结构、迁移、RLS

**agent-sdk-dev**(AI 模型接入)
- 命令 `/new-sdk-app`,agent `agent-sdk-verifier-py`(本项目是 Python,用这个)
- 用途:把 `services/ai_service.py` 从走 `mock_state` 换成真实 Claude 调用,按 `schemas/` 里的 Pydantic 模型输出结构化结果

## 约定

- **密钥安全**:任何密钥(Supabase key、AI api key)只进 `.env`(已被 .gitignore 忽略且被 settings deny 读取),绝不写进会提交的文件。`.env.example` 只放占位。
- **schema 即契约**:`schemas/` 里的 Pydantic 模型同时是 API 响应契约和 AI 结构化输出契约,改动需前后端对齐。

## Skill 分工边界(各管各的层,不交叉、不打架)

| Skill | 负责层 | 只能碰 | 不碰 |
|---|---|---|---|
| **expo** | 前端/移动端 | `apps/mobile/` 的 UI、构建、部署、升级、原生取数 | 后端、数据库 |
| **agent-sdk-dev** | AI 接入 | `services/ai_service.py` 的 SDK 调用模式 + `agent-sdk-verifier-py` 验证 | 数据库、前端 |
| **supabase** | 云端数据(未来) | 设计表/字段时提供 postgres-best-practices 参考 | **现在不主导建库、不接 MCP 写云端** |

两条硬规矩:
1. **数据层 = SQLite,锁定**。当前用 SQLModel + 本地 SQLite(`apps/api/career_tutor.db`),`db/supabase_client.py` 保持占位。supabase skill **现在只当“未来迁移目标参考”**——设计 schema 时让它给意见以便将来平滑切云,但不主导、不写云端。Supabase 真正上场是“云端阶段”,不是现在。
2. **禁用 `agent-sdk-dev` 的 `/new-sdk-app`**:它从零生成新项目,会冲掉现有 `apps/api` 结构。只用它的验证 agent 和 SDK 调用模式来改造现有 `ai_service.py`。
