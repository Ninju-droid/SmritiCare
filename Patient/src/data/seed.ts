import * as Crypto from "expo-crypto";
import type { Patient, Reminder, Skills } from "./types";
import { getReminders, getSkills, savePatient, saveReminder, saveSkills } from "./repo";

export async function seedPatient(patient: Patient): Promise<void> {
  const reminders: Omit<Reminder, "id" | "patientId">[] = [
    {
      type: "medicine",
      title: "Morning tablet",
      time: "08:00",
      repeat: "daily",
    },
    {
      type: "water",
      title: "Drink water",
      time: "10:00",
      repeat: "daily",
    },
    {
      type: "medicine",
      title: "Lunch and tablet",
      time: "13:00",
      repeat: "daily",
    },
    {
      type: "activity",
      title: "Walk",
      time: "16:00",
      repeat: "daily",
    },
  ];
  const skills: Skills = {
    patientId: patient.id,
    memory: 3,
    attention: 3,
    routine: 3,
    updatedAt: new Date().toISOString(),
  };

  const savedReminders = await getReminders();

  for (const reminder of reminders) {
    const alreadySaved = savedReminders.some(
      (savedReminder) =>
        savedReminder.patientId === patient.id &&
        savedReminder.type === reminder.type &&
        savedReminder.title === reminder.title &&
        savedReminder.time === reminder.time,
    );
    if (!alreadySaved) {
      await saveReminder({
        ...reminder,
        id: Crypto.randomUUID(),
        patientId: patient.id,
      });
    }
  }

  if (!(await getSkills(patient.id))) {
    await saveSkills(skills);
  }

  await savePatient(patient);
}
