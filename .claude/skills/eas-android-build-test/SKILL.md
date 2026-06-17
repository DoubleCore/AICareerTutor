---
name: eas-android-build-test
description: "Builds an Expo/React Native app into an installable Android APK via EAS cloud build, then verifies it on a local emulator/device through adb. This skill should be used when packaging an Expo mobile app for Android (especially in a monorepo or git worktree), running eas build, diagnosing build failures (Prebuild / Bundle JS / gradle phases), or debugging install-time crashes. Triggers: 打包成 app, 出 APK, eas build, 装到模拟器测, 闪退, crash on launch."
---

# EAS Android 打包 + 模拟器验证

## Overview

把 Expo/RN App 打成可安装的 Android APK,并在电脑端通过 adb + 模拟器/真机验证它真的能跑。
覆盖完整闭环:**打包前置检查 → EAS 云端 build → 下载 APK → 装到设备 → 启动并抓 logcat 判定**。
专为 monorepo / git worktree 场景设计 —— 这类项目里 `eas build` 的坑最多。

核心原则:**每个 build 阶段失败都有确定的根因,不靠猜**。本地无法全量原生编译时(worktree 深层路径),
用 `expo export --platform android` 验证 JS、用 EAS 出包、用模拟器验证运行,三段各司其职。

## 工作流

### 步骤 1:打包前置检查(必做,省一次 20 分钟的失败 build)

进入真正的 mobile 项目目录(含 `app.json`,通常 `apps/mobile`),跑前置检查脚本:

```bash
bash scripts/preflight_check.sh /abs/path/to/apps/mobile
```

它校验本会话踩过的全部坑:目录正确性、EAS projectId 链接、eas.json(apk + node pin)、
babel 的 `unstable_transformImportMeta`、原生模块 autolinking、expo 包版本 SDK 自洽性。
有 ❌ 先修(对照 `references/troubleshooting.md` 对应坑号),全绿再 build。

**worktree 场景特别注意**:`git worktree list` 确认哪个工作树有完整 App 代码。主仓库可能 checkout
别的分支、其 `apps/mobile` 是空的 —— 从空目录跑 build 必失败(坑 0)。

### 步骤 2:本地预验 JS bundle(可选但推荐,30 秒)

```bash
cd /abs/path/to/apps/mobile && npx expo export --platform android
```

成功输出 `entry-*.hbc`(Hermes 字节码)= JS 层干净,可提前发现 Hermes/import.meta 类问题(坑 3)。
**注意必须用 `--platform android`** —— web 不走 Hermes,发现不了。

### 步骤 3:EAS 云端 build

```bash
cd /abs/path/to/apps/mobile && npx eas build -p android --profile preview --non-interactive
```

- 后台/新 shell **不继承 cd**,每条命令必须显式带绝对路径 `cd ... &&`。
- 启动后立即核对输出首行打印的 pwd 和 app.json,确认没跑错目录。
- 上传 + 排队 + 编译合计 ~15-30 分钟。轮询状态用:
  ```bash
  npx eas build:view <build-id>   # 看 Status: in queue / in progress / finished + Application Archive URL
  ```
- 失败时看它停在哪个 phase(Prebuild / Bundle JavaScript / Run gradlew),直接查 `references/troubleshooting.md`
  对应小节。**失败 phase 越靠后 = 前面的坑已解决,在推进**。

key 注入:`EXPO_PUBLIC_*` 是打包期静态内联。云端用 `eas env`/secret 注入,不写进 eas.json。
`eas env:list --environment preview` 确认 key 在位。

### 步骤 4:电脑端验证闭环(关键 —— 别只依赖人工肉眼测)

build 出 `Application Archive URL` 后,一条命令完成「下载 → 安装 → 启动 → 判定闪退」:

```bash
bash scripts/verify_on_emulator.sh <apk-url> <package-id> [device-serial]
# 例:
bash scripts/verify_on_emulator.sh https://expo.dev/artifacts/eas/xxx.apk com.doublecore.aicareertutor emulator-5554
```

- 退出 0 = App 启动后进程存活(未闪退),并截图首屏到 `/tmp/_verify_<pkg>.png`。
- 退出 1 = 闪退,**自动打印 logcat 崩溃摘录**。最常见 `Cannot find native module 'XXX'` → 坑 5
  (把对应 expo 包提为 mobile 直接依赖)。
- 包名取自 `app.json` 的 `android.package`。

**启动模拟器**(脚本需要一个 online 设备):
```bash
# 先看有哪些 AVD 和已装的 system image(image 必须匹配 AVD 要求,否则 Broken AVD system path)
"$ANDROID_HOME/emulator/emulator" -list-avds
ls "$ANDROID_HOME/system-images/"
# 后台启动(ANDROID_SDK_ROOT 必须和命令同一行 export):
ANDROID_SDK_ROOT="D:\\Android\\SDK" ANDROID_HOME="D:\\Android\\SDK" \
  "D:/Android/SDK/emulator/emulator.exe" -avd <AVD名> -no-snapshot -no-boot-anim -gpu swiftshader_indirect &
# 等开机:
adb wait-for-device && adb shell getprop sys.boot_completed   # =1 即就绪
```

### 步骤 5:验证功能链路(真机 AI / 持久化等)

App 不闪退后,用 adb 驱动 UI 做冒烟:
```bash
adb -s <dev> shell input tap <x> <y>          # 点击
adb -s <dev> exec-out screencap -p > shot.png  # 截图(Windows 用 exec-out,不要 shell screencap -p /path)
adb -s <dev> logcat -d | grep -iE "<关键字>"    # 看网络/异常日志
```
判定 AI 是否真调:对比返回内容与 mock 数据(`data/mockData.ts`)—— 若内容动态、引用了用户输入而非固定题库,即真实 AI 返回。
Read 工具读不到 `/tmp`,截图先 `cp` 到项目内路径再 Read(用完清理,避免污染 git)。

## 故障排查

所有已知坑(按 build 阶段排序)、症状、根因、修法,见 **`references/troubleshooting.md`**。
遇到 build 失败或闪退时**先读它**,不要逐个试错。速查:

| 现象关键字 | 坑号 |
|---|---|
| `Cannot determine Expo SDK version` / 跑错目录 | 0 |
| `EAS project not configured` | 1 |
| `EBADENGINE` node 版本过旧 | 2 |
| `import.meta is not supported in Hermes` | 3 |
| `unknown property 'projectRoot' for expoGradle` | 4 |
| `Cannot find native module 'XXX'`(装机闪退) | 5 |
| 本地 gradle `Unable to resolve entry.js` / ninja mkdir 失败 | 6 |

## 环境前提

- EAS CLI:`npx eas`(需 `eas login` 过)。
- Android SDK + adb:设 `ANDROID_HOME`/`ANDROID_SDK_ROOT`(本机 `D:/Android/SDK`),platform-tools 在 PATH。
- 至少一个 AVD,且其 system image 已安装。
- Windows + Git Bash:Python 脚本打印 emoji 会 GBK 崩,跑前设 `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`。
