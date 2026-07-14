# GenLayer Builder Agent

GenLayer Builder Agent is a local-first review and builder package for
GenLayer projects.

It helps with:

- checking whether a repo is a real GenLayer fit
- detecting weak or missing non-deterministic execution
- finding missing deploy, submit, resolve, and read-back flows
- generating fix plans for submission readiness
- producing reviewer-facing submission reports

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
genlayer-skill/             Supporting GenLayer review references and helpers
integrations/               Supporting integration notes and patterns
vendored/                   Vendored external skill references
```

## Positioning

This repository is meant to look and behave like a practical agent package,
not a thin demo script. The design emphasizes:

- one main agent entrypoint
- multiple operating profiles
- specialized audit tools
- local-first execution
- machine-readable outputs

## License

MIT for first-party files in this repository. Vendored third-party materials
retain their upstream licenses.
