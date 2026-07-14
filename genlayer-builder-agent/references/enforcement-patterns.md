# Outcome Patterns

GenLayer projects should close the loop on execution with something concrete.

Common acceptable patterns:

- non-deterministic contract reasoning plus persisted state update
- live evidence fetch plus validator-reviewed outcome
- subjective judgment plus on-chain resolution record
- app-triggered resolution plus read-back verification

Bad pattern:

- the app talks about GenLayer but nothing observable changes after contract
  execution or resolution
