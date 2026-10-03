import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { TaskNotificationScheduler } from '../domain/TaskNotificationScheduler';
import { TaskListScreen } from './TaskListScreen';

describe('<TaskListScreen />', () => {
  let currentTime: number;
  let scheduler: jest.Mocked<TaskNotificationScheduler>;

  beforeEach(() => {
    currentTime = 1_000;
    scheduler = {
      scheduleCompletion: jest.fn().mockResolvedValue('notification-1'),
      cancelCompletion: jest.fn().mockResolvedValue(undefined),
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the title and task entry fields', async () => {
    const { getByText, getByLabelText } = await render(
      <TaskListScreen notificationScheduler={scheduler} now={() => currentTime} />,
    );

    expect(getByText('To Do List')).toBeTruthy();
    expect(getByLabelText('Task name')).toBeTruthy();
    expect(getByLabelText('Duration in minutes')).toBeTruthy();
  });

  it('adds a task with its name and duration to the checklist', async () => {
    const { getByLabelText, getByText, getByRole } = await render(
      <TaskListScreen notificationScheduler={scheduler} now={() => currentTime} />,
    );

    await fireEvent.changeText(getByLabelText('Task name'), 'Read a chapter');
    await fireEvent.changeText(getByLabelText('Duration in minutes'), '2');
    await fireEvent.press(getByRole('button', { name: 'Add task' }));

    expect(getByText('Read a chapter')).toBeTruthy();
    expect(getByLabelText('Time remaining for Read a chapter').props.children).toBe('02:00');
    expect(getByLabelText('Complete Read a chapter').props.accessibilityState)
      .toEqual({ checked: false });
  });

  it('starts a countdown and pauses with the updated remaining time', async () => {
    const { getByLabelText, getByRole, getByText } = await render(
      <TaskListScreen notificationScheduler={scheduler} now={() => currentTime} />,
    );
    await fireEvent.changeText(getByLabelText('Task name'), 'Read a chapter');
    await fireEvent.changeText(getByLabelText('Duration in minutes'), '1');
    await fireEvent.press(getByRole('button', { name: 'Add task' }));
    await fireEvent.press(getByRole('button', { name: 'Start Read a chapter' }));

    await waitFor(() => {
      expect(scheduler.scheduleCompletion).toHaveBeenCalledWith('Read a chapter', 60);
    });

    currentTime = 26_800;
    await fireEvent.press(getByRole('button', { name: 'Pause Read a chapter' }));

    expect(getByLabelText('Time remaining for Read a chapter').props.children).toBe('00:35');
    expect(getByText('Paused')).toBeTruthy();
    expect(scheduler.cancelCompletion).toHaveBeenCalledWith('notification-1');
  });

  it('checks the task when its timer reaches zero', async () => {
    const { getByLabelText, getByRole, getByText } = await render(
      <TaskListScreen notificationScheduler={scheduler} now={() => currentTime} />,
    );
    await fireEvent.changeText(getByLabelText('Task name'), 'Read a chapter');
    await fireEvent.changeText(getByLabelText('Duration in minutes'), '1');
    await fireEvent.press(getByRole('button', { name: 'Add task' }));
    await fireEvent.press(getByRole('button', { name: 'Start Read a chapter' }));
    await waitFor(() => expect(scheduler.scheduleCompletion).toHaveBeenCalled());

    currentTime = 61_000;
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    expect(getByText('Completed')).toBeTruthy();
    expect(getByLabelText('Complete Read a chapter').props.accessibilityState)
      .toEqual({ checked: true });
  });

  it('shows input feedback for an invalid task', async () => {
    const { getByLabelText, getByRole, getByText } = await render(
      <TaskListScreen notificationScheduler={scheduler} now={() => currentTime} />,
    );

    await fireEvent.changeText(getByLabelText('Duration in minutes'), '0');
    await fireEvent.press(getByRole('button', { name: 'Add task' }));

    expect(getByText('Enter a task name and a positive whole number of minutes.')).toBeTruthy();
  });
});
