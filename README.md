# CrossMath / Математический кроссворд

Offline-first numeric crossword puzzle for Android / RuStore (ForestMusic).

**GitHub is the source of truth.**

## Paths

| Role | Path |
| --- | --- |
| Remote Cursor | `D:\PetProject\crossMathRuStore` |
| Local Codex / Android QA | `D:\petProject\crossMathRuStore` |
| GitHub (source of truth) | https://github.com/alex1c/crossMathRuStore |

Default branch: `main`

## Product

- **User-facing name:** Математический кроссворд
- **Internal name:** CrossMath
- **Package:** `com.calculatorplatform.crossmath`
- **Slug:** `crossMathRuStore`
- **Version:** `1.0.0` / versionCode `1`

## Stack

- Expo SDK 57
- React Native 0.86.x
- React 19.x
- TypeScript strict
- Expo Router
- Jest + ESLint
- `react-native-safe-area-context` (bottom safe area required)
- Light / dark theme tokens (architectural)

## Work split

| Role | Ownership |
| --- | --- |
| **Cursor** | Primary UI / integration development |
| **Codex** | Mathematical core, solver / generator, algorithmic tests, checkpoints, Android QA / root-cause / release verification |

Cursor budget is limited — do not spend it on Codex-owned math-core work.

## Phase status

| Phase | Status |
| --- | --- |
| 0 Bootstrap / scaffold | PASS |
| 1 Pure TS generator + solver + tests | not started |
| 2 Gameplay UI / levels | not started |

## Architecture notes

- Pure engine lives in `src/core/crossmath/` — **no React Native imports**.
- Daily crossword + reminder domain slot: `src/features/daily/` (reminder copy: «Кроссворд дня ждёт»). Notifications are **not** scheduled yet.
- Onboarding route is mandatory architecturally (`/onboarding`) — interactive tutorial later.
- Banner layout slots exist without Ads SDK / AppMetrica / secrets.
- Metro: **port 8081 only** (never hop to 8082/8083).
- Preferred AVD later: `ForestMusic_Fast_API35`. Prefer real device for QA. Do not launch Pixel_10 API 37 without need.
- Production AAB is **not** built in early phases.

## Scripts

```bash
npm start
npm run typecheck
npm run lint
npm test
```

Android pre-flight (safe checks only):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\android-qa.ps1
```

## Phase 0 intentionally not included

Generator, solver, difficulty engine, game grid, animations polish, achievements, economy, notification scheduling, Ads SDK, AppMetrica, backup, PDF, production signing / AAB, RuStore screenshots, icon design.
