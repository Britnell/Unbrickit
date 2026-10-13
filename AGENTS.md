# Unbrickit

a fun web-app to run on an old smartphone

- customiseable clock
- work timers & sedentary reminders
- play podcast & radio
- voice commands - hotword + dictation + TTS
- ai posture detection
- all ai running locally on phone

react app:

## Source structure

- `react.html`, `src/fonts.css`, `src/style.css`, `assett/`
- `src/react/App.tsx` , `src/react/main.tsx`
- `src/react/component/` - React UI components for menu views (one per feature: Clock, Radio, Podcast, Pomodoro, Posture, Chat, etc.)
- `src/react/lib/atoms.ts` - jotai atoms for shared state
- `src/react/lib/` - helpers, custom-hooks, anything else
- `src/react/posture/` - ai posture detection engine: face landmarks, signal processing & detection
- `src/react/audio/` - audio: tone, speech (TTS), dictation
- `src/react/chat/` - voice chat, wake word detection, commands
