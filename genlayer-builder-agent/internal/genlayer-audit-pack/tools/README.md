# GenLayer Repo Judge

This is a local-only helper for fast pass/fail review against:

- the GenLayer builder-project standard in this skill
- the two rejection patterns from the screenshots

## Usage

From the workspace root:

```bash
node genlayer-builder-agent/internal/genlayer-audit-pack/tools/judge-genlayer-repo.mjs https://github.com/owner/repo
```

Or point it at a local repo:

```bash
node genlayer-builder-agent/internal/genlayer-audit-pack/tools/judge-genlayer-repo.mjs C:\path\to\repo
```

## What It Checks

- meaningful non-deterministic GenLayer contract execution
- real contract read/write path
- application-to-contract workflow
- execution binding such as policy gating or stateful write-back
- reviewer signals in README, tests, and CI

## Output

It returns one of:

- `PASS`
- `BORDERLINE`
- `FAIL`

`PASS` means the repo looks safe against the two rejection reasons.
