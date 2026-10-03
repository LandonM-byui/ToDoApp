import { StatusBar } from 'expo-status-bar';
import { ExpoTaskNotificationScheduler } from './src/data/ExpoTaskNotificationScheduler';
import { TaskListScreen } from './src/screens/TaskListScreen';

const notificationScheduler = new ExpoTaskNotificationScheduler();

export default function App() {
  return (
    <>
      <TaskListScreen notificationScheduler={notificationScheduler} now={Date.now} />
      <StatusBar style="auto" />
    </>
  );
}
