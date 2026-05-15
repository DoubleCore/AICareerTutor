import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AbilityRadarChart, Screen } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/user/UserAvatar";
import { colors, radius, spacing } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

export default function Me() {
  const { avatarUri, setAvatarUri, directions, savedDirectionId, savedTasks, trainingTasks, profileMode } = useAppStore();
  const savedDirection = directions.find((item) => item.id === savedDirectionId) ?? directions[0];
  const hasExplore = profileMode === "both" || profileMode === "explore";
  const hasInterview = profileMode === "both" || profileMode === "interview";
  const exploreDone = savedTasks.filter((task) => task.status === "已完成").length || 1;
  const trainingDone = trainingTasks.filter((task) => task.status === "已完成").length;
  const todoExplore = Math.max(0, 4 - exploreDone);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.86
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0]?.uri);
    }
  };

  return (
    <Screen navTitle="我的" activeTab="我的">
      <View style={styles.profileCard}>
        <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
          <UserAvatar size={78} />
          <View style={styles.cameraBadge}>
            <MaterialIcons name={avatarUri ? "edit" : "photo-camera"} size={16} color="#fff" />
          </View>
        </Pressable>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>Archer</Text>
          <View style={styles.badgeRow}>
            {hasExplore ? <MiniBadge icon="explore" text="职业探索中" color={colors.primary} /> : null}
            {hasInterview ? <MiniBadge icon="show-chart" text="面试提升中" color={colors.accent} /> : null}
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={28} color={colors.gray} />
      </View>

      <View style={styles.focusCard}>
        <View style={styles.focusHeader}>
          <View style={styles.focusIcon}>
            <MaterialIcons name="gps-fixed" size={25} color="#fff" />
          </View>
          <View style={styles.focusCopy}>
            <Text style={styles.sectionTitle}>当前重点</Text>
            <Text style={styles.focusText}>
              {hasExplore ? `你正在探索方向：${savedDirection.title}` : "你正在进行面试训练：AI产品经理一面"}
            </Text>
            <Text style={styles.focusSubText}>{hasExplore ? `本周还有 ${todoExplore} 个探索任务待完成` : `当前训练任务完成 ${trainingDone}/3`}</Text>
          </View>
          <View style={styles.targetGraphic}>
            <MaterialIcons name="track-changes" size={58} color={colors.primary} />
          </View>
        </View>
        <Pressable onPress={() => router.push(hasExplore ? "/(tabs)/path" : "/interview/training")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>继续当前进度</Text>
          <MaterialIcons name="chevron-right" size={23} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.dualCards}>
        <ProgressCard
          icon="explore"
          title="我的探索路径"
          color={colors.primary}
          enabled={hasExplore}
          lines={hasExplore ? [
            ["当前方向：", savedDirection.title],
            ["匹配度：", savedDirection.match],
            ["本周任务：", `已完成 ${exploreDone}/4`],
            ["最近更新：", "今天"]
          ] : [["暂无记录", "去发现模块完成一次职业方向探索"]]}
          button="查看探索路径"
          onPress={() => router.push(hasExplore ? "/(tabs)/path" : "/explore/intro")}
        />
        <ProgressCard
          icon="bar-chart"
          title="我的面试训练"
          color={colors.accent}
          enabled={hasInterview}
          lines={hasInterview ? [
            ["最近复盘：", "AI产品经理一面"],
            ["训练任务：", `已完成 ${trainingDone}/3`],
            ["最近一次进步：", "回答结构更清晰"],
            ["仍需加强：", "结果量化表达"]
          ] : [["暂无记录", "上传面试资料后开始复盘"]]}
          button="查看训练进度"
          onPress={() => router.push(hasInterview ? "/interview/training" : "/interview/upload")}
        />
      </View>

      <View style={styles.growthCard}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.titleIcon, { backgroundColor: "#F0E9FF" }]}>
            <MaterialIcons name="workspace-premium" size={21} color={colors.accent} />
          </View>
          <Text style={styles.sectionTitle}>成长画像</Text>
        </View>
        <View style={styles.growthBody}>
          <View style={styles.skillList}>
            {[
              ["结构化表达", "up", colors.primary],
              ["沟通协作", "flat", colors.success],
              ["项目推进", "up", colors.warning],
              ["数据理解", "up", colors.accent],
              ["逻辑分析", "up", "#60A5FA"]
            ].map(([label, trend, color]) => (
              <View key={label} style={styles.skillRow}>
                <View style={[styles.skillIcon, { backgroundColor: `${color}16` }]}>
                  <MaterialIcons name="verified" size={16} color={color} />
                </View>
                <Text style={styles.skillText}>{label}</Text>
                <MaterialIcons name={trend === "up" ? "arrow-upward" : "remove"} size={17} color={trend === "up" ? colors.success : colors.gray} />
              </View>
            ))}
          </View>
          <View style={styles.radarWrap}>
            <AbilityRadarChart />
          </View>
        </View>
        <Text style={styles.growthHint}>这些标签会根据你的探索与训练记录持续更新。</Text>
      </View>

      <View style={styles.recordCard}>
        <RecordRow icon="manage-search" color={colors.primary} title="查看全部探索记录" onPress={() => router.push("/(tabs)/path")} />
        <RecordRow icon="question-answer" color={colors.accent} title="查看全部面试复盘" onPress={() => router.push("/(tabs)/interview")} />
        <RecordRow icon="self-improvement" color={colors.warning} title="查看成长轨迹" onPress={() => router.push("/interview/training")} last />
      </View>
    </Screen>
  );
}

