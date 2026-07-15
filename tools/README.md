# GenLayer Builder Agent Tool Suite

This folder contains the main local-first tool suite for reviewing and
improving GenLayer repos.

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
node tools/run-genlayer-builder-agent.mjs <repo> --profile coach
node tools/judge-genlayer-builder.mjs <repo>
node tools/scan-nondeterminism.mjs <repo>
node tools/find-missing-flow.mjs <repo>
node tools/generate-fix-plan.mjs <repo>
node tools/create-submission-report.mjs <repo>
```

Append `--json` to any command for machine-readable output.

The commands in this folder are the public operator surface of the project.
All core tooling now lives directly at the repo root.

## Project Scripts

From the repo root:

```bash
npm run agent
npm run judge
npm run nondet
npm run flow
npm run plan
npm run report
```
