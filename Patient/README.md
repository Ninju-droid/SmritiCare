# SmritiCare Patient App

An offline-first Expo app with a simple patient flow and caregiver-assisted setup.

## Run

```bash
npm install
npx expo start
```

For the web preview, run `npm run web`. Run the automated checks with `npm test`
and `npx tsc --noEmit`.

## Folder map

- `src/app/` — Expo Router screens and startup gate
- `src/components/` — shared buttons, text, and screen layout
- `src/data/` — patient records, local storage, seed data, and sync queue
- `src/engine/` — game difficulty and skill calculations
- `src/games/` — the three patient games
- `src/hooks/` — reminder scheduling and speech
- `src/i18n/` — English and Assamese strings
- `src/theme/` — shared colors, spacing, and text sizes
- `src/audio/` — recorded-audio lookup; no recordings are included yet

## Backend and content TODOs

- Replace the six-digit mock link with `POST /patients/link`.
- Implement upload/retry for queued records at `POST /sync`.
- Connect Help alerts to a caregiver service; SMS and push are not implemented.
- Add approved recordings under `assets/audio/{lang}/{key}.mp3`.
- Let caregivers choose familiar local photos at setup; emoji are placeholders.
- Adapt greetings for local festivals when trusted calendar data is available.
- Have a native Assamese speaker verify `src/i18n/as.ts`.
- Verify local reminder notifications in a native development build; Expo Go
  does not support every notification capability.
- Replace the demo patient, caregiver, reminders, and game content with linked
  patient data.

Pairing accepts any six digits and stores demo data. It is mock setup, not
authentication. The app is a support tool, not a medical device.