function MiniBadge({ icon, text, color }: { icon: IconName; text: string; color: string }) {
  return (
    <View style={[styles.miniBadge, { backgroundColor: `${color}14` }]}>
      <MaterialIcons name={icon} size={16} color={color} />
      <Text style={[styles.miniBadgeText, { color }]}>{text}</Text>
    </View>
  );
}

function ProgressCard({ icon, title, color, enabled, lines, button, onPress }: { icon: IconName; title: string; color: string; enabled: boolean; lines: string[][]; button: string; onPress: () => void }) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.cardTitleRow}>
        <View style={[styles.titleIcon, { backgroundColor: `${color}16` }]}>
          <MaterialIcons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.smallCardTitle}>{title}</Text>
        <MaterialIcons name="chevron-right" size={24} color={colors.gray} />
      </View>
      <View style={styles.metricList}>
        {lines.map(([label, value]) => (
          <View key={label} style={styles.metricRow}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={[styles.metricValue, { color: enabled ? color : colors.muted }]} numberOfLines={1}>{value}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={onPress} style={[styles.outlineButton, { borderColor: color }]}>
        <Text style={[styles.outlineButtonText, { color }]}>{button}</Text>
        <MaterialIcons name="chevron-right" size={18} color={color} />
      </Pressable>
    </View>
  );
}

function RecordRow({ icon, color, title, onPress, last }: { icon: IconName; color: string; title: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.recordRow, last ? styles.recordRowLast : null]}>
      <View style={[styles.recordIcon, { backgroundColor: `${color}16` }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.recordText}>{title}</Text>
      <MaterialIcons name="chevron-right" size={25} color={colors.gray} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5EAF2",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    shadowColor: "#1F2937",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  avatarWrap: { position: "relative" },
  cameraBadge: { position: "absolute", right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, borderWidth: 2, borderColor: "#fff" },
  profileCopy: { flex: 1, gap: spacing.sm },
  name: { color: "#0B1D3A", fontSize: 30, lineHeight: 36, fontWeight: "900" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  miniBadge: { minHeight: 30, borderRadius: radius.pill, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", gap: 5 },
  miniBadgeText: { fontSize: 12, fontWeight: "900" },
  focusCard: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: "#F2F7FF", borderWidth: 1, borderColor: "#D9E8FF", gap: spacing.md, shadowColor: "#1F4FA3", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  focusHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  focusIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  focusCopy: { flex: 1, gap: 5 },
  sectionTitle: { color: "#0B1D3A", fontSize: 18, fontWeight: "900" },
  focusText: { color: "#0B1D3A", fontSize: 15, lineHeight: 22, fontWeight: "700" },
  focusSubText: { color: "#345077", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  targetGraphic: { width: 92, height: 74, alignItems: "center", justifyContent: "center" },
  primaryButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: "#0B63F6", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  dualCards: { flexDirection: "row", gap: spacing.md },
  progressCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5EAF2", gap: spacing.md, shadowColor: "#1F2937", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  titleIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  smallCardTitle: { flex: 1, color: "#0B1D3A", fontSize: 16, fontWeight: "900", lineHeight: 21 },
  metricList: { gap: spacing.sm },
  metricRow: { gap: 2 },
  metricLabel: { color: "#334155", fontSize: 12, lineHeight: 18, fontWeight: "800" },
  metricValue: { fontSize: 13, lineHeight: 19, fontWeight: "900" },
  outlineButton: { minHeight: 38, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 },
  outlineButtonText: { fontSize: 14, fontWeight: "900" },
  growthCard: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5EAF2", gap: spacing.md, shadowColor: "#1F2937", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  growthBody: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  skillList: { flex: 1, gap: spacing.sm },
  skillRow: { minHeight: 34, borderRadius: radius.sm, paddingHorizontal: spacing.sm, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5EAF2", flexDirection: "row", alignItems: "center", gap: spacing.sm },
  skillIcon: { width: 22, height: 22, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  skillText: { flex: 1, color: "#0B1D3A", fontSize: 13, fontWeight: "800" },
  radarWrap: { width: 160, alignItems: "center" },
  growthHint: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  recordCard: { borderRadius: radius.xl, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5EAF2", overflow: "hidden", shadowColor: "#1F2937", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  recordRow: { minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  recordRowLast: { borderBottomWidth: 0 },
  recordIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recordText: { flex: 1, color: "#0B1D3A", fontSize: 16, fontWeight: "900" }
});
