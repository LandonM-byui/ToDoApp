export interface TaskNotificationScheduler {
  scheduleCompletion(taskName: string, remainingSeconds: number): Promise<string | null>;
  cancelCompletion(notificationId: string): Promise<void>;
}
