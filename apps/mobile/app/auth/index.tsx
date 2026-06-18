import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { ApiError } from "@/services/apiClient";
import { login as apiLogin, register as apiRegister } from "@/services/authApi";
import { useAppStore } from "@/store/useAppStore";

type Mode = "login" | "register";
const inputFocusStyle = Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : null;

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const setAuth = useAppStore((s) => s.setAuth);

  const isRegister = mode === "register";
  const canSubmit = email.trim().length >= 3 && password.length >= 6 && !submitting;

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setError("");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const resp = isRegister
        ? await apiRegister(email.trim(), password, nickname.trim())
        : await apiLogin(email.trim(), password);
      setAuth(resp.token, resp.user);
      router.replace("/(tabs)/me");
    } catch (err: unknown) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen navTitle={isRegister ? "注册账号" : "登录"} backTo="/(tabs)/me">
      <View style={styles.hero}>
        <Text style={styles.title}>{isRegister ? "创建你的账号" : "欢迎回来"}</Text>
        <Text style={styles.subtitle}>
          {isRegister ? "注册后可在多设备同步你的探索与面试记录。" : "登录以同步你的职业探索进度。"}
        </Text>
      </View>

      <View style={styles.formCard}>
        <Field icon="mail-outline" placeholder="邮箱" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field icon="lock-outline" placeholder="密码（至少 6 位）" value={password} onChangeText={setPassword} secureTextEntry />
        {isRegister ? <Field icon="badge" placeholder="昵称（可选）" value={nickname} onChangeText={setNickname} /> : null}
        {error ? (
          <View style={styles.errorLine}>
            <MaterialIcons name="error-outline" size={17} color="#E5484D" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <Pressable onPress={handleSubmit} style={[styles.submitButton, !canSubmit ? styles.submitDisabled : null]}>
        <Text style={[styles.submitText, !canSubmit ? styles.submitTextDisabled : null]}>
          {submitting ? "请稍候…" : isRegister ? "注册并登录" : "登录"}
        </Text>
      </Pressable>

      <Pressable onPress={switchMode} style={styles.switchRow}>
        <Text style={styles.switchText}>
          {isRegister ? "已有账号？" : "还没有账号？"}
          <Text style={styles.switchLink}>{isRegister ? "去登录" : "去注册"}</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}

function Field({
  icon,
  ...inputProps
}: { icon: React.ComponentProps<typeof MaterialIcons>["name"] } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputWrap}>
      <MaterialIcons name={icon} size={22} color="#778095" />
      <TextInput
        placeholderTextColor="#8B96AA"
        selectionColor={colors.primary}
        style={[styles.input, inputFocusStyle]}
        {...inputProps}
      />
    </View>
  );
}

/** 把 ApiError 映射为面向用户的中文提示;网络类错误提示后端不可达。 */
function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "email_exists":
        return "该邮箱已注册,请直接登录。";
      case "invalid_credentials":
        return "邮箱或密码不正确。";
      case "validation_error":
        return "邮箱或密码格式不符合要求。";
      case "timeout":
      case "network_error":
        return "无法连接服务器,请检查网络或稍后再试。";
      default:
        return err.message || "操作失败,请重试。";
    }
  }
  return "操作失败,请重试。";
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, marginBottom: spacing.lg },
  title: { color: "#0B1D3A", fontSize: 26, lineHeight: 34, fontWeight: "700" },
  subtitle: { color: "#59677D", fontSize: 14, lineHeight: 22, fontWeight: "500" },
  formCard: {
    borderRadius: 24,
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6ECF5",
    gap: spacing.md
  },
  inputWrap: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#DCE3EC",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  input: { flex: 1, color: "#0B1D3A", fontSize: 15, fontWeight: "500", padding: 0 },
  errorLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { flex: 1, color: "#E5484D", fontSize: 13, fontWeight: "500" },
  submitButton: {
    minHeight: 54,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B63F6",
    shadowColor: "#0B63F6",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  submitDisabled: { backgroundColor: "#C8D0DE", shadowOpacity: 0 },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  submitTextDisabled: { color: "#7F8A9E" },
  switchRow: { marginTop: spacing.lg, alignItems: "center" },
  switchText: { color: colors.muted, fontSize: 14 },
  switchLink: { color: colors.primary, fontWeight: "700" }
});
