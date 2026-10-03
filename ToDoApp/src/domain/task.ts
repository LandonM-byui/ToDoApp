export type TaskStatus = 'ready' | 'running' | 'paused' | 'completed';

export interface Task {
  id: string;
  name: string;
  durationSeconds: number;
  remainingSeconds: number;
  status: TaskStatus;
  endsAt?: number;
}

export interface CreateTaskInput {
  id: string;
  name: string;
  durationMinutes: number;
}

const SECONDS_PER_MINUTE = 60;

export function createTask({ id, name, durationMinutes }: CreateTaskInput): Task {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('Task name is required');
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error('Duration must be a positive whole number of minutes');
  }

  const durationSeconds = durationMinutes * SECONDS_PER_MINUTE;

  return {
    id,
    name: trimmedName,
    durationSeconds,
    remainingSeconds: durationSeconds,
    status: 'ready',
  };
}

export function startTask(task: Task, now: number): Task {
  if (task.status === 'completed' || task.status === 'running') {
    return task;
  }

  return {
    ...task,
    status: 'running',
    endsAt: now + task.remainingSeconds * 1_000,
  };
}

export function pauseTask(task: Task, now: number): Task {
  if (task.status !== 'running' || task.endsAt === undefined) {
    return task;
  }

  const remainingSeconds = Math.max(0, Math.ceil((task.endsAt - now) / 1_000));

  if (remainingSeconds === 0) {
    return { ...task, remainingSeconds: 0, status: 'completed', endsAt: undefined };
  }

  return { ...task, remainingSeconds, status: 'paused', endsAt: undefined };
}

export function refreshTask(task: Task, now: number): Task {
  if (task.status !== 'running' || task.endsAt === undefined) {
    return task;
  }

  const remainingSeconds = Math.max(0, Math.ceil((task.endsAt - now) / 1_000));

  if (remainingSeconds === 0) {
    return { ...task, remainingSeconds: 0, status: 'completed', endsAt: undefined };
  }

  return { ...task, remainingSeconds };
}
