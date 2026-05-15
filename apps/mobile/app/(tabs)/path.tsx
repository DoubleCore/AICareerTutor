import { router } from "expo-router";
import { Text } from "react-native";
import { AppButton, Card, Screen, StatusTag, TaskCard, uiStyles } from "@/components/ui/primitives";
import { useAppStore } from "@/store/useAppStore";

export default function PathTab() {
  const { directions, savedDirectionId, savedTasks, updateExploreTask } = useAppStore();
  const direction = directions.find((item) => item.id === savedDirectionId);

  return (
    <Screen navTitle="路径" activeTab="路径" title="我的探索路径" subtitle="从推荐方向开始，先做低成本探索。">
      {direction ? (
        <>
          <Card accent>
            <Text style={uiStyles.itemTitle}>{direction.title}</Text>
            <StatusTag label={direction.match} />
            <Text style={uiStyles.muted}>{direction.reason}</Text>
          </Card>
          {savedTasks.map((task) => (
            <TaskCard key={task.id} title={task.title} status={task.status} onNext={() => updateExploreTask(task.id, task.status === "未开始" ? "进行中" : "已完成")} />
          ))}
        </>
      ) : (
        <Card>
          <Text style={uiStyles.itemTitle}>还没有加入探索路径</Text>
          <Text style={uiStyles.muted}>先完成一次职业方向探索，我会把推荐方向转成可执行任务。</Text>
          <AppButton title="开始职业探索" onPress={() => router.push("/explore/intro")} />
        </Card>
      )}
    </Screen>
  );
}
