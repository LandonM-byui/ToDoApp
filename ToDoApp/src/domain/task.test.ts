import { createTask, pauseTask, refreshTask, startTask } from './task';

describe('createTask', () => {
  it('trims the name and converts minutes to seconds', () => {
    const task = createTask({ id: 'task-1', name: '  Read  ', durationMinutes: 2 });

    expect(task).toEqual({
      id: 'task-1',
      name: 'Read',
      durationSeconds: 120,
      remainingSeconds: 120,
      status: 'ready',
    });
  });

  it('rejects a name containing only whitespace', () => {
    expect(() => createTask({ id: 'task-1', name: '  ', durationMinutes: 1 })).toThrow(
      'Task name is required',
    );
  });

  it('rejects a duration that is not a positive whole number of minutes', () => {
    expect(() => createTask({ id: 'task-1', name: 'Read', durationMinutes: 0 })).toThrow(
      'Duration must be a positive whole number of minutes',
    );
    expect(() => createTask({ id: 'task-1', name: 'Read', durationMinutes: 1.5 })).toThrow(
      'Duration must be a positive whole number of minutes',
    );
  });
});

describe('task timer transitions', () => {
  const task = createTask({ id: 'task-1', name: 'Read', durationMinutes: 1 });

  it('starts a timer using an absolute end time', () => {
    expect(startTask(task, 1_000)).toEqual({
      ...task,
      status: 'running',
      endsAt: 61_000,
    });
  });

  it('pauses with the remaining whole seconds rounded up', () => {
    const runningTask = startTask(task, 1_000);

    expect(pauseTask(runningTask, 26_800)).toEqual({
      ...task,
      remainingSeconds: 35,
      status: 'paused',
    });
  });

  it('keeps a running task active while time remains', () => {
    const runningTask = startTask(task, 1_000);

    expect(refreshTask(runningTask, 60_999)).toEqual({
      ...runningTask,
      remainingSeconds: 1,
    });
  });

  it('marks a running task complete when its end time is reached', () => {
    const runningTask = startTask(task, 1_000);

    expect(refreshTask(runningTask, 61_000)).toEqual({
      ...task,
      remainingSeconds: 0,
      status: 'completed',
    });
  });

  it('does not change a paused task when the clock advances', () => {
    const pausedTask = pauseTask(startTask(task, 1_000), 26_800);

    expect(refreshTask(pausedTask, 90_000)).toEqual(pausedTask);
  });
});
