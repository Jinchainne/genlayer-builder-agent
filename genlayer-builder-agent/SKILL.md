---
name: genlayer-builder-agent
description: Judge whether a GitHub repo or local repo meets GenLayer project expectations and avoids the common rejection patterns: weak GenLayer fit, no meaningful non-deterministic execution, no real app-to-contract path, or thin reviewer proof. Use when building, reviewing, rewriting, documenting, or preparing any GenLayer repo, demo, tool, or agent for submission readiness.
---

# GenLayer Builder Agent

Use this skill as a readiness gate for any project that claims to be a real
GenLayer project.

Do not call a project ready if it only references GenLayer without proving a
real execution path.

## Core Rule

A valid GenLayer project should prove all of the following:

- the product is a strong GenLayer fit
- the contract performs meaningful non-deterministic work
- the non-deterministic result materially affects the product outcome
- the application or agent has a real path that exercises the contract
- the repo shows contract, app, README, and validation proof clearly
- a reviewer can verify the claims quickly

If those elements are missing, the project is not submission-ready.

## Required Working Mode

When using this skill:

1. audit the actual GenLayer fit first
2. audit the real contract and application path second
3. audit the reviewer proof third
4. only then improve README, pitch, or demo wording

Do not let branding hide missing integration.

## Two Rejection Patterns To Never Repeat

Reject the project internally if either of these is true.

### Pattern 1: GenLayer name-dropping without meaningful execution

Bad signs:

- the repo mentions GenLayer in the README only
- there is no meaningful non-deterministic adjudication, evidence fetch, or LLM-backed reasoning
- the contract could be replaced by a deterministic flow without changing the core product
- the project sounds GenLayer-native but the execution path is superficial

Required fix:

- implement a real GenLayer-native non-deterministic path
- prove the path changes the business outcome
- show the result being accepted, persisted, or read back in the product

### Pattern 2: Static UI or fake integration

Bad signs:

- the UI is screenshots, placeholders, mocks, or form-only scaffolding
- there is no real deploy, submit, resolve, or read-back call
- the repo has no execution path from user intent to contract action
- the project stops at explanation instead of real on-chain behavior

Required fix:

- implement a real end-to-end path
- execute an actual read or write against the GenLayer contract
- read the resulting state, receipt, or decision back into the app

## GenLayer Fit Test

Answer these before approving a project direction:

- does the product require judgment instead of only deterministic computation?
- does it evaluate evidence, language, ambiguity, quality, or real-world facts?
- does validator-reviewed non-deterministic execution materially change the outcome?
- would the core product lose its value if GenLayer were removed?

Strong fits:

- evidence adjudication
- disputes and claims
- milestone verification
- policy review
- prediction or oracle resolution with live evidence
- workflows where ambiguous real-world judgment must be persisted on-chain

Weak fits:

- generic AI chat
- dashboards with no meaningful contract execution
- deterministic CRUD apps
- static explainers for standards
- demos where GenLayer is branding only

Read [references/genlayer-project-fit.md](references/genlayer-project-fit.md)
when deciding whether a concept actually belongs on GenLayer.

## Required Technical Shape

The project should have all of these layers.

### 1. Real intelligent contract flow

The repo should show a believable contract lifecycle such as:

- deploy contract or import an existing one
- submit case, prompt, or claim on-chain
- resolve or execute via non-deterministic contract logic
- read resulting state back from chain

### 2. Real GenLayer-native non-determinism

At least one of these should be implemented for real:

- web evidence fetch
- LLM-backed structured judgment
- validator-reviewed non-deterministic path
- structured output persisted into contract state

The path must matter to execution, not just marketing.

### 3. Real application-to-contract integration path

The repo should contain code that performs actual operations such as:

- connect wallet
- deploy a contract
- submit or resolve through the contract
- read back the resulting state or receipt

Read [references/stack-proof.md](references/stack-proof.md) when auditing
code-level evidence.

