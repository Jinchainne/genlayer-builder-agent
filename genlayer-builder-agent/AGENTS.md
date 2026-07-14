# GenLayer Builder Agent Guide

## Purpose

This package is a specialized coding-agent skill and tool suite for reviewing,
diagnosing, and improving GenLayer projects.

It is optimized for:

- repo readiness reviews
- non-determinism checks
- missing flow diagnosis
- submission report generation
- fix-plan generation

## Working Rules

- Start with `tools/run-genlayer-builder-agent.mjs` when you want a full agent-style review.
- Use the focused tools under `tools/` when you only need one narrow diagnosis.
- Prefer JSON output when another system will post-process the result.
- Treat reviewer clarity as a first-class requirement, not a nice-to-have.

## Validation Tips

- Run `npm run judge` for the main verdict.
- Run `npm run nondet` to focus on contract reasoning signals.
- Run `npm run flow` to diagnose deploy, submit, resolve, and read-back gaps.
- Run `npm run plan` to generate a prioritized repair plan.
- Run `npm run report` to generate a reviewer-facing report.

## Output Contract

Strong results should include:

- a verdict
- evidence-backed risks
- flow coverage
- prioritized fixes
- reviewer-friendly next steps
