# videPomo

videPomo is a glassmorphism-style Pomodoro app built with Nuxt 4 and Vue 3. It combines timer modes, task management, focus analytics, local persistence, and Google Calendar sync.

## Overview

- Focus workflow with four modes: Focus, Short Break, Long Break, and Flow
- Task management with tags and current-focus selection
- Daily analytics: focus time, streak, recent activity, and visual insights
- Local-first data storage using IndexedDB (Dexie)
- Optional Google sign-in and Google Calendar event sync

## Features

- Multi-mode timer with dynamic UI feedback per mode
- Task lifecycle: add, edit, complete, restore, delete
- Tag-aware task organization and focus session labeling
- Profile panel with:
  - total focus time
  - daily progress
  - tag allocation chart
  - productivity heatmap
  - recent activity timeline
- Guest-to-account data migration on Google sign-in

## Tech Stack

- Nuxt 4
- Vue 3 (`<script setup lang="ts">`, Composition API)
- Tailwind CSS
- Dexie (IndexedDB wrapper)
- H3 server routes for Google OAuth + Calendar API

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

```bash
cp .env.example .env
```

Then update `.env` with your Google OAuth credentials.

### 3) Start the development server

```bash
npm run dev
```

App URL: `http://localhost:3000`

## Environment Variables

| Variable | Description |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL (local default: `http://localhost:3000/api/auth/google/callback`) |
| `GOOGLE_CALENDAR_ID` | Target Google Calendar ID (default: `primary`) |
| `SESSION_SECRET` | Server-side session signing secret (use a strong value in production) |
| `APP_BASE_URL` | Public base URL of the app |
| `NUXT_PUBLIC_GOOGLE_CALENDAR_SCOPE` | OAuth scope for Google Calendar access |

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run generate  # Generate static output
npm run preview   # Preview production build
```

## Project Structure

```text
app/
  app.vue
  components/
  composables/
server/
  api/auth/google/
  api/calendar/events.post.ts
  utils/googleAuth.ts
```

## Data and Sync Behavior

- When signed out, data is stored locally in IndexedDB under a guest user.
- On Google sign-in, users can choose whether to migrate guest data.
- Completed sessions can be synced to Google Calendar.

## Current Notes

- No lint script is configured.
- No test runner is configured.

## License

Add your preferred license (for example, MIT) before publishing.
