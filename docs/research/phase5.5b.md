# CrossMath Phase 5.5B — advanced mode comparison

This is research-only. No production UI, persistence, campaign, Daily flow,
reminders, banners, or onboarding code was changed.

## Status

Phase 5.5B research is complete enough for an architecture decision. The
recommended high-end architecture is hybrid equations plus a small bank with
deterministic distractors. The current production campaign remains untouched.

## Candidate comparison

The staged comparison used 20 requested samples per candidate. Every candidate
accepted 20/20; every accepted puzzle validated and had one solution.

| Candidate | Median generation | p90 | Max | Median density | Equations | Blanks | Waves | Ambiguity | Crossings |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dense binary | 904 ms | 2,094 ms | 4,399 ms | 0.317 | 8 | 7 | 4 | 9 | 8 |
| 3-operand long | 328 ms | 1,255 ms | 1,789 ms | 0.293 | 5 | 8 | 2 | 9 | 5 |
| Hybrid | 111 ms | 293 ms | 330 ms | 0.383 | 6 | 8 | 2 | 9 | 6 |

Binary remains the strongest pure propagation experiment, but it is too slow
and its 9-equation/9-blank hypothesis previously failed bounded generation.
Long expressions improve arithmetic structure and reduce generation time, but
the hybrid has the best visual density and the lowest generation cost in this
sample. Hybrid generation uses both binary and 3-operand equations in one
connected JSON-friendly puzzle and proves uniqueness with a shared solver.

Artifacts: `phase5.5b-comparison.json` contains the raw report and five hybrid
Lobachevsky representatives with ASCII grids, solutions, exact banks, and
bank+distractor analyses.

## Number Bank result

The five representative hybrid puzzles used a 20% deterministic distractor
rate. Exact-bank initial arithmetic ambiguity averaged roughly 2.0–3.7 values
per blank; adding distractors raised that to roughly 2.2–4.7 values per blank.
The exact bank therefore reveals substantial information, while a small
distractor set restores some placement uncertainty without adding nonsense.

Recommendation: DIFFERENT INPUT BY TRACK.

- Просто / Средне: keypad remains the clearest and fastest interaction for
  small, accessible boards.
- Сложно / Лобачевский: use BANK + DISTRACTORS as the research input concept;
  it reduces typing and supports repeated values while retaining ambiguity.
- Exact Bank remains useful as an accessibility/easy variant, not the default
  top-end challenge.

No touch, drag, or bank UI was implemented.

## Proposed four tracks

| Track | Core definition | Target structure | Logic target | Runtime strategy | Input concept |
| --- | --- | --- | --- | --- | --- |
| Просто | Binary `A OP B = C`; `+`/`−` | 4–5 equations, 3–5 blanks, density ≥0.18 | 1–2 forced starts, ~2 waves, low ambiguity | Runtime bounded | Keypad |
| Средне | Binary; progressively add `×` | 5–7 equations, 5–7 blanks, density ≥0.20 | 2–4 forced starts, 2–3 waves | Runtime bounded | Keypad |
| Сложно | Hybrid, mostly binary with selected long equations | 6–9 equations, 7–10 blanks, density ≈0.30–0.38 | Few obvious starts, 2–4 waves, ambiguity ≥8 | Prefer catalog for campaign | Bank + distractors |
| Лобачевский | Hybrid with 3+ long equations and dense crossings | 8–10 equations, 9–14 blanks where sustainable, density ≥0.35 | Low initial forcing, long dependencies, ambiguity ≥10 | Pregenerated campaign | Bank + distractors |

These are calibration targets, not promises that every level will hit every
number. The generator must record bounded failures and actual metrics.

## Pregenerated campaign feasibility

The research catalog builder supports levels 1–50, validates each entry, and
serializes a compact JSON catalog. The hybrid Lobachevsky prototype generated
all 50 requested levels in 17.2 seconds. All 50 validated, were unique, and
had no safety-limit hits. Average puzzle JSON was 4,754 bytes; the compact
catalog was 238,937 bytes.

Artifacts:

- `phase5.5b-lobachevsky-catalog.json` — research-only 50-level hybrid catalog;
- `phase5.5b-catalog-summary.json` — timing, size, and validation summary.

A full 50-level catalog is feasible as an offline build step and is not
reasonable as runtime gameplay generation. The catalog should contain only the
playable puzzle definition in a production build; research metadata can remain
outside the app bundle.

## Runtime strategy

- Campaign: pregenerated catalog, manually QA-able and zero solve-start
  generation delay.
- Daily standard: runtime deterministic Medium-like generation is acceptable.
- Daily Lobachevsky: use a pre-generated date window/cache or a lighter hybrid
  profile; do not block the opening path on a 3–5 second generator.
- Endless: runtime bounded generation with a fallback to a cached/pregenerated
  pool if a future product build needs a strict response-time guarantee.

## Daily Lobachevsky recommendation

Do not use the current heaviest binary profile synchronously. The best next
implementation is deterministic pre-generation for a rolling date window, with
the same date/mode/version seed identity. A lighter hybrid Daily profile is a
reasonable fallback when storage or release-process constraints rule out the
windowed catalog.

## Product follow-ups retained

1. Four-track production UI and independent progress.
2. Reminder default behavior and explicit permission/user-intent semantics.
3. Home banner bottom alignment under current ForestMusic DevTools rules.
4. Multiplication Table product/UI implementation.
