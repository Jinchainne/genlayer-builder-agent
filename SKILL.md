---
name: genlayer-builder-agent
description: Entry point for a local-first GenLayer builder agent. Use when reviewing, diagnosing, improving, or preparing a GenLayer repo for submission. Routes to the focused builder-agent tools and supporting GenLayer references in this repository.
---

# GenLayer Builder Agent

This is the root entry skill for the repository.

Use it when the user needs to:

- judge whether a repo is a real GenLayer project
- diagnose missing non-deterministic execution
- find missing deploy, submit, resolve, or read-back flows
- generate a submission fix plan
- produce a reviewer-facing report

## Primary Package

The main working package is:

- `genlayer-builder-agent/`

Start there for:

- `tools/run-genlayer-builder-agent.mjs`
- `tools/judge-genlayer-builder.mjs`
- `tools/scan-nondeterminism.mjs`
- `tools/find-missing-flow.mjs`
- `tools/generate-fix-plan.mjs`
- `tools/create-submission-report.mjs`

## Working Mode

When helping with a GenLayer repo:

1. judge the repo first
2. inspect non-determinism second
3. inspect app-to-contract flow third
4. generate the fix plan fourth
5. produce a submission report last

## Repository Roles

This repository contains several layers of material:

- `genlayer-builder-agent/`
  The public-facing builder agent package.
- `genlayer-skill/`
  Supplemental GenLayer review references and local helper logic.
- `integrations/`
  Integration notes and supporting patterns.
- `vendored/`
  Vendored reference materials from external projects.

Prefer the public-facing builder agent package first unless the task clearly
requires one of the supporting materials.
