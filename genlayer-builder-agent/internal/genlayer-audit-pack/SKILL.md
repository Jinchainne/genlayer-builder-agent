---
name: genlayer-builder-deep-audit
description: Enforce GenLayer builder-project requirements for repos, demos, tools, and agents. Use when building, reviewing, rewriting, documenting, or preparing any GenLayer project so the result matches GenLayer-native expectations: strong adjudication fit, meaningful non-deterministic intelligent-contract execution, real app-to-contract workflow, real contract reads and writes, persisted on-chain outcomes, reviewer-friendly README and demo proof, and clean validation signals. Also use when preventing or fixing the two common rejection patterns: (1) deterministic-only contracts with no meaningful GenLayer consensus result, and (2) static UI or CLI-only repos without a real GenLayer client path that reads and writes the submitted contract and binds policy results to execution.
---

# GenLayer Builder Deep Audit Pack

Use this skill as a hard readiness gate for any GenLayer project.

Do not call a project ready if it fails the checks in this skill.

## Core Rule

A valid GenLayer builder project should prove all of the following:

- the product solves a problem that benefits from GenLayer adjudication
- the intelligent contract performs meaningful non-deterministic work
- the non-deterministic result is validated through GenLayer consensus primitives
- the application has a real app-to-contract workflow
- the frontend, tool, or agent reads from and writes to the actual contract
- the result is bound to execution and persisted in contract state
- the repo contains reviewer-visible proof in code, demo, README, tests, and validation commands

If any one of those is missing, the project is not submission-ready.

## Required Working Mode

When using this skill:

1. audit the GenLayer fit first
2. audit the real contract flow second
3. audit the reviewer proof third
4. only then improve wording, README, demo copy, or branding

Do not let presentation improvements hide product or contract gaps.

## Two Rejection Patterns To Never Repeat

Reject the project internally if either of these is true.

### Pattern 1: Deterministic-only submission

Bad signs:

- the reviewed contract is mostly deterministic business logic
- GenLayer is mentioned, but the outcome does not depend on meaningful non-deterministic adjudication
- there is no validator-reviewed reasoning path
- the contract could be replaced by a normal EVM contract without changing the core product

Required fix:

- add a real intelligent-contract path using web access and/or LLM judgment
- ensure the result matters to the business outcome
- ensure the result is validated through GenLayer consensus semantics

### Pattern 2: Static UI or fake integration

Bad signs:

- the UI only shows static contract details, placeholder verdicts, screenshots, or CLI instructions
- there is no real GenLayer client path
- no actual contract deployment or import flow exists
- no real read/write calls are made to the contract
- policy or adjudication output is shown in UI only and is not bound to execution or persisted on-chain

Required fix:

- implement a real client path that deploys, reads, and writes the submitted contract
- bind the adjudication result to actual contract execution
- read the stored result back from chain

## GenLayer Fit Test

Answer these before approving a project direction:

- does the product require judgment rather than only deterministic computation?
- does it evaluate evidence, language, ambiguity, quality, or real-world information?
- does it benefit from validator-reviewed non-deterministic execution?

Strong fits:

- evidence adjudication
- dispute resolution
- milestone verification
- policy-driven review
- ambiguous claim validation
- subjective on-chain commitments with live external evidence

Weak fits:

- simple CRUD
- deterministic token logic
- dashboards with no meaningful contract execution
- AI summaries that do not affect on-chain outcomes
- chat UI with no real GenLayer contract role

If the fit is weak, reposition the project or change the core workflow.

Read [references/genlayer-fit.md](references/genlayer-fit.md) when deciding whether a concept actually belongs on GenLayer.

## Required Technical Shape

The project should have all of these layers.

### 1. Intelligent contract

The contract should:

- expose write methods for submission and resolution
- expose view methods for reading stored state
- fetch or interpret evidence when needed
- produce a structured adjudication output
- persist the accepted result back into state

Look for patterns such as:

- `@gl.public.write`
- `@gl.public.view`
- GenLayer-compatible storage types
- structured stored records for submitted and resolved cases

### 2. Meaningful non-deterministic path

The project should use GenLayer-native non-deterministic behavior such as:

- `gl.nondet.web.get(...)`
- `gl.nondet.exec_prompt(...)`
- `gl.vm.run_nondet_unsafe(...)` or an equivalent validator-reviewed path

The result must influence the actual product outcome.

Bad:

- prompting in the UI only
- off-chain AI summaries with no contract effect
- deterministic contract plus AI branding

