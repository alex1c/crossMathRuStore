# CrossMath core

`src/core/crossmath` is a pure TypeScript package. It has no React Native,
Expo, router, or native-module imports and runs directly under Jest/Node.

## Phase 1 rules and representation

- The only expression form is the unambiguous binary equation `A OP B = C`.
- Operators are stable IDs: `add`, `subtract`, `multiply`, and `divide`.
- Values are safe integers inside the puzzle's `arithmetic` bounds.
- Division by zero and non-integer division are rejected.
- Negative numbers are supported when the configured lower bound permits them;
  the default generator uses positive values.
- `Puzzle.grid.cells` is a JSON-friendly array. Missing coordinates are not
  playable cells. A number cell is either `fixed` with a clue value or `blank`
  with `null`.
- An `Equation` stores one canonical ordered five-cell path. Number cells are
  indexes 0, 2, and 4; the operator is index 1 and equals is index 3.

## Solver and uniqueness

The solver builds value domains, applies generalized arc consistency to every
arithmetic relation, and branches on the smallest remaining domain (MRV).
`countSolutions(puzzle, 2)` stops as soon as it finds two solutions. A safety
limit returns `status: 'safety-limit'` instead of claiming that no solution
exists. Solver metrics expose propagation steps, branches, nodes, and depth.

Uniqueness is always established by the solver after clue removal; the
generator's known full solution is not treated as proof.

## Deterministic generation

`generatePuzzle(seed, config)` uses a seeded PRNG and includes
`generatorVersion` in the derived seed. The generator first builds a connected
horizontal/vertical structure with number crossings, assigns valid arithmetic
triples, then hides clues only when the solver still reports exactly one
solution. Attempts are bounded by `maxGenerationAttempts` and failures throw
`PuzzleGenerationError`.

For daily foundations, pass a normalized date key and mode into
`deriveSeed(dateKey, generatorVersion, mode)` and use that result as the seed.
Timezone handling remains outside this core.

## Difficulty analysis

Phase 2 deliberately separates the proof solver from the human-like
difficulty analyzer. The solver may finish a puzzle in one CSP node after
repeated propagation; that does not mean that a player sees the entire chain
at once. The analyzer records simultaneous propagation waves:

- `initialForcedCells` and `forcedCellsByWave`;
- `propagationWaves` / `longestForcedChain`;
- candidate observations, ambiguity moments, and choice waves;
- blanks, clue ratio, equation/crossing density, operation mix, and numeric range;
- full-solver branches, nodes, and max depth as secondary evidence.

The deterministic score is 0..100 and never uses elapsed time:

```text
8  blank pressure
24 deduction pressure (1 - initial forced / blanks)
20 propagation-wave pressure
18 candidate ambiguity
10 unresolved-after-logic pressure
8  multiplication/division pressure
7  crossing structure
5  full-solver search pressure
```

Each component is normalized before weighting and the final score is rounded to
two decimals. `elapsedMs` remains a diagnostic performance metric only.

## Phase 3.2 tuned profiles

`getDifficultyProfile` and `generatePuzzleForProfile` provide bounded,
deterministic targeting:

- Easy: 9x9, 5 equations, three blanks, add/subtract, score 12..40. Campaign
  Easy progresses from 3 blanks to 5 blanks; its campaign score ceiling grows
  from 24 to 40 so the first level stays accessible without becoming a
  one-cell tutorial.
- Medium: 11x11, 5 equations, five blanks, add/subtract/multiply, score 20..46.
  Campaign Medium keeps five blanks and relies on the existing analyzer's
  propagation/ambiguity score for separation. The 101..150 adept tier uses
  six equations and five blanks with score 24..40.
- Hard: 13x13, 6 equations, four blanks, all operations, score 28..40.
- Expert: 15x15, 8 equations, six blanks, all operations, score 36..60.

Profiles generate valid candidates, analyze them, and accept only candidates in
their score range. Candidate attempts are bounded; failure throws
`DifficultyGenerationError`.

