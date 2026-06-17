# EAS Android 打包 + 验证踩坑手册

本文件记录把 Expo/RN(monorepo)App 打成 Android APK 并在电脑端验证时,真实遇到并解决的问题。
按「构建阶段推进顺序」排列 —— EAS build 失败时,看它停在哪个 phase,直接跳到对应小节。

EAS build 的 phase 推进顺序:**上传 → Prebuild → Bundle JavaScript → Run gradlew → 出包**。
失败 phase 越靠后,说明前面的问题已解决。

---

## 坑 0:从错误目录跑 build(最高频、最隐蔽)

**症状**:Prebuild 阶段失败,日志含 `Cannot determine Expo SDK version because the module 'expo' is not installed` 或 `EAS Build does not officially support building managed project with Expo SDK < 41`。上传体积异常(比如打包了整个 monorepo 根)。

**根因**:`eas build` 必须在**真正含 `app.json` + 完整 `node_modules` 的 mobile 项目目录**(通常 `apps/mobile`)里跑。常见错误:
- 在 monorepo 根目录跑 → 上传了整个仓库,但 expo 配置定位错乱。
- 在 git worktree 场景下,主仓库 checkout 的是别的分支,其 `apps/mobile` 可能是空的;真正的 App 代码只在 worktree 里。从主仓库空目录跑 → 必失败。

**排查**:`git worktree list` 看清哪个工作树有完整代码;`ls apps/mobile/app.json` 确认。

**关键细节**:后台/新 shell **不继承** `cd`。每条 build 命令必须显式带绝对路径:
```bash
cd /abs/path/to/apps/mobile && npx eas build -p android --profile preview --non-interactive
```
启动后立刻校验首行输出是否打印了正确的 pwd 和 `app.json`,别等 20 分钟上传完才发现跑错地方。

---

## 坑 1:EAS 项目未链接(非交互模式必踩)

**症状**:`EAS project not configured. Must configure EAS project by running 'eas init'`。

**根因**:`app.json` 缺 `expo.extra.eas.projectId`。交互模式会问你建不建;`--non-interactive` 直接报错。

**修法**:`eas init` 会创建项目并写回 projectId。worktree 场景下若 init 跑在了别的目录,需把 projectId 手动写进当前 worktree 的 `app.json`:
```json
{ "expo": { "owner": "<account>", "extra": { "eas": { "projectId": "xxxxxxxx-...." } } } }
```
同时确认 `android.package` / `ios.bundleIdentifier` 是正式包名(别留 `com.anonymous.*`)。

---

## 坑 2:云端 Node 版本过旧(Prebuild 阶段)

**症状**:Prebuild 日志刷 `npm WARN EBADENGINE ... required: { node: '>=20...' } current: { node: 'v18...' }`,最终 `Cannot determine Expo SDK version`。

**根因**:EAS builder 默认 Node 版本可能低于新 SDK 要求(曾遇默认 18,而 RN 0.86/SDK 要求 >=20.19)。

**修法**:在 `eas.json` 每个 profile 里 pin node:
```json
{ "build": { "preview": { "node": "22.12.0", "android": { "buildType": "apk" } } } }
```

---

## 坑 3:Hermes 不支持 import.meta(Bundle JavaScript 阶段)

**症状**:Bundle JS 阶段失败:
```
SyntaxError: ...zustand/esm/middleware.mjs: `import.meta` is not supported in Hermes.
Enable the polyfill `unstable_transformImportMeta` in babel-preset-expo to use this syntax.
```

**根因**:`zustand` 的 `persist` 中间件(`zustand/middleware`)用了 `import.meta`。SDK 默认 Hermes 引擎不支持。`expo export --platform web` 不走 Hermes 所以发现不了 —— **必须用 `expo export --platform android` 才能本地复现**。

**修法**:`babel.config.js` 给 `babel-preset-expo` 开开关:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: ["react-native-reanimated/plugin"]
  };
};
```

**本地验证**:`npx expo export --platform android`,成功会输出 `entry-*.hbc`(Hermes 字节码),即转译生效。

---

## 坑 4:expo 包版本 SDK 漂移(Run gradlew 阶段)

**症状**:gradle 配置阶段失败:
```
A problem occurred configuring project ':expo-constants'.
> Could not get unknown property 'projectRoot' for extension 'expoGradle'
  of type expo.modules.plugin.ExpoGradleExtension.
