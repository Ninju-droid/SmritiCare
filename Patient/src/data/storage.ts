import AsyncStorage from "@react-native-async-storage/async-storage";

export const storageKeys = {
  patient: "smriticare.patient",
  sessions: "smriticare.sessions",
  reminders: "smriticare.reminders",
  reminderLogs: "smriticare.reminderLogs",
  alerts: "smriticare.alerts",
  skills: "smriticare.skills",
  syncQueue: "smriticare.syncQueue",
  reminderScheduler: "smriticare.reminderScheduler",
} as const;

const storageErrorListeners = new Set<(hasError: boolean) => void>();

export function subscribeToStorageErrors(
  listener: (hasError: boolean) => void,
) {
  storageErrorListeners.add(listener);
  return () => {
    storageErrorListeners.delete(listener);
  };
}

export function reportStorageError(hasError: boolean) {
  for (const listener of storageErrorListeners) {
    listener(hasError);
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);

    if (value === null) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    reportStorageError(true);
    throw error;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    const serializedValue = JSON.stringify(value);

    if (serializedValue === undefined) {
      throw new Error(`The value for "${key}" could not be serialized.`);
    }

    await AsyncStorage.setItem(key, serializedValue);
    reportStorageError(false);
  } catch (error) {
    reportStorageError(true);
    throw error;
  }
}
