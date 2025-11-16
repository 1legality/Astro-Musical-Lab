# Repository Guidelines

## Project Structure & Module Organization
Source files live under `src/`. Pages (Astro) go in `src/pages`, shareable layouts in `src/layouts`, and Markdown/MDX lives in `src/content`. React/TSX widgets (e.g., `ChordProgressionGenerator.tsx`, `StepSequencer16.tsx`) stay in `src/components`, while shared music logic (MIDI writer, synth utils) sits in `src/lib` and its `chords/` subfolder. Visual assets belong in `src/assets` and CSS utilities in `src/styles`. Public, unhashed assets (icons, audio, manifest) land in `public/`. Keep experiments out of `src/`; reuse the `tmp_*.py` scratchpad pattern at the root.

## Build, Test, and Development Commands
- `npm install`: installs dependencies; rerun after editing `package.json` or pulling lockfile changes.
- `npm run dev`: starts Astro dev server on `http://localhost:4321` with hot reload for Astro, React, and Tailwind sources.
- `npm run build`: type-checks and emits static assets in `dist/`; run before any PR.
- `npm run preview`: serves the `dist/` output to verify production behavior.
- `npm run astro -- check`: optional quicker lint/type pass before CI.

## Coding Style & Naming Conventions
Use TypeScript everywhere (Astro, React, utilities). Follow two-space indentation, single quotes, and trailing commas in multiline structures (match existing TS/TSX). Components and layouts stay PascalCase; helper modules use camelCase (e.g., `PianoRollDrawer`, `generateValidChordPattern`). Keep props and exported interfaces typed explicitly, and prefer Tailwind utility classes unless true globals belong in `src/styles/global.css`.

## Testing Guidelines
Automated tests are not yet wired up; rely on the commands above plus browser QA. For every feature, verify `npm run astro -- check`, a fresh `npm run build`, MIDI export/download using `ChordProgressionGenerator`, and playback through `SynthEngine`. When adding new validators or generators, drop TypeScript fixtures under `src/lib/**/__fixtures__` in anticipation of Vitest coverage and document manual steps in the PR.

## Commit & Pull Request Guidelines
Commits follow short, imperative summaries (`piano roll design`, `fix form on smaller screens`). Group related changes and avoid noisy refactors mixed with features. PRs should include a problem statement, summary of UI/UX changes, reproduction or verification steps, and screenshots/GIFs for visual work (sequences, piano roll, modals). Link relevant issues or TODO tickets and confirm `npm run build` success before requesting review.

## Security & Configuration Tips
`astro.config.mjs` already pins the production site to `https://lab.malandry.com`; keep environment-specific secrets in `.env` files ignored by Git, and never commit composer MIDI outputs that contain user data. When adding integrations or Vite plugins, document the impact on bundle size and confirm they are ESM-compatible for Astro 5.