```

**根因**:`expo-router` 的依赖范围把 `expo-constants`/`expo-linking` 拉到了**比当前 SDK 更高的大版本**(如 SDK 53 工程里混进了 SDK 55 的 expo-constants),其 gradle 脚本要读的属性在当前 `expo-modules-core` 插件里不存在。

**诊断**:
```bash
npm ls expo-constants          # 看依赖树里有几个版本、谁拉的
node -e "console.log(require('expo/bundledNativeModules.json')['expo-constants'])"  # SDK 期望版本(权威)
```

**修法**:在 **monorepo 根** `package.json` 加 `overrides` 锁回 SDK 配套版本(版本值取自 `bundledNativeModules.json`):
```json
{ "overrides": {
    "expo-constants": "~17.1.8",
    "expo-linking": "~7.1.7",
    "expo-font": "~13.3.2"
} }
```
**关键**:overrides 改了之后 `npm install` 常报 "up to date" 跳过(它信 `node_modules/.package-lock.json` 这个 hidden lockfile)。必须强制重算:
```bash
rm -rf node_modules apps/mobile/node_modules package-lock.json && npm install
```
装完用 `npm ls expo-constants` 确认全树只剩一个、且是 SDK 配套版本。

---

## 坑 5:原生模块缺失导致启动闪退(build 成功,但装机即崩)★ 本会话最终坑

**症状**:APK 构建成功、能装,但**一打开就闪退**。adb logcat 抓到:
```
Abort message: 'terminating due to uncaught exception of type facebook::jni::JniException:
com.facebook.react.common.JavascriptException: [runtime not ready]:
Error: Cannot find native module 'ExpoLinking', js engine: hermes
```

**根因**:Expo 的 autolinking 在 **monorepo + 依赖被 hoist 到根 node_modules** 的场景下,**扫不到只作为传递依赖存在的原生模块**。`expo-linking` 本是 `expo-router` 的传递依赖,JS 层能 import,但其**原生模块没被打进 APK** → 运行时找不到 → 闪退。`expo export` 不会暴露此问题(它只打 JS)。

**诊断**:
```bash
npx expo-modules-autolinking search | grep -E "linking|constants"
# 列不出 expo-linking 的 native module(ExpoLinkingModule)= 它不会进包
```

**修法**:把缺失的原生模块包提为 **`apps/mobile` 的直接依赖**(版本取 SDK 配套值):
```jsonc
// apps/mobile/package.json → dependencies
"expo-constants": "~17.1.8",
"expo-linking": "~7.1.7",
```
`npm install` 后再 `npx expo-modules-autolinking search` 确认能列出 `ExpoLinkingModule`。提为直接依赖后 autolinking 才稳定发现 → 原生模块进包 → 不再闪退。

**通用规律**:凡 logcat 报 `Cannot find native module 'XXX'`,就把对应 expo 包提为 mobile 直接依赖。

---

## 坑 6:本地原生 build 在深层/含点号路径下失败(仅本地,云端无此问题)

在 `.claude/worktrees/xxx/apps/mobile` 这类路径下,本地 `gradlew assembleRelease/Debug` 会撞两个 Windows 路径问题:

- **metro 解析 entry.js 多退两层**:`Unable to resolve module ./../../node_modules/expo-router/entry.js`(monorepo + workspace 的相对路径计算 bug)。
- **reanimated CMake/ninja 建目录失败**:`ninja: error: mkdir(...): No such file or directory`(路径太长 + 含 `.claude` 点号目录)。

**结论**:在这类 worktree 路径下,**别指望本地全量原生编译**。本地只用 `expo export --platform android` 验证 JS bundle 干净;最终 APK 走 **EAS 云端 build**,再下载到本地模拟器/真机验证(见 SKILL.md 验证闭环)。云端环境路径正常,不受影响。

---

## 杂项

- **EXPO_PUBLIC_* 是打包期静态内联**,非运行期读取。改 key 必须重 build。云端 build 用 `eas env`/secret 注入,**别写进 eas.json**(会进 git)。本地 `.env` 不会自动带上云。
- **secret 验证**:`eas env:list --environment preview` 确认 key 在对应环境。日志里 "No environment variables with visibility Plain text/Sensitive found" 是指**明文**变量统计,secret 仍会在 builder 端注入,不必惊慌。
- **curl 下 APK 偶发 SSL 中断(exit 35)**:加 `--retry 4 --retry-delay 2 -L`。仍失败就浏览器手动下。
- **模拟器 ABI**:Android 模拟器多为 x86_64,确认 APK 含 x86_64(EAS 默认含)。`adb shell getprop ro.product.cpu.abi` 查。
- **AVD system image 缺失**:`Broken AVD system path` 表示该 AVD 要的 image 没装。`ls $ANDROID_HOME/system-images/` 看已装的,选用匹配的 AVD(查 `~/.android/avd/<name>.avd/config.ini` 的 `image.sysdir.1`)。
- **后台启动模拟器要内联环境变量**:`ANDROID_SDK_ROOT` 必须和 emulator 命令在同一行 export,否则 emulator 找不到 SDK root。
- **Windows 下 screencap**:用 `adb exec-out screencap -p > out.png`,不要用 `shell screencap -p /sdcard/x.png`(`-p` 与路径会被拆开)。Read 工具读不到 `/tmp`,先 `cp` 到项目内可读路径(记得清理或 gitignore)。
- **Python 脚本在 Windows GBK 控制台打印 emoji 崩 UnicodeEncodeError**:跑前设 `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`。
