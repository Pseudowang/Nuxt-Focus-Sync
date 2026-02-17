# AGENTS.md

This file guides coding agents working in this repository.

## Project overview

- Framework: Nuxt 4 + Vue 3 (Composition API, `<script setup lang="ts">`).
- Styling: Tailwind CSS (custom palette in `tailwind.config.ts`).
- App entry: `app/app.vue` with components under `app/components/`.
- State: local composables in `app/composables/` with `ref`, `computed`, `watch`.

## Commands (npm)

- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:3000)
- Build: `npm run build`
- Generate (static): `npm run generate`
- Preview production build: `npm run preview`

## Lint / format

- No lint or format scripts are configured in `package.json`.
- No ESLint/Prettier configs were found.
- If you add linting, keep it aligned with existing no-semicolon, single-quote style.

## Tests

- No test runner is configured in `package.json`.
- There are no test files in the repo.
- Running a single test is not currently supported.
- If you add tests, document the single-test command here.

## Cursor / Copilot rules

- No Cursor rules found (`.cursor/rules/` or `.cursorrules`).
- No Copilot instructions found (`.github/copilot-instructions.md`).

## Repo layout

- `app/app.vue`: main layout and global styles.
- `app/components/`: UI components (PascalCase filenames).
- `app/composables/`: shared state and logic (use\* naming).
- `nuxt.config.ts`: Nuxt modules and settings.
- `tailwind.config.ts`: theme tokens and color palette.

## Code style guidelines

### Imports

- Order: external packages first, then local modules.
- Prefer Nuxt alias `~/` for app imports (example: `~/composables/usePomodoro`).
- Type-only imports use `import type`.

### Formatting

- Use single quotes for strings.
- Omit semicolons.
- Keep Vue SFC indentation at 2 spaces.
- In TS files, prefer 2-space indentation; if touching a 4-space block, match it unless you are reformatting the whole block.
- Use trailing commas in multiline objects/arrays.
- Keep Tailwind class lists in a single line unless they become unwieldy.

### Vue + Nuxt patterns

- Use `<script setup lang="ts">` for components and composables.
- Prefer Composition API (`ref`, `computed`, `watch`, `onMounted`).
- Use `useHead` for document metadata.
- Guard browser-only APIs with `typeof window === 'undefined'` in SSR contexts.
- Keep component state minimal; shared logic belongs in composables.

### Types

- Use `type` for unions and `interface` for object shapes.
- Prefer explicit types for shared state and composable returns.
- Avoid `any` unless it is required to resolve DOM/Node type conflicts.

### Naming

- Components: PascalCase (`ModeSwitcher.vue`).
- Composables: `useX` with a clear domain noun (`usePomodoro`).
- Refs: noun-based (`timeLeft`, `isRunning`, `stats`).
- Functions: verb-based (`startTimer`, `resetTimer`).
- Events: use descriptive handler names (`toggleTimer`).

### State and reactivity

- Use `ref` for primitives and `reactive` only when it improves readability.
- When mutating arrays/objects in refs, ensure updates trigger reactivity (replace arrays when filtering).
- For persistent state, keep serialization localized and resilient.

### Error handling

- Wrap `JSON.parse` in `try/catch` and log context on failure.
- Avoid swallowing errors silently; prefer `console.error` with a short message.
- Fail safely when SSR or missing storage APIs.

### Storage

- Local storage keys are namespaced (e.g., `pomodoro-stats`).
- Always check for `window` availability before accessing localStorage.
- Keep stored structures backward-compatible (guard for missing fields).

### UI and Tailwind

- Use Tailwind for layout, spacing, and typography.
- Prefer the project color tokens (`primary`, `secondary`, `accent`, `background`).
- Keep decorative/ambient effects in `app/app.vue` unless a component needs local styles.
- Use scoped `<style>` blocks only for component-specific custom CSS.

### Accessibility & UX

- Buttons should include `title` attributes when icon-only.
- Ensure focus styles are visible (Tailwind ring utilities).
- Keep text contrast readable on gradient backgrounds.

## Adding new features

- Create composables for shared logic; keep components focused on UI.
- Keep SSR safety in mind for browser APIs.
- If adding new commands (lint/test), update this file.

## Quick checklist before committing

- App still runs via `npm run dev`.
- Build succeeds with `npm run build`.
- No new lint/test steps required (or documented if added).
