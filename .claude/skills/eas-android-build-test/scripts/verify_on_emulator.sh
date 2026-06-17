#!/usr/bin/env bash
# verify_on_emulator.sh — 把 EAS 出的 APK 下载、装到 Android 模拟器/真机、启动并抓崩溃日志,
# 自动判定 App 是「正常启动」还是「闪退」。这是电脑端验证手机 App 的核心闭环,
# 把本会话手动做过多次的步骤(curl 下载 → adb install → monkey 启动 → logcat 判定)固化下来。
#
# 用法:
#   bash verify_on_emulator.sh <apk-url-or-path> <android-package-id> [device-serial]
# 例:
#   bash verify_on_emulator.sh https://expo.dev/artifacts/eas/xxx.apk com.doublecore.aicareertutor emulator-5554
#   bash verify_on_emulator.sh /tmp/app.apk com.doublecore.aicareertutor
#
# 环境:需 adb 在 PATH 或设 ANDROID_HOME/ANDROID_SDK_ROOT。脚本会自动把 platform-tools 加进 PATH。
# 退出码:0 = App 启动后存活(无闪退);1 = 闪退或装包失败(stdout 打印 logcat 崩溃原因)。

set -uo pipefail
APK_SRC="${1:?需要 APK URL 或本地路径}"
PKG="${2:?需要 Android 包名,如 com.doublecore.aicareertutor}"
DEV="${3:-}"

ANDROID_HOME="${ANDROID_HOME:-D:/Android/SDK}"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
command -v adb >/dev/null 2>&1 || { echo "❌ 找不到 adb。设 ANDROID_HOME 或把 platform-tools 加进 PATH。"; exit 1; }

# 自动选设备:未指定时取第一个 online 的
if [ -z "$DEV" ]; then
  DEV=$(adb devices | awk 'NR>1 && $2=="device"{print $1; exit}')
  [ -z "$DEV" ] && { echo "❌ 没有 online 的设备/模拟器。先启动模拟器(见 SKILL.md「启动模拟器」)。"; exit 1; }
fi
echo "=== 目标设备: $DEV / 包名: $PKG ==="
A="adb -s $DEV"

# 1) 取得本地 APK
APK=/tmp/_verify_$PKG.apk
if echo "$APK_SRC" | grep -qE '^https?://'; then
  echo "→ 下载 APK..."
  # 重试 + 跟随重定向。EAS artifact 偶发 SSL 中断(curl 35),--retry 兜底。
  if ! curl -L --retry 4 --retry-delay 2 -o "$APK" "$APK_SRC"; then
    echo "❌ 下载失败。换浏览器手动下,或重试。"; exit 1
  fi
else
  APK="$APK_SRC"
fi
SZ=$(du -h "$APK" 2>/dev/null | cut -f1)
[ -s "$APK" ] || { echo "❌ APK 文件为空/不存在: $APK"; exit 1; }
echo "✅ APK 就位 ($SZ): $APK"

# 2) 安装(-r 覆盖装;失败时尝试先卸载)
echo "→ 安装到 $DEV..."
if ! $A install -r "$APK" 2>&1 | grep -q "Success"; then
  echo "  覆盖装失败,尝试先卸载再装..."
  $A uninstall "$PKG" >/dev/null 2>&1
  $A install "$APK" 2>&1 | grep -q "Success" || { echo "❌ 安装失败(可能 ABI 不匹配:模拟器需 x86_64,确认 APK 含 x86_64)。"; exit 1; }
fi
echo "✅ 安装成功"

# 3) 清日志 → 启动 → 等待 → 判定存活
echo "→ 启动 App 并监控..."
$A logcat -c
$A shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 8
PID=$($A shell pidof "$PKG" 2>/dev/null | tr -d '\r')

if [ -n "$PID" ]; then
  echo "✅ 进程存活 (pid=$PID) —— App 正常启动,未闪退。"
  # 附带扫一眼有无非致命 JS 异常
  ERRS=$($A logcat -d 2>&1 | grep -iE "JavascriptException|cannot find native|unable to resolve module|ReferenceError|TypeError" | grep -iv "ReconnectingWebSocket" | head -5)
  if [ -n "$ERRS" ]; then
    echo "⚠️  日志里有 JS 异常(App 没崩但功能可能受影响):"; echo "$ERRS"
  fi
  # 截图留证(可被 Read 工具查看)
  SHOT="/tmp/_verify_${PKG}.png"
  $A exec-out screencap -p > "$SHOT" 2>/dev/null && [ -s "$SHOT" ] && echo "📸 首屏截图: $SHOT(用 Read 工具查看,Windows 下先 cp 到可读路径)"
  exit 0
else
  echo "❌ 进程不存在 —— App 闪退了。崩溃原因如下:"
  echo "---------------- logcat 崩溃摘录 ----------------"
  $A logcat -d -v brief 2>&1 \
    | grep -iE "FATAL|AndroidRuntime|Abort message|cannot find native module|JavascriptException|libc.*SIGABRT" \
    | grep -iv "ReconnectingWebSocket" | head -25
  echo "-------------------------------------------------"
  echo "诊断提示见 references/troubleshooting.md。最常见:'Cannot find native module XXX'"
  echo "→ 把对应 expo 包提为 apps/mobile 直接依赖(autolinking 在 monorepo 下扫不到纯传递依赖)。"
  exit 1
fi
