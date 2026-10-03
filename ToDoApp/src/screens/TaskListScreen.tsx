import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TaskNotificationScheduler } from '../domain/TaskNotificationScheduler';
import { createTask, pauseTask, refreshTask, startTask } from '../domain/task';
import type { Task } from '../domain/task';

interface TaskListScreenProps {
  notificationScheduler: TaskNotificationScheduler;
  now: () => number;
}

export function TaskListScreen({ notificationScheduler, now }: TaskListScreenProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [inputError, setInputError] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const nextTaskId = useRef(0);
  const notificationIds = useRef(new Map<string, string>());

  const refreshTimers = useCallback(() => {
    const currentTime = now();
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        const refreshedTask = refreshTask(task, currentTime);
        if (refreshedTask.status === 'completed') {
          notificationIds.current.delete(task.id);
        }
        return refreshedTask;
      }),
    );
  }, [now]);

  useEffect(() => {
    const intervalId = setInterval(refreshTimers, 250);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshTimers();
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [refreshTimers]);

  function addTask() {
    try {
      const task = createTask({
        id: `task-${++nextTaskId.current}`,
        name: taskName,
        durationMinutes: Number(durationMinutes),
      });

      setTasks((currentTasks) => [...currentTasks, task]);
      setTaskName('');
      setDurationMinutes('');
      setInputError('');
    } catch {
      setInputError('Enter a task name and a positive whole number of minutes.');
    }
  }

  async function beginTask(task: Task) {
    const startedTask = startTask(task, now());
    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id ? startedTask : currentTask,
      ),
    );
    setNotificationMessage('');

    try {
      const previousNotificationId = notificationIds.current.get(task.id);
      if (previousNotificationId) {
        await notificationScheduler.cancelCompletion(previousNotificationId);
      }

      const notificationId = await notificationScheduler.scheduleCompletion(
        task.name,
        startedTask.remainingSeconds,
      );

      if (notificationId) {
        notificationIds.current.set(task.id, notificationId);
      } else {
        setNotificationMessage('Enable notifications in your device settings to receive task alerts.');
      }
    } catch {
      setNotificationMessage('The timer started, but its completion alert could not be scheduled.');
    }
  }

  async function stopTask(task: Task) {
    const pausedTask = pauseTask(task, now());
    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id ? pausedTask : currentTask,
      ),
    );

    if (pausedTask.status === 'completed') {
      return;
    }

    const notificationId = notificationIds.current.get(task.id);
    if (notificationId) {
      try {
        await notificationScheduler.cancelCompletion(notificationId);
      } catch {
        setNotificationMessage('The timer paused, but its completion alert could not be canceled.');
      }
      notificationIds.current.delete(task.id);
    }
  }

  const completedCount = tasks.filter((task) => task.status === 'completed').length;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MAKE TIME FOR WHAT MATTERS</Text>
          <Text style={styles.title}>To Do List</Text>
          <Text style={styles.subtitle}>
            {tasks.length === 0
              ? 'Plan a focus session, one task at a time.'
              : `${completedCount} of ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} completed`}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formHeading}>Add a task</Text>
          <TextInput
            accessibilityLabel="Task name"
            style={styles.input}
            value={taskName}
            onChangeText={setTaskName}
            placeholder="What needs your focus?"
            placeholderTextColor="#8B938D"
            returnKeyType="next"
          />
          <View style={styles.durationRow}>
            <TextInput
              accessibilityLabel="Duration in minutes"
              style={[styles.input, styles.durationInput]}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder="25"
              placeholderTextColor="#8B938D"
              keyboardType="number-pad"
              returnKeyType="done"
            />
            <Text style={styles.minutesLabel}>minutes</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add task"
              onPress={addTask}
              style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.addButtonText}>Add task</Text>
            </Pressable>
          </View>
          {inputError ? <Text accessibilityRole="alert" style={styles.errorText}>{inputError}</Text> : null}
        </View>

        <View style={styles.listHeadingRow}>
          <Text style={styles.listHeading}>Your checklist</Text>
          <Text style={styles.taskCount}>{tasks.length} {tasks.length === 1 ? 'ITEM' : 'ITEMS'}</Text>
        </View>

        {notificationMessage ? (
          <Text accessibilityRole="alert" style={styles.notificationMessage}>
            {notificationMessage}
          </Text>
        ) : null}

        {tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyMark}>✓</Text>
            <Text style={styles.emptyTitle}>A clear start</Text>
            <Text style={styles.emptyText}>Add a task above and set aside time to work on it.</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const isRunning = task.status === 'running';

              return (
                <View key={task.id} style={[styles.taskCard, isCompleted && styles.completedCard]}>
                  <View style={styles.taskMain}>
                    <View style={styles.taskTitleRow}>
                      <View
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Complete ${task.name}`}
                        accessibilityState={{ checked: isCompleted }}
                        style={[styles.checkbox, isCompleted && styles.checkedBox]}
                      >
                        {isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <Text style={[styles.taskName, isCompleted && styles.completedName]}>
                        {task.name}
                      </Text>
                    </View>
                    <View style={styles.taskDetails}>
                      <Text
                        accessibilityLabel={`Time remaining for ${task.name}`}
                        style={styles.timer}
                      >
                        {formatTime(task.remainingSeconds)}
                      </Text>
                      <Text style={styles.statusText}>
                        {isCompleted ? 'Completed' : isRunning ? 'In progress' : task.status === 'paused' ? 'Paused' : `${task.durationSeconds / 60} min session`}
                      </Text>
                    </View>
                  </View>

                  {!isCompleted ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${isRunning ? 'Pause' : 'Start'} ${task.name}`}
                      onPress={() => (isRunning ? void stopTask(task) : void beginTask(task))}
                      style={({ pressed }) => [
                        styles.timerButton,
                        isRunning && styles.pauseButton,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={[styles.timerButtonText, isRunning && styles.pauseButtonText]}>
                        {isRunning ? 'Pause' : 'Start'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F1E9' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 },
  header: { marginBottom: 28 },
  eyebrow: { color: '#6E7D71', fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  title: { color: '#183B32', fontSize: 38, fontWeight: '800', letterSpacing: -1.2, marginTop: 8 },
  subtitle: { color: '#65736C', fontSize: 15, lineHeight: 22, marginTop: 8 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E4DA',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#29392F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  formHeading: { color: '#263F35', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: {
    backgroundColor: '#F7F6F1',
    borderColor: '#E8E7DF',
    borderRadius: 12,
    borderWidth: 1,
    color: '#22382F',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  durationRow: { alignItems: 'center', flexDirection: 'row', marginTop: 10 },
  durationInput: { textAlign: 'center', width: 64 },
  minutesLabel: { color: '#6F7C74', fontSize: 14, marginLeft: 8 },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#1D5946',
    borderRadius: 12,
    justifyContent: 'center',
    marginLeft: 'auto',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  buttonPressed: { opacity: 0.78 },
  errorText: { color: '#B4493F', fontSize: 13, lineHeight: 18, marginTop: 10 },
  listHeadingRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 30,
  },
  listHeading: { color: '#263F35', fontSize: 19, fontWeight: '700' },
  taskCount: { color: '#8A938C', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#EBE9E0',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 174,
    padding: 24,
  },
  emptyMark: {
    alignItems: 'center',
    backgroundColor: '#D8E3DA',
    borderRadius: 18,
    color: '#28614B',
    fontSize: 20,
    fontWeight: '800',
    height: 36,
    lineHeight: 36,
    overflow: 'hidden',
    textAlign: 'center',
    width: 36,
  },
  emptyTitle: { color: '#365047', fontSize: 16, fontWeight: '700', marginTop: 13 },
  emptyText: { color: '#77827B', fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center' },
  taskList: { gap: 10 },
  taskCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E4DA',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 92,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  completedCard: { backgroundColor: '#F0F4EF', borderColor: '#DCE7DC' },
  taskMain: { flex: 1, marginRight: 10 },
  taskTitleRow: { alignItems: 'center', flexDirection: 'row' },
  checkbox: {
    alignItems: 'center',
    borderColor: '#B9C4BC',
    borderRadius: 7,
    borderWidth: 1.5,
    height: 21,
    justifyContent: 'center',
    marginRight: 10,
    width: 21,
  },
  checkedBox: { backgroundColor: '#39765C', borderColor: '#39765C' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', lineHeight: 17 },
  taskName: { color: '#273F35', flexShrink: 1, fontSize: 15, fontWeight: '700' },
  completedName: { color: '#78877D', textDecorationLine: 'line-through' },
  taskDetails: { alignItems: 'baseline', flexDirection: 'row', marginLeft: 31, marginTop: 8 },
  timer: { color: '#285541', fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '800' },
  statusText: { color: '#869189', fontSize: 11, marginLeft: 9 },
  timerButton: {
    alignItems: 'center',
    backgroundColor: '#E3EEE6',
    borderRadius: 11,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: 13,
  },
  pauseButton: { backgroundColor: '#F4E9DE' },
  timerButtonText: { color: '#24563F', fontSize: 13, fontWeight: '700' },
  pauseButtonText: { color: '#8D5632' },
  notificationMessage: {
    backgroundColor: '#FFF1E9',
    borderRadius: 10,
    color: '#945334',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    padding: 12,
  },
});
