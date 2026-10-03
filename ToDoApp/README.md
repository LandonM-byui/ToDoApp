# ToDoApp

An Expo and React Native to-do app written in TypeScript. Add a task with a name and duration in minutes, then start or pause its countdown. When a timer finishes, the task is checked off and the app schedules a local device notification.

## Requirements

- Node.js and npm
- Expo Go on a mobile device, or an Android emulator / iOS simulator

## Install and run

```sh
npm install
npm start
```

Scan the QR code with Expo Go, or launch a target with one of these commands:

```sh
npm run android
npm run ios
npm run web
```

The iOS simulator requires macOS. Expo Go can run the app on a physical iOS device. Allow notifications on the device to receive task completion alerts. These are scheduled local notifications, so they do not require a server or network connection. Tasks are held in memory and are cleared when the app is closed.

## Project layout

- `App.tsx` - composition root that connects the screen to the notification adapter.
- `src/screens/TaskListScreen.tsx` - task entry, checklist, and timer controls.
- `src/domain/task.ts` - task validation and timer rules.
- `src/domain/TaskNotificationScheduler.ts` - business-layer notification interface.
- `src/data/ExpoTaskNotificationScheduler.ts` - Expo notification implementation.
- `index.ts` - registers the root component with Expo.
- `app.json` - Expo app and platform configuration.
- `assets/` - app icons and web favicon.

## Tests

Run the full suite with `npm test -- --runInBand`. Run one test file with `npm test -- --runInBand src/domain/task.test.ts`. Type-check the app with `npm run typecheck`, and lint it with `npm run lint`.
