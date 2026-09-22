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

## Phase 1 limitations

There is no long-expression precedence, difficulty label, UI integration,
daily scheduling, ads, analytics, or native code. Those belong to later
phases. The current generator intentionally favors a small reliable connected
structure over arbitrary board shapes.
