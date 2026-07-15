# GenLayer Builder Agent

GenLayer Builder Agent is a local-first agent package for reviewing,
diagnosing, and improving GenLayer repos before submission.

It is specifically aimed at GenLayer projects where meaningful non-deterministic
execution, real deploy-submit-resolve-read-back flow, and reviewer-visible
proof determine whether the repo looks submission-ready.

It is built around a practical workflow:

1. judge the repo
2. inspect non-determinism
3. find missing app-to-contract flow
4. generate a fix plan
5. produce a reviewer-facing report

The package is designed to feel like a real operator tool: one entrypoint,
clear profiles, narrow diagnostics, and outputs that can be reused in a build
or review pipeline.

## Why This Belongs On GenLayer

The strongest GenLayer use cases are workflows where validator-reviewed
non-deterministic judgment changes an on-chain outcome. This package now ships
with a companion dispute-resolution contract and client flow that demonstrate
that exact pattern:

- evidence-backed dispute adjudication
- `gl.nondet.web.get(...)` evidence fetches
- `gl.nondet.exec_prompt(...)` structured judgment
- `gl.vm.run_nondet_unsafe(...)` validator comparison
- deploy -> submit -> resolve -> read-back execution flow

That means the repository is no longer just describing adjudication in prose.
It now contains a concrete GenLayer-native path where consensus, evidence,
resolve logic, and execution binding all matter to the final state transition.

## Why this looks like a real agent project

This package follows patterns used by strong open-source agent systems:

- one main entrypoint with multiple operating profiles
- specialized tools for narrow sub-tasks
- local-first execution against a real workspace
- machine-readable JSON outputs
- explicit operator guidance through `AGENTS.md`
- a clean public package boundary with internal audit materials kept separate

## Main entrypoint

```bash
node tools/run-genlayer-builder-agent.mjs <repo> --profile coach
```

Profiles:

- `judge`
- `coach`
- `submission`

## Tool suite

```bash
node tools/judge-genlayer-builder.mjs <repo>
node tools/scan-nondeterminism.mjs <repo>
node tools/find-missing-flow.mjs <repo>
node tools/generate-fix-plan.mjs <repo>
node tools/create-submission-report.mjs <repo>
```

Append `--json` for machine-readable output.

## Scripts

```bash
npm run agent
npm run judge
npm run nondet
npm run flow
npm run plan
npm run report
```

## Output

The suite is designed to answer:

- is this a real GenLayer project?
- does the contract do meaningful non-deterministic work?
- is there a real deploy, submit, resolve, and read-back path?
- what is missing for submission readiness?

## Internal structure

- `tools/`
  executable commands
- `tools/lib/`
  shared repo-analysis logic
- `internal/genlayer-audit-pack/`
  deeper GenLayer review references and helper tooling kept behind the main package surface
- `profiles/`
  agent operating modes
- `schemas/`
  machine-readable output contracts
- `workflows/`
  recommended sequencing
- `references/`
  review guidance
- `third_party/vendored/`
  vendored external reference materials
