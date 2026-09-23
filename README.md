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
| 1 Pure TS generator + solver + tests | PASS |
| 2 Difficulty profiles + modes | PASS |
| 3 Playable game board UI | PASS |
| 3.1 Responsive layout | PASS |
| 3.2 Difficulty tuning | PASS |
| 4 Progress / Daily / reminder / banner reservation | PASS |
| 5 Gameplay polish / onboarding / difficulty feel | PASS |
| 6 Ads / analytics / release | not started |

## Architecture notes

- Pure engine lives in `src/core/crossmath/` — **no React Native imports**.
- Daily crossword + local reminder («Кроссворд дня ждёт 🧩») with completed-today suppression.
- GameScreen reserves a sticky bottom banner slot (no Ad SDK yet).
- Interactive onboarding tutorial (`/onboarding`) — skippable, replayable from Settings/About.
- Banner layout slots on Home / Levels / Stats / Settings / About / training (no Ads SDK).
- Other our apps → RuStore ForestMusic developer catalog.
- ForestMusic DevTools baseline: **v1.0.0**
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