Good:

- contract fetches evidence
- contract generates or evaluates a structured result
- validators review equivalence or acceptability
- accepted result is saved on-chain

### 3. Real app-to-contract workflow

The application should support a believable end-to-end flow:

1. connect wallet or authenticated GenLayer actor
2. deploy contract or import an existing deployed contract
3. submit case or input on-chain
4. resolve or execute through the contract
5. read resulting state back from chain

This must exist in code, not only in screenshots or README text.

### 4. Real GenLayer client path

The repo should contain a real integration layer that:

- creates a GenLayer client
- deploys contracts
- writes transactions
- waits for accepted receipts
- reads contract state

Examples of acceptable proof:

- `genlayer-js`
- official GenLayer testing and client tools
- direct and integration tests using the GenLayer testing suite

Read [references/technical-proof.md](references/technical-proof.md) when auditing code-level evidence.

## Reviewer Proof Requirements

A project is stronger when a reviewer can verify the claim quickly.

Always provide proof in these places:

### Code proof

Reviewers should be able to find:

- frontend flow file
- client integration file
- main contract file
- direct test file
- integration or Studio test scaffold

### Demo proof

The demo should visibly show:

- wallet connect
- deploy or import contract
- submit on-chain
- resolve on-chain
- read back the on-chain result

### README proof

The README should clearly state:

- what problem the project solves
- why it belongs on GenLayer
- what the intelligent contract actually does
- what the user flow is
- how to verify the repo locally

### Validation proof

The repo should include:

- contract lint or validation
- typecheck if frontend exists
- direct tests
- CI that runs the important checks

If CI is red, treat that as a submission risk and fix it.

Read [references/reviewer-checklist.md](references/reviewer-checklist.md) for a fast pass/fail review flow.

## README Rules

When writing or rewriting README content:

- lead with the GenLayer use case, not generic product copy
- explain why the problem needs adjudication or judgment
- name the contract primitives used for non-deterministic execution
- describe the full deploy -> submit -> resolve -> read-back flow
- give short verification commands
- keep the README scannable for a reviewer under time pressure

Do not write a README that sounds like:

- generic startup marketing
- vague “AI agent platform” language
- Web3 hype with no contract specifics

Use [references/readme-pattern.md](references/readme-pattern.md) when rewriting a README.

## Tool And Agent Build Rules

When using this skill for future agents or tools:

- prefer real contract interaction over mocked frontends
- prefer GenLayer-native reasoning inside contract execution over off-chain shortcuts
- prefer end-to-end verifiability over impressive wording
- prefer small but real flows over broad but fake feature sets

If building an “agent,” ensure the word agent still maps to a real system:

- it should take action through the contract or product workflow
- it should not be just a renamed form
- if the core judgment happens inside the intelligent contract, say that clearly

Read [references/agent-positioning.md](references/agent-positioning.md) when naming or describing a GenLayer agent.

## Submission Readiness Checklist

Approve only if all are true:

- the use case is a strong GenLayer fit
- the contract performs meaningful non-deterministic adjudication
- GenLayer consensus primitives are used in a way that matters
- the application has a real app-to-contract workflow
- the client really reads and writes the contract
- the result is persisted back into contract state
- the README makes this easy to understand
- direct verification commands work
- CI is green or only has non-blocking warnings

## Fast Audit Procedure

When reviewing a GenLayer repo quickly:

1. inspect the contract for real non-deterministic primitives
2. inspect the client layer for deploy/read/write calls
3. inspect the app flow for wallet, submit, resolve, and read-back UX
4. inspect tests for contract behavior, not just snapshots
5. inspect CI for runnable proof
6. inspect README for reviewer clarity

If any step fails, mark the repo as not yet ready and state exactly what is missing.

## Preferred Positioning Language

Use phrasing like:

- GenLayer-native adjudication app
- intelligent contract
- validator-reviewed non-deterministic reasoning
- live evidence fetched inside the contract
- real application-to-contract workflow
- accepted result written back on-chain

Avoid phrasing like:

- AI-powered blockchain revolution
- autonomous agent platform
- next-gen Web3 intelligence

Use concrete proof over hype.

## Final Gate

Do not certify a GenLayer project as ready unless it would survive both of these reviewer questions:

1. Where is the meaningful GenLayer-native non-deterministic consensus result?
2. Where is the real client path that reads and writes the actual contract?

If the answer is not obvious in code, demo, README, tests, and validation, the project is not ready yet.
