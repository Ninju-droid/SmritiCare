import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: Promise<NotificationsModule> | null = null;

export function getLocalNotifications(): Promise<NotificationsModule | null> {
  if (
    Platform.OS === "web" ||
    (Platform.OS === "android" && isRunningInExpoGo())
  ) {
    return Promise.resolve(null);
  }

  if (!notificationsModule) {
    notificationsModule = import("expo-notifications");
  }

  return notificationsModule;
}
