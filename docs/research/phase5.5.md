# CrossMath Phase 5.5 research notes

This folder is intentionally small. It contains research conclusions and
representative measurements, not a generated campaign corpus.

## Current prototype

The additive API is in `src/core/crossmath/experimental.ts`:

- `getTrackProfile(track, levelWithinTrack)` and `deriveTrackSeed(...)` expose
  `easy`, `medium`, `hard`, and `lobachevsky` independently.
- `generateTrackPuzzle(...)` remains binary-only and bounded. It measures
  occupied bounding-box density, crossing cells, score, propagation waves,
  ambiguity, solver nodes, and generation attempts.
- `generateLongExpressionPuzzle(...)` is a separate JSON-friendly experiment
  with three operands and conventional precedence.
- `deriveNumberBank(...)` keeps repeated answers as repeated array items;
  `analyzeNumberBank(...)` compares exact and distractor banks without UI.
- `auditBinaryCeiling(...)` provides the repeatable binary-only ceiling probe.

## Representative observations

| Track / level | Result observed on development desktop | Evidence |
| --- | --- | --- |
| Просто 1 | 4 equations, 3 blanks, 3 crossings, score 19.13, 2 propagation waves, ~6 ms | bounded probe |
| Просто 25 | 4 equations, 3 blanks, 3 crossings, score 19.13, 2 waves, ~3 ms | bounded probe |
| Просто 50 | 5 equations, 4 blanks, 3 crossings, score 31.78, 2 waves, ~25 ms | bounded probe |
| Средне 1 | 5 equations, 5 blanks, 4 crossings, score 32.19, 2 waves, ~12 ms | bounded probe |
| Средне 25 | 5 equations, 6 blanks, 4 crossings, score 21.15, 2 waves, ~111 ms | bounded probe |
| Средне 50 | bounded failure with the current 30 candidate-attempt limit | bounded probe |
| Сложно 1 | 7 equations, 7 blanks, 6 crossings, score 61.29, 0 forced waves, 7 unresolved after logic, ~2.8 s | bounded probe |
| Сложно 25 | 8 equations, 6 accepted blanks, 7 crossings, score 37.02, 2 waves, ~9.6 s | bounded probe |
| Лобачевский 1 | 8 equations, 7 blanks, 6 crossings, score 52.34, 4 waves, 11 ambiguity observations, ~3.7 s | focused probe |
| Лобачевский 25/50 | not claimed yet; current binary targets need calibration/tuning before acceptance | bounded probe stopped after high-end runtime flag |

The first Lobachevsky hypothesis (9 equations / 9 blanks) failed within its
bounded search. The revised starting point (8 / 7) is materially more
interesting than the current production Expert profile, but it is also over
the one-second desktop warning budget. The binary solver still reports one
proof node and zero branches; the human-like analyzer is therefore the primary
complexity signal for this experiment.

## Product interpretation

The four-track access model is technically viable as an additive API, but the
current binary generator does not yet support a reliable 50-level top track.
The next product decision should compare calibrated binary and long-expression
corpora. A production migration should wait until Hard/Lobachevsky acceptance
rates, generation time, and within-track monotonicity are measured across at
least 500 accepted samples per track (preferably 1,000 if desktop runtime is
acceptable).

Number Bank is promising for interaction speed and repeated-value handling,
but an exact bank exposes the multiset of missing answers and can reduce
placement ambiguity. Distractors should therefore remain optional and small;
the prototype intentionally leaves touch layout and bank-aware human studies
out of this phase.

## Follow-up

- Keep reminder defaults unchanged; revisit permission/user-intent semantics in
  Phase 5.6.
- Recheck Home bottom-banner attachment during the later Cursor integration
  phase under current ForestMusic DevTools rules.
- Do not wire the experimental expression model or Number Bank into production
  GameScreen until the comparison is complete.