## Reviewer Proof Requirements

A project is stronger when a reviewer can verify the claim quickly.

Always provide proof in these places:

### Code proof

Reviewers should be able to find:

- frontend or agent workflow file
- client or integration file
- contract logic
- tests or scripts that exercise the real path

### Demo proof

The demo should visibly show:

- what the project does
- which contract flow is active
- what action is executed on-chain
- what state, verdict, or receipt comes back

### README proof

The README should clearly state:

- what problem the project solves
- why it belongs on GenLayer
- what the actual flow is
- how to verify the repo locally

### Validation proof

The repo should include:

- runnable scripts or tests
- typecheck or lint if applicable
- CI or at least reviewer-visible verification commands

Read [references/reviewer-checklist.md](references/reviewer-checklist.md) for a
fast pass or fail review flow.

## README Rules

When writing or rewriting README content:

- lead with the GenLayer use case, not generic platform hype
- name the actual GenLayer primitives or contract behavior used
- explain the deploy, submit, resolve, and read-back lifecycle
- show where non-deterministic judgment happens
- keep verification commands short and scannable

Use [references/readme-pattern.md](references/readme-pattern.md) when rewriting
a README.

## Tool And Agent Build Rules

When using this skill for future tools or agents:

- prefer real contract interactions over screenshots
- prefer smaller working flows over broad fake roadmaps
- prefer visible execution proof over happy-path-only demos
- prefer concrete GenLayer language over abstract AI claims

## Tool Suite

This package includes a multi-tool workflow rather than a single command:

- `tools/run-genlayer-builder-agent.mjs`
  Use as the main entrypoint when you want a full agent-style review with profiles.
- `tools/judge-genlayer-builder.mjs`
  Use for the main PASS, BORDERLINE, or FAIL decision.
- `tools/scan-nondeterminism.mjs`
  Use when the main question is whether the contract does meaningful non-deterministic work.
- `tools/find-missing-flow.mjs`
  Use to diagnose missing deploy, submit, resolve, or read-back steps.
- `tools/generate-fix-plan.mjs`
  Use to turn audit gaps into a prioritized implementation plan.
- `tools/create-submission-report.mjs`
  Use to generate a reviewer-facing Markdown or JSON report.

Prefer starting with the main judge, then narrow into the specialized tools as
needed.

## Global Agent Patterns Behind This Design

This project intentionally borrows patterns that strong open-source agents use:

- a main entrypoint that can run across different review modes
- specialized tools for focused sub-tasks
- local-first execution against a real workspace
- machine-readable output for automation
- explicit agent guidance through `AGENTS.md`

Those choices are aligned with current open-source agent practice in projects
like OpenHands, CrewAI, Browser Use, and the `AGENTS.md` convention.

Read [references/enforcement-patterns.md](references/enforcement-patterns.md)
when deciding how a project should close the loop on execution and outcomes.

## Submission Readiness Checklist

Approve only if all are true:

- there is a real GenLayer fit
- meaningful non-deterministic execution is implemented for real
- the contract result changes product outcomes
- the repo contains a real app-to-contract path
- the result is read back, persisted, or otherwise made observable
- the README makes the verification path easy to understand
- reviewer-visible validation commands exist

## Fast Audit Procedure

When reviewing a GenLayer repo quickly:

1. inspect the contract for meaningful non-deterministic execution
2. inspect the client for deploy, read, and write behavior
3. inspect the app or agent flow for submit, resolve, and read-back behavior
4. inspect tests, scripts, or CI for runnable proof
5. inspect README for reviewer clarity

If any step fails, mark the repo as not yet ready and state exactly what is
missing.

## Final Gate

Do not certify a GenLayer project as ready unless it survives both of these
reviewer questions:

1. Where is the meaningful GenLayer-native non-deterministic result?
2. Where is the actual end-to-end path that exercises it?

If the answer is not obvious in code, demo, README, tests, and validation, the
project is not ready yet.
