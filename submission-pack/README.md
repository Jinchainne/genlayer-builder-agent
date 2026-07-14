# GenLayer Builder Agent Submission Pack

This folder packages the repo story in a reviewer-friendly way.

## Positioning

GenLayer Builder Agent is presented as a production-style local-first builder
tool for GenLayer teams. Its job is to help a repo move from weak submission
signals to a more reviewer-ready state.

## What the package already proves

- a clean public package surface under `genlayer-builder-agent/`
- multiple operating profiles for different review modes
- focused commands for judging, non-determinism scanning, flow inspection, fix
  planning, and report generation
- JSON and Markdown outputs that can feed a larger delivery pipeline

## What would make the project stronger

- a real demo intelligent contract using meaningful non-deterministic
  primitives
- a minimal client path that deploys, submits, resolves, and reads back
- a live contract-backed example that the agent can audit end to end

## Suggested demo narrative

1. Run the coach profile on a target repo.
2. Show the missing non-determinism and workflow gaps.
3. Export the submission report.
4. Explain how the tool shortens the path from idea to reviewer-ready repo.

## Public demo site

The `site/` folder contains a static showcase page that can be deployed to
Vercel for a quick live demo.
