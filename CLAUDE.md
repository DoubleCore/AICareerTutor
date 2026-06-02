# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

"AI职场导师" —— 一个职业辅导类移动应用的 P0 可运行骨架,配套 FastAPI 后端。所有面向用户的文案都是中文,新增字符串请保持中文以保持一致。两条产品主线:职业**探索**(填写画像 → 追问 → 方向推荐 → 保存学习路径)和**面试**训练(上传面试记录 → 分析 → 报告 → 训练任务)。

## 常用命令

除特别说明外,均在仓库根目录执行。根目录的 `package.json` 是一个 npm workspace,仅覆盖 `apps/mobile`;Python 后端单独管理。

```powershell
npm run mobile        # expo start(Expo Go,或按 w 进入 web 预览)
npm run mobile:web    # expo start --web
npm run typecheck     # 在 apps/mobile 执行 tsc --noEmit
npm run api           # uvicorn app.main:app --reload --app-dir apps/api
```

后端首次配置(独立的 venv,不属于 npm workspace):

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**没有配置测试框架,也没有配置 linter。** `npm run typecheck`(TS strict 模式)是移动端唯一的自动化校验 —— 改动移动端后请运行它。后端没有自动化校验,请对着运行中的 uvicorn 服务手动验证接口(`/docs` 可打开 OpenAPI 界面)。

## 架构

Monorepo,包含两个**尚未打通**的独立应用:

- `apps/mobile` —— Expo / React Native 应用(expo-router,基于文件的路由)。TypeScript strict 模式,路径别名 `@/*` 指向移动端自身根目录。
- `apps/api` —— FastAPI 后端,用 uvicorn 启动(`--app-dir apps/api`,因此导入根是 `app.*`)。

### 最关键的一点:两套并行的数据源

移动端目前**完全依赖本地 mock 数据和客户端状态**运行 —— 它**不调用** API。FastAPI 后端是并行存在的,镜像了同一套领域模型,但 `apps/mobile` 里没有任何网络请求(只有 `.env.example` 里引用了 `EXPO_PUBLIC_API_URL`)。新增功能时,mock 数据和 API 是两个独立的面,需要手动保持同步:

- 移动端数据来源:`apps/mobile/data/mockData.ts`(种子数据)+ `apps/mobile/store/useAppStore.ts`(Zustand store,持有所有可变运行时状态)。
- API 数据来源:`apps/api/app/services/mock_state.py`(模块级全局变量 + 种子数据),通过 `ai_service.py` 访问。`ai_service` 目前只是一层薄转发,直接调用 `mock_state`;这个接缝正是后续接入真实 AI/模型调用的位置。

两端都硬编码了相同的中文演示内容(方向如 AI产品经理 / 数据分析师、面试报告、训练任务)。改一处领域模型通常要同时改**四个**地方:`types/domain.ts` + `mockData.ts`(移动端),以及对应的 `schemas/*.py` + `mock_state.py`(API)。

### 跨边界的字段命名约定

API 序列化用 **snake_case**(Pydantic 模型),移动端类型用 **camelCase**(`daily_work` ↔ `dailyWork`、`pass_possibility` ↔ `passPossibility`、`direction_id` ↔ `selectedDirectionId`)。未来打通两端的衔接层必须做这层转换。

### 后端分层

`main.py` 在四个前缀下挂载路由:`/explore`、`/interview`、`/profile`,外加 health。请求/响应结构定义在 `app/schemas/`。路由调用 `app/services/`(`ai_service`、`file_service`、`mock_state`)—— 路由本身不直接持有业务逻辑。状态是**进程内全局内存**(如 `LATEST_PROFILE`、`CURRENT_PATH`、`TRAINING_TASKS` 都是就地修改的模块全局变量),因此重启即重置,且非并发安全 —— 这是 P0 的有意设计。

`app/db/supabase_client.py` 返回 `None` —— Supabase Auth/Postgres/Storage 以及真实文件存储(`file_service.store_upload_metadata` 只是原样返回入参)都推迟到后续阶段。两端的 `.env.example` 里都为此预留了占位环境变量。

### 移动端结构

expo-router 路由位于 `apps/mobile/app/`:`(tabs)/` 是底部 tab 外壳(发现/路径/面试/我的,但 tab bar 被隐藏),`explore/` 和 `interview/` 是两条多步骤流程,以 stack 方式入栈。共享 UI 基础组件在 `components/ui/primitives.tsx`;设计 token(颜色、间距、圆角)在 `constants/theme.ts` —— 请使用它们而不要硬编码样式值。

所有跨屏状态都流经唯一的 Zustand store(`useAppStore`);没有 React Context,也没有服务端缓存。`resetDemo()` 把整个应用还原到种子状态,演示就是这样重新开始的。
