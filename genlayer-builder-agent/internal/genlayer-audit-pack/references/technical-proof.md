# Technical Proof Reference

Use this file when auditing whether a repo really implements the required GenLayer workflow.

## Required Code Signals

Look for:

- contract write methods for submit and resolve
- contract view methods for reading stored state
- `gl.nondet.web.get(...)`
- `gl.nondet.exec_prompt(...)`
- `gl.vm.run_nondet_unsafe(...)` or equivalent consensus path
- frontend or tool code that deploys contracts
- client code that writes transactions
- client code that reads state back from chain

## Strong Evidence

Strong technical proof includes:

- `genlayer-js` deployment and write flow
- explicit receipt waiting after writes
- read calls to contract view methods
- stored resolution payload in contract state
- direct tests for submission and resolution behavior
- CI running those tests

## Weak Evidence

Weak technical proof includes:

- screenshots only
- demo links with no code proof
- UI buttons with no real contract client calls
- local arrays or browser storage pretending to be chain state
- AI output shown in the UI but never written through contract execution
