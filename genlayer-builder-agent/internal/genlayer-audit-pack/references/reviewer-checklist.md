# Reviewer Checklist

Use this checklist for a fast pass/fail review.

## Pass Quickly If All Are True

- the README explains why the use case needs GenLayer
- the contract contains meaningful non-deterministic primitives
- the app has deploy/import, submit, resolve, and read-back flow
- the client really reads and writes contract state
- tests prove contract behavior
- CI is green

## Fail Quickly If Any Are True

- contract is deterministic-only
- UI is static or mostly mocked
- no real GenLayer client path exists
- result is not written back on-chain
- README hides the technical reality
- CI is broken with no explanation

## Reviewer Questions To Answer

- what exactly is the intelligent contract deciding?
- why does that require GenLayer rather than deterministic logic?
- where in the repo is the real app-to-contract flow?
- where in the repo is the non-deterministic consensus path?
- what command can I run to verify the repo?
