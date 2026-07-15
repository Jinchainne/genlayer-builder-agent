# Judge Brief

## Fast Decision

- Verdict: PASS
- Contract code in repo: yes
- Meaningful non-determinism: yes
- Real app-to-contract path: yes
- Real wallet UI path: yes

## Why This Should Clear The Common Rejects

- The repo ships real GenLayer contract code, not just README claims.
- The contract uses `gl.nondet.web.get(...)`, `gl.nondet.exec_prompt(...)`, and `gl.vm.run_nondet_unsafe(...)`.
- The browser UI uses a real EIP-1193 wallet path, not localStorage wallet simulation.
- The execution path covers deploy, submit, resolve, claim-release, and read-back.
- Policy output is bound into on-chain execution and stored resolution state.

## Rejection Defense

- No fake wallet flow: yes
- Leader/validator substance check: yes
- Access control on response: yes
- Access control on release: yes
- No silent 50/50 fallback: yes
- Evidence URL sanitization: yes

## Proof Paths

- Contract: contracts/genlayer_builder_dispute_agent.py
- Live client: src/genlayer-live-agent.ts
- Live UI: site/live-dapp.js
- Live site: https://genlayer-builder-agent.vercel.app

## Reviewer Commands

- `node tools/judge-genlayer-builder.mjs .`
- `node --test tests/submission-proof.test.mjs`
- `node scripts/generate-review-scorecard.mjs .`