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

## Phase 2 profiles

`getDifficultyProfile` and `generatePuzzleForProfile` provide bounded,
deterministic targeting:

- Easy: 9x9, 3 equations, one blank, add/subtract, score 0..12.
- Medium: 11x11, 5 equations, three blanks, add/subtract/multiply, score 14..30.
- Hard: 13x13, 6 equations, four blanks, all operations, score 28..40.
- Expert: 15x15, 8 equations, six blanks, all operations, score 36..60.

Profiles generate valid candidates, analyze them, and accept only candidates in
their score range. Candidate attempts are bounded; failure throws
`DifficultyGenerationError`.

Calibration on 1,000 accepted puzzles per profile produced median scores of
2.50 / 22.98 / 33.28 / 47.54 for Easy / Medium / Hard / Expert. All 4,000
accepted puzzles were valid, unique, and had zero safety-limit hits. Full
calibration is reproducible with:

```bash
npm run test:crossmath:calibrate
```

The measured median generation costs are 1 ms / 3 ms / 16 ms / 172.5 ms;
average costs are 0.57 ms / 3.60 ms / 21.63 ms / 239.11 ms. Candidate
acceptance rates are 100% / 56.3% / 27.9% / 56.2%. These are generation
costs on the calibration machine, not a mobile performance guarantee.

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
