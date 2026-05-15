import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton, Card, Screen, SegmentedTabs, StatusTag, uiStyles } from "@/components/ui/primitives";
import { colors, radius, spacing } from "@/constants/theme";
import { useAppStore, useSelectedDirection } from "@/store/useAppStore";
import { ExploreTask, TaskStatus } from "@/types/domain";

const nextStatus: Record<TaskStatus, TaskStatus> = {
  未开始: "进行中",
  进行中: "已完成",
  已完成: "未开始"
};

const taskIcons = ["find-in-page", "menu-book", "article", "edit"] as const;

function SectionTitle({ icon, title }: { icon: keyof typeof MaterialIcons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIcon}>
        <MaterialIcons name={icon} size={17} color="#fff" />
      </View>
      <Text style={uiStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

function TaskStatusButton({ status, onPress }: { status: TaskStatus; onPress: () => void }) {
  const statusStyle = status === "已完成" ? styles.statusDone : status === "进行中" ? styles.statusDoing : styles.statusTodo;
  return (
    <Pressable onPress={onPress} style={[styles.statusButton, statusStyle]}>
      <Text style={[styles.statusButtonText, status !== "未开始" ? styles.statusButtonTextActive : null]}>{status}</Text>
    </Pressable>
  );
}

export default function ExplorePath() {
  const [saved, setSaved] = useState(false);
  const [tasksByDirection, setTasksByDirection] = useState<Record<string, ExploreTask[]>>({});
  const direction = useSelectedDirection();
  const { directions, setSelectedDirection, saveCurrentPath } = useAppStore();
  const currentTasks = tasksByDirection[direction.id] ?? direction.weeklyTasks;

  const updateTaskStatus = (taskId: string) => {
    const sourceTasks = tasksByDirection[direction.id] ?? direction.weeklyTasks;
    setTasksByDirection((state) => ({
      ...state,
      [direction.id]: sourceTasks.map((task) => (task.id === taskId ? { ...task, status: nextStatus[task.status] } : task))
    }));
  };

  const save = () => {
    saveCurrentPath(currentTasks);
    setSaved(true);
  };

  return (
    <Screen
      navTitle="路径"
      activeTab="路径"
      backTo="/explore/result"
      title="路径"
      subtitle="从推荐方向开始，先做低成本探索。"
      footerAboveTab
      footer={
        <View>
          <AppButton title={saved ? "已加入我的探索路径" : "加入我的探索路径"} onPress={saved ? () => router.replace("/(tabs)/me") : save} />
          <Text style={[uiStyles.muted, styles.footerTip]}>{saved ? "已加入你的探索路径，可在“我的”中持续查看和更新" : "加入后可在“我的”中持续查看和更新"}</Text>
        </View>
      }
    >
      <Card accent style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>当前探索方向</Text>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>{direction.title}</Text>
              <StatusTag label={direction.match} />
            </View>
            <Text style={uiStyles.muted}>这是当前与你的背景、兴趣和经历匹配度最高的方向，你也可以切换查看其他推荐方向。</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <View style={styles.heroIcon}>
              <MaterialIcons name="near-me" size={38} color="#fff" />
            </View>
          </View>
        </View>
      </Card>

      <SegmentedTabs items={directions.map((item) => item.title)} value={direction.title} onChange={(title) => setSelectedDirection(directions.find((item) => item.title === title)?.id ?? direction.id)} />

      <Card>
        <SectionTitle icon="stars" title="为什么建议你先试这个方向" />
        <View style={styles.reasonBox}>
          {direction.whyFirst.map((item) => (
            <View key={item} style={styles.reasonRow}>
              <MaterialIcons name="check-circle" size={18} color={colors.primary} />
              <Text style={styles.reasonText}>{item}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle icon="diamond" title="建议先补的能力" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.abilityRail}>
          {direction.abilitiesToBuild.map((ability, index) => (
            <View key={ability.title} style={[styles.abilityCard, index === direction.abilitiesToBuild.length - 1 ? styles.abilityCardLast : null]}>
              <View style={styles.abilityTopRow}>
                <View style={styles.abilityIcon}>
                  <MaterialIcons name="workspace-premium" size={17} color="#fff" />
                </View>
                <Text style={styles.abilityTitle} numberOfLines={2}>{ability.title}</Text>
              </View>
              <Text style={styles.abilityDescription} numberOfLines={3}>{ability.description}</Text>
            </View>
          ))}
        </ScrollView>
      </Card>

      <Card>
        <SectionTitle icon="event-available" title="本周探索任务" />
        <View style={styles.taskList}>
          {currentTasks.map((task, index) => (
            <View key={task.id} style={[styles.taskRow, index === currentTasks.length - 1 ? styles.taskRowLast : null]}>
              <View style={styles.taskIcon}>
                <MaterialIcons name={taskIcons[index] ?? "task-alt"} size={20} color={colors.primary} />
              </View>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <TaskStatusButton status={task.status} onPress={() => updateTaskStatus(task.id)} />
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.tipCard}>
        <View style={styles.tipIcon}>
          <MaterialIcons name="lightbulb" size={22} color={colors.accent} />
        </View>
        <Text style={styles.tipText}>先不用着急判断这个方向是不是“最终选择”，更重要的是通过一小步行动，验证它是否适合你。</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderColor: "#93C5FD"
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  heroText: {
    flex: 1,
    gap: spacing.sm
  },
  heroEyebrow: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900"
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE"
  },
  heroIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  reasonBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: "#fff"
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  reasonText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600"
  },
  abilityRail: {
    paddingRight: spacing.xs
  },
  abilityCard: {
    width: 146,
    minHeight: 104,
    marginRight: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    padding: spacing.md,
    gap: spacing.sm
  },
  abilityCardLast: {
    marginRight: 0
  },
  abilityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  abilityIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  abilityTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17
  },
  abilityDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  taskList: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: "#fff"
  },
  taskRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  taskRowLast: {
    borderBottomWidth: 0
  },
  taskIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  taskTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  statusButton: {
    minHeight: 28,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  statusTodo: {
    backgroundColor: "#F3F4F6"
  },
  statusDoing: {
    backgroundColor: colors.primarySoft
  },
  statusDone: {
    backgroundColor: "#DCFCE7"
  },
  statusButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  statusButtonTextActive: {
    color: colors.primary
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#DDD6FE",
    backgroundColor: "#F5F3FF"
  },
  tipIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDE9FE"
  },
  tipText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 22
  },
  footerTip: {
    textAlign: "center",
    marginTop: spacing.sm
  }
});
