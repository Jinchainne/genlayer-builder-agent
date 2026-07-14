# GenLayer Builder Agent Tool Suite

This folder contains a small local-first tool suite for reviewing and improving
GenLayer repos.

## Tools

- `run-genlayer-builder-agent.mjs`
  Agent-style entrypoint with `judge`, `coach`, and `submission` profiles.
- `judge-genlayer-builder.mjs`
  Full repo verdict with evidence, risks, flow coverage, and top fixes.
- `scan-nondeterminism.mjs`
  Focused scan for non-deterministic contract execution and observable outcomes.
- `find-missing-flow.mjs`
  Checks whether deploy, submit, resolve, and read-back flows exist.
- `generate-fix-plan.mjs`
  Produces a prioritized repair plan for submission readiness.
- `create-submission-report.mjs`
  Generates a reviewer-friendly submission report in Markdown or JSON.

## Usage

```bash
node genlayer-builder-agent/tools/run-genlayer-builder-agent.mjs <repo> --profile coach
node genlayer-builder-agent/tools/judge-genlayer-builder.mjs <repo>
node genlayer-builder-agent/tools/scan-nondeterminism.mjs <repo>
node genlayer-builder-agent/tools/find-missing-flow.mjs <repo>
node genlayer-builder-agent/tools/generate-fix-plan.mjs <repo>
node genlayer-builder-agent/tools/create-submission-report.mjs <repo>
```

Append `--json` to any command for machine-readable output.

## Project Scripts

From `genlayer-builder-agent/`:

```bash
npm run agent
npm run judge
npm run nondet
npm run flow
npm run plan
npm run report
```
