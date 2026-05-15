import { router } from "expo-router";
import { Text } from "react-native";
import { AppButton, Card, Screen, TaskCard, uiStyles } from "@/components/ui/primitives";
import { useAppStore } from "@/store/useAppStore";

export default function InterviewTab() {
  const { interviewReport, trainingTasks, updateTrainingTask } = useAppStore();

  return (
    <Screen navTitle="面试" activeTab="面试" title="面试复盘与训练" subtitle="上传面试资料，获得复盘报告和训练任务。">
      <Card accent>
        <Text style={uiStyles.itemTitle}>{interviewReport.title}</Text>
        <Text style={uiStyles.muted}>{interviewReport.conclusion}</Text>
        <AppButton title="上传新的面试资料" onPress={() => router.push("/interview/upload")} />
      </Card>
      {trainingTasks.map((task) => (
        <TaskCard key={task.id} title={task.title} description={task.description} status={task.status} onNext={() => updateTrainingTask(task.id, task.status === "未开始" ? "进行中" : "已完成")} />
      ))}
    </Screen>
  );
}