Phase 3.2 calibration on 1,000 accepted puzzles per profile produced median
scores of 20.26 / 30.32 / 33.28 / 47.54 for Easy / Medium / Hard / Expert.
All 4,000 accepted puzzles were valid, unique, and had zero safety-limit hits.
The measured median generation costs were 2 ms / 25 ms / 21 ms / 226.5 ms;
average costs were 2.96 ms / 35.85 ms / 28.11 ms / 312.04 ms. Candidate
acceptance rates were 73.9% / 62.6% / 27.9% / 56.2%. Full calibration is
reproducible with:

```bash
npm run test:crossmath:calibrate
```

Generation costs and acceptance rates are machine-specific diagnostics, not a
mobile performance guarantee. Hard and Expert profile definitions are kept
unchanged in this tuning pass.

## Deterministic modes

- `getCampaignGenerationProfile(level)` covers levels 1..250 in five bounded
  tiers: novice, amateur, adept, master, and expert. The seed includes the
  campaign level and generator version.
- `getDailyGenerationProfile(dateKey, mode)` supports `daily` and
  `daily-expert`; the normalized date, mode, and generator version determine
  the seed. Ordinary Daily targets Medium; Daily Expert targets Expert.
- `getEndlessGenerationProfile(progress)` advances Easy → Medium → Hard →
  Expert and caps at the validated Expert profile.
- `getMultiplicationTableGenerationProfile(table)` restricts the generator to
  multiplication and constrains factors to ×2..×9 or `mixed`, while retaining
  connected crossword structure.

## Binary-equation verdict

Binary equations are sufficient for a meaningful first Expert profile when
human-like propagation waves and candidate ambiguity are measured: the
calibrated Expert median has six blanks, three waves, eight average candidates,
and score 47.54 versus Medium 22.98. However, the full proof solver remains at
one node and zero branches across all profiles. Therefore binary equations are
`LIMITED`, not a final ceiling-proof Expert architecture. A future Phase 2B
should add longer expressions or richer crossing constraints only if deeper
branching is product-critical.

## Remaining limitations

There is no UI integration, daily scheduling, ads, analytics, notifications,
achievements, economy, or native code. Long-expression precedence is still not
implemented. Expert generation is deterministic and bounded but materially
slower than Easy; the measured cost is documented by the calibration output.

## Phase 5.6 production promotion

Accepted Phase 5.5 / 5.5B surfaces are promoted into production modules:

- `tracks.ts` — four independent difficulty tracks
- `hybrid.ts` — hybrid / long-expression helpers
- `numberBank.ts` — bank + distractors (multiplicity-preserving)
- `catalog.ts` — Lobachevsky `lobachevsky-v1` pregenerated catalog
- `trackGeneration.ts` — Easy/Medium/Hard runtime + Lobachevsky catalog load

`experimental.ts` remains as the shared implementation backend for research-
validated APIs (hybrid generator, expression evaluator, advanced banks).
Production screens and features import the promoted modules above, not
`docs/research/`. Research JSON under `docs/research/` is documentation only.

## Phase 5.5 experimental research surface (historical)

`experimental.ts` originally shipped as an additive research surface that was
not used by production campaign UI. Phase 5.6 wires accepted pieces through the
promoted modules listed above.

## Phase 5.5B advanced comparison

The research surface now also exposes an explicit `HybridPuzzle` model. A
hybrid combines canonical binary equations with 3-operand
`A OP B OP C = D` equations in one connected grid. `countHybridSolutions` and
`solveHybridPuzzle` use shared bounded domains, integer arithmetic, and the
same standard precedence rules as the long-expression solver.

`compareAdvancedCandidates` measures dense binary, pure-long, and hybrid
Lobachevsky candidates with acceptance, p90/max generation time, density,
crossings, blanks, waves, ambiguity, and solver nodes. The Phase 5.5B sample
accepted 20/20 for each candidate; hybrid had the best median density and
runtime, while binary produced the deepest propagation signal at the highest
cost.

`buildPregeneratedCampaignCatalog` and
`validatePregeneratedCampaignCatalog` are build-time research helpers only.
They can stop on an explicit time budget and report generated levels, failures,
JSON size, uniqueness, and safety-limit hits. They do not write persistence or
alter the existing 250-level campaign.
