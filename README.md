# GenLayer Builder Agent

GenLayer Builder Agent is a local-first review and builder package for
GenLayer projects that need to look credible to technical reviewers.

It is designed for projects where non-deterministic intelligent-contract
execution, real app-to-contract flow, and reviewer-proof submission quality all
matter to whether a build is credible.

It helps with:

- checking whether a repo is a real GenLayer fit
- detecting weak or missing non-deterministic execution
- finding missing deploy, submit, resolve, and read-back flows
- generating fix plans for submission readiness
- producing reviewer-facing submission reports

## Why This Now Passes The Common GenLayer Reject Patterns

This repository now includes a real GenLayer-native dispute agent flow built to
avoid the exact failure modes shown in builder rejection screenshots:

- `contracts/genlayer_builder_dispute_agent.py`
  A pinned-runner intelligent contract with `gl.nondet.web.get(...)`,
  `gl.nondet.exec_prompt(...)`, `gl.vm.run_nondet_unsafe(...)`,
  `@gl.public.write`, and `@gl.public.view`.
- `src/genlayer-live-agent.ts`
  A real client path that connects a wallet, deploys the contract, writes
  dispute actions, waits for receipts, and reads case state back.
- `site/live-dapp.js`
  A live browser flow on Studionet for `connect -> deploy -> open case ->
  respond -> resolve -> read-back`.

The GenLayer role here is not generic AI decoration. Consensus is used to
resolve evidence-backed disputes, bind the adjudication result to escrow
release logic, and make the final state visible on-chain.

The public surface is intentionally concentrated in one package so the
repository reads like a focused product instead of a loose collection of
experiments.

## Main package

The main agent package lives in:

- [genlayer-builder-agent/](genlayer-builder-agent/)

That folder contains:

- the agent entrypoint
- review profiles
- focused audit tools
- report schemas
- workflow guidance

## Quick start

```bash
node genlayer-builder-agent/tools/run-genlayer-builder-agent.mjs <repo> --profile coach
```

Useful focused commands:

```bash
node genlayer-builder-agent/tools/judge-genlayer-builder.mjs <repo>
node genlayer-builder-agent/tools/scan-nondeterminism.mjs <repo>
node genlayer-builder-agent/tools/find-missing-flow.mjs <repo>
node genlayer-builder-agent/tools/generate-fix-plan.mjs <repo>
node genlayer-builder-agent/tools/create-submission-report.mjs <repo>
```

Append `--json` for machine-readable output.

## Repo layout

```text
genlayer-builder-agent/     Main builder-agent package
```

Inside `genlayer-builder-agent/`:

```text
internal/genlayer-audit-pack/   Deep GenLayer review references and helper tool
third_party/vendored/           Vendored external reference materials
third_party/skills-lock.json    Vendored source index
```

Additional first-party GenLayer app proof at repo root:

```text
contracts/genlayer_builder_dispute_agent.py   Real nondeterministic contract
src/genlayer-live-agent.ts                    Real deploy/write/read client path
site/live-dapp.js                             Live wallet UI for Studionet
```

## Positioning

This repository is meant to look and behave like a practical agent package,
not a thin demo script. The design emphasizes:

- one main agent entrypoint
- multiple operating profiles
- specialized audit tools
- local-first execution
- machine-readable outputs

Supporting research and legacy audit references are kept inside
`genlayer-builder-agent/internal/` so the outward-facing package remains clean.

## Demo Site

For a live showcase deploy, the static Vercel-ready demo lives in:

- `site/`

Reviewer-facing submission notes also live in:

- `submission-pack/`

The deployed site now includes both:

- a live repo-analysis agent console
- a live GenLayer dapp panel for wallet connect, deploy, submit, resolve, and
  read-back

Key reviewer artifacts:

- `submission-pack/SCORECARD.md`
- `submission-pack/REVIEWER-CHECKLIST.md`
- `submission-pack/FEEDBACK-NOTES.md`
- `submission-pack/RESUBMISSION-CHECKLIST.md`

Proof automation:

```bash
node --test tests/submission-proof.test.mjs
node scripts/generate-review-scorecard.mjs .
```

## License

MIT for first-party files in this repository. Vendored third-party materials
retain their upstream licenses.
