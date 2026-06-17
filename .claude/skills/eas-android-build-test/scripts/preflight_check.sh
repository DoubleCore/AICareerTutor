#!/usr/bin/env bash
# preflight_check.sh — 在跑 EAS Android build 前,验证 mobile 项目配置是否就绪。
#
# 用法:
#   bash preflight_check.sh <mobile-project-dir>
# 例:
#   bash preflight_check.sh /e/AICareerTutor/.claude/worktrees/xxx/apps/mobile
#
# 退出码:0 = 全部通过;非 0 = 有阻塞问题(stdout 会列出)。
# 这个脚本只读不改,安全。它把本会话踩过的坑固化成自动检查。

set -uo pipefail
MOBILE_DIR="${1:?需要传入 mobile 项目目录(含 app.json 的那一层)}"
cd "$MOBILE_DIR" || { echo "❌ 进不去目录: $MOBILE_DIR"; exit 1; }

FAIL=0
note() { echo "  $1"; }
ok()   { echo "✅ $1"; }
bad()  { echo "❌ $1"; FAIL=1; }
warn() { echo "⚠️  $1"; }

echo "=== EAS Android 打包前置检查 @ $MOBILE_DIR ==="

# 1) 必须在含 app.json 的目录(最常见的坑:从 monorepo 根或空目录跑 build)
if [ -f app.json ] && [ -f package.json ]; then
  ok "app.json + package.json 就位(目录正确)"
else
  bad "当前目录缺 app.json 或 package.json —— EAS 会报 'Cannot determine Expo SDK version'。务必 cd 到真正的 mobile 项目目录(通常是 apps/mobile),不要从 monorepo 根或 worktree 根跑。"
fi

# 2) EAS 项目链接(extra.eas.projectId)
PROJ_ID=$(node -e "try{const c=require('./app.json');console.log(c.expo?.extra?.eas?.projectId||'')}catch(e){console.log('')}" 2>/dev/null)
if [ -n "$PROJ_ID" ]; then
  ok "EAS projectId 已链接: $PROJ_ID"
else
  bad "app.json 缺 expo.extra.eas.projectId —— 非交互模式 build 会失败。先 'eas init' 或手动写入。"
fi

# 3) eas.json 存在且 preview profile 出 apk
if [ -f eas.json ]; then
  APK=$(node -e "try{const e=require('./eas.json');console.log(e.build?.preview?.android?.buildType||'')}catch(x){console.log('')}" 2>/dev/null)
  [ "$APK" = "apk" ] && ok "eas.json preview profile 出 apk" || warn "eas.json preview 的 android.buildType 不是 apk(当前: '${APK:-未设置}'),可装的产物应为 apk"
  NODE_PIN=$(node -e "try{const e=require('./eas.json');console.log(e.build?.preview?.node||'')}catch(x){console.log('')}" 2>/dev/null)
  [ -n "$NODE_PIN" ] && ok "eas.json 已 pin node: $NODE_PIN" || warn "eas.json preview 未 pin node 版本 —— 云端默认可能过旧(曾遇 node 18 vs SDK 要求 >=20)。建议加 \"node\": \"22.12.0\"。"
else
  bad "缺 eas.json —— 先 'eas build:configure' 生成。"
fi

# 4) Hermes + zustand import.meta 坑:babel 是否开了 unstable_transformImportMeta
if [ -f babel.config.js ]; then
  if grep -q "unstable_transformImportMeta" babel.config.js; then
    ok "babel 已开 unstable_transformImportMeta(zustand persist 的 import.meta 能在 Hermes 下转译)"
  else
    if grep -rqs "zustand/middleware\|persist(" "$MOBILE_DIR/store" 2>/dev/null || grep -qs '"zustand"' package.json; then
      warn "用了 zustand persist 但 babel 未开 unstable_transformImportMeta —— Android Bundle JS 阶段可能报 'import.meta is not supported in Hermes'。在 babel-preset-expo 加 { unstable_transformImportMeta: true }。"
    fi
  fi
fi

# 5) 原生模块必须是直接依赖:expo autolinking 在 monorepo 下扫不到纯传递依赖
#    本会话真实踩坑:expo-linking 只作 expo-router 传递依赖时,APK 缺 ExpoLinking 原生模块 → 启动闪退。
SEARCH_BIN="$(command -v expo-modules-autolinking || true)"
if node -e "require.resolve('expo-modules-autolinking/package.json')" >/dev/null 2>&1; then
  LINKED=$(npx --no-install expo-modules-autolinking search 2>/dev/null | grep -oE "'expo-[a-z-]+'" | tr -d "'" | sort -u)
  for mod in expo-linking expo-constants; do
    if echo "$LINKED" | grep -qx "$mod"; then
      ok "autolinking 能发现原生模块: $mod"
    else
      # 只有当项目实际用到该模块时才算问题;expo-router 必带 expo-linking。
      warn "autolinking 未列出 $mod。若 App 依赖它(expo-router 依赖 expo-linking),需把它提为 apps/mobile 的直接依赖,否则原生模块不进包 → 启动闪退 'Cannot find native module'。"
    fi
  done
else
  note "(跳过 autolinking 检查:expo-modules-autolinking 未安装,先 npm install)"
fi

# 6) expo 核心包版本是否自洽(SDK 漂移坑:expo-router 可能把 expo-constants 拉到高 SDK 版本)
EXPO_V=$(node -e "try{console.log(require('expo/package.json').version)}catch(e){console.log('')}" 2>/dev/null)
if [ -n "$EXPO_V" ]; then
  ok "expo 版本: $EXPO_V"
  CONST_V=$(node -e "try{console.log(require('expo-constants/package.json').version)}catch(e){console.log('')}" 2>/dev/null)
  # expo SDK 自带 bundledNativeModules.json 是版本权威表
  WANT_CONST=$(node -e "try{console.log(require('expo/bundledNativeModules.json')['expo-constants']||'')}catch(e){console.log('')}" 2>/dev/null)
  if [ -n "$CONST_V" ] && [ -n "$WANT_CONST" ]; then
    note "expo-constants 实装 $CONST_V / SDK 期望 $WANT_CONST"
    # 粗判大版本号是否一致
    CMAJ=${CONST_V%%.*}; WMAJ=$(echo "$WANT_CONST" | grep -oE '[0-9]+' | head -1)
    if [ -n "$CMAJ" ] && [ -n "$WMAJ" ] && [ "$CMAJ" != "$WMAJ" ]; then
      bad "expo-constants 大版本($CMAJ)与 SDK 期望($WMAJ)不符 —— 曾导致 gradle 报 'unknown property projectRoot for expoGradle'。在根 package.json overrides 锁回 SDK 配套版本,删 node_modules+lockfile 重装。"
    else
      ok "expo-constants 版本与 SDK 匹配"
    fi
  fi
else
  bad "找不到 expo 包 —— 先 npm install。"
fi

echo "=== 检查结束 ==="
if [ "$FAIL" -ne 0 ]; then
  echo "❌ 有阻塞问题,修完再 build。详见 references/troubleshooting.md"
  exit 1
fi
echo "✅ 前置检查通过,可以 eas build。"
