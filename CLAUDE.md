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

移动端原生构建脚本(需本地装好 Android SDK / Xcode,详见「打包成 APP」一节):

```powershell
npm --workspace apps/mobile run android   # expo run:android(本地 prebuild + 跑到设备/模拟器)
npm --workspace apps/mobile run ios       # expo run:ios(仅 macOS)
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

### 数据流:移动端 → API → AI/DB,带 mock 兜底

移动端**已接入后端**:`apps/mobile/services/` 下有统一的 `apiClient.ts`(拼 baseUrl、超时、错误包络解析)和分领域封装(`exploreApi.ts`、`interviewApi.ts`、`profileApi.ts`),被 `app/explore/*` 与 `app/interview/*` 共 10 个屏幕直接调用。范式是 **API 优先 + 本地兜底**:屏幕先发请求,超时/网络/后端报错时回退到 `data/mockData.ts` 的种子常量(各屏幕里有对齐后端的兜底值),链路不中断。`apiClient` 缺省 baseUrl 时按平台兜底(Android 模拟器走 `10.0.2.2`,其余 `localhost`),真机/打包后必须用 `EXPO_PUBLIC_API_URL` 指向可达地址。

数据有三个面,改领域模型常要同步多处:

- **移动端**:`types/domain.ts`(类型)+ `data/mockData.ts`(兜底种子)+ `store/useAppStore.ts`(Zustand,持有跨屏运行时状态)。
- **API 契约 + AI 结构化输出**:`apps/api/app/schemas/*.py`(Pydantic 模型,既是响应契约也是 AI 工具/JSON 输出的 schema)。
- **服务实现**:`apps/api/app/services/ai_service.py` 按 `AI_MODE` 分流 —— `mock`(默认,零密钥零依赖,演示/CI 安全,走 `mock_state` 题库/模板)或 `real`(按 `AI_PROVIDER` 调 anthropic / openai 兼容端点产出结构化结果);`real` 缺 key 或调用失败时自动回退 mock。

所以改一处领域字段,通常要同时动 `types/domain.ts` + `mockData.ts`(移动端)和 `schemas/*.py` + `mock_state.py`(API)四处,外加可能的 `db/models.py`(见下)。

### 跨边界的字段命名约定

API 序列化用 **snake_case**(Pydantic 模型),移动端类型用 **camelCase**(`daily_work` ↔ `dailyWork`、`pass_possibility` ↔ `passPossibility`、`direction_id` ↔ `selectedDirectionId`)。`services/*Api.ts` 的封装层负责这层转换。

### 后端分层与数据持久化

`main.py` 在三个前缀下挂载路由:`/explore`、`/interview`、`/profile`,外加 health。请求/响应结构定义在 `app/schemas/`。路由调用 `app/services/`(`ai_service`、`file_service`、`mock_state`)—— 路由本身不持有业务逻辑。

持久化是**混合态**:`apps/api/app/db/`(`database.py` + `models.py`,SQLModel + 本地 SQLite `career_tutor.db`,已 gitignore)已落库 explore 画像/结果/路径与 interview 会话/报告/训练任务状态(共 6 张表);`mock_state.py` 仍是 explore/interview 读写的统一入口,内部部分转调 DB、部分仍是模块级内存。`db/supabase_client.py` 仍返回 `None` —— Supabase 与真实文件存储(`file_service.store_upload_metadata` 原样返回入参)推迟到云端阶段。改持久化字段时记得同步 `db/models.py`。

### 移动端结构

expo-router 路由位于 `apps/mobile/app/`:`(tabs)/` 是底部 tab 外壳(发现/路径/面试/我的,但 tab bar 被隐藏),`explore/` 和 `interview/` 是两条多步骤流程,以 stack 方式入栈。共享 UI 基础组件在 `components/ui/primitives.tsx`;设计 token(颜色、间距、圆角)在 `constants/theme.ts` —— 请使用它们而不要硬编码样式值。

所有跨屏状态都流经唯一的 Zustand store(`useAppStore`);没有 React Context,也没有服务端缓存。`resetDemo()` 把整个应用还原到种子状态,演示就是这样重新开始的。

## 打包成 APP

> 目标:把 `apps/mobile` 从「Expo Go 里跑」变成可分发的 Android `.apk`/`.aab`(及 iOS `.ipa`)。**当前仓库还没有任何打包配置** —— 没有 `eas.json`、没装 `eas-cli`、没有 `assets/` 目录,`app.json` 也缺 `icon`/`splash`/`ios.bundleIdentifier` 等键。下面是从零落地的方法。

### 打包前必须先补齐的配置(都在 `apps/mobile/app.json`)

- **图标 / 启动屏**:新建 `apps/mobile/assets/`,放 `icon.png`(1024×1024)、`adaptive-icon.png`、`splash.png`,并在 `app.json` 的 `expo` 下补 `icon`、`android.adaptiveIcon`、`splash`、`assetBundlePatterns`。现有 `img/` 是界面用图,不是应用图标。
- **iOS bundle id**:`app.json` 只有 `android.package`(`com.anonymous.aicareertutor`),缺 `ios.bundleIdentifier`,要发 iOS 必须补;`com.anonymous.*` 是占位前缀,正式发布前应换成自有域名反写。
- **版本**:`version`(展示版本)外,Android 需 `android.versionCode`、iOS 需 `ios.buildNumber`,每次提交商店都要自增。
- **运行时 API 地址**:打包产物里 `localhost`/`10.0.2.2` 都打不到后端(见「数据流」一节)。打包时必须通过 `EXPO_PUBLIC_API_URL` 注入一个真机可达的后端地址(局域网 IP 或已部署的公网域名),否则所有请求会超时回退到 mock。

### 原生工程是 CNG 生成物(不入库)

`apps/mobile/android/` 和 `apps/mobile/ios/` 已被 `.gitignore` 忽略 —— 本项目走 Expo **CNG(Continuous Native Generation)**,原生工程由 `app.json` + 插件按需生成,不手改、不提交。需要时用 `npx expo prebuild` 重新生成;`newArchEnabled: true` 表示启用新架构。改原生配置请改 `app.json`/config plugin,不要直接改生成出来的目录。

### 两条打包路线

1. **EAS Build(推荐,云端构建,免本地原生环境)**
   ```powershell
   npm i -g eas-cli
   cd apps/mobile
   eas login
   eas build:configure          # 生成 eas.json(目前不存在,首次必跑)
   eas build -p android --profile preview      # 出可直接安装的 .apk
   eas build -p android --profile production    # 出上架用 .aab
   eas build -p ios --profile production        # iOS(需 Apple 开发者账号)
   ```
   `eas.json` 的 profile 里用 `env` 注入 `EXPO_PUBLIC_API_URL` 等 `EXPO_PUBLIC_*` 变量,区分 preview/production 指向不同后端。

2. **本地构建(无需 EAS 账号,但要自备原生工具链)**
   ```powershell
   cd apps/mobile
   npx expo prebuild -p android
   npm run android        # 或进 android/ 跑 ./gradlew assembleRelease 出 apk
   ```
   需本地装好 Android SDK / JDK(iOS 还需 macOS + Xcode)。

### 后端怎么办

`apps/api` 是独立的 Python 服务,**不随移动端一起打包**。要让打包后的 App 真正能用,后端得单独部署到一个真机可达的地址,再把该地址填进打包时的 `EXPO_PUBLIC_API_URL`。仅做演示时可不接后端 —— App 会自动回退到本地 mock 兜底数据。
