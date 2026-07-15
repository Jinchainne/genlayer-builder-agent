# Rejection Defense

This file maps the build directly against the most common GenLayer rejection reasons.

## 1. "The contract is deterministic-only"

Response:

- The contract uses `gl.nondet.web.get(...)` for live evidence fetch.
- The contract uses `gl.nondet.exec_prompt(...)` for structured judgment.
- The contract uses `gl.vm.run_nondet_unsafe(...)` for validator-reviewed comparison.

Proof path:

- `contracts/genlayer_builder_dispute_agent.py`

## 2. "The UI is static or fake integration"

Response:

- The live UI connects through `window.ethereum`.
- The live UI deploys the contract, writes to it, resolves through it, and reads back state.
- The live UI does not use localStorage wallet simulation.

Proof paths:

- `site/live-dapp.js`
- `src/genlayer-live-agent.ts`

## 3. "Policy output is not bound to execution"

Response:

- Resolution output is written into contract state.
- `winner`, `winner_address`, `confidence`, `reasoning`, and `policy_bound_to_execution` are stored on-chain.
- Release logic depends on the stored winner result before transfer.

Proof path:

- `contracts/genlayer_builder_dispute_agent.py`

## 4. "Prompt injection or unsafe evidence URLs"

Response:

- Evidence URLs must be `https://`.
- Private or local URLs are rejected.
- Prompt instructions explicitly tell the model to ignore instructions contained in evidence.

Proof path:

- `contracts/genlayer_builder_dispute_agent.py`

## 5. "Silent fallback or unclear error handling"

Response:

- Errors are tagged as `[EXPECTED]`, `[EXTERNAL]`, `[TRANSIENT]`, or `[LLM_ERROR]`.
- The contract does not use a silent `50/50` fallback path.
- Inconclusive cases do not auto-release escrow.

Proof path:

- `contracts/genlayer_builder_dispute_agent.py`
