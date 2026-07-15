# Reviewer Checklist

Use this list to verify the repo quickly without guessing.

## Gate Checks

- Confirm contract code exists in the repo:
  `contracts/genlayer_builder_dispute_agent.py`
- Confirm the contract uses real GenLayer-native non-deterministic execution:
  `gl.nondet.web.get(...)`, `gl.nondet.exec_prompt(...)`, `gl.vm.run_nondet_unsafe(...)`
- Confirm the app contains a real client path:
  `src/genlayer-live-agent.ts`
- Confirm the live app exposes the full contract flow:
  `site/live-dapp.js`

## Live Verification

1. Open `https://genlayer-builder-agent.vercel.app`
2. Connect a browser wallet on Studionet.
3. Deploy the dispute contract from the live dapp panel.
4. Open a dispute with a real escrow value.
5. Submit a response from the respondent wallet.
6. Resolve the case on-chain.
7. Read the stored case JSON back from the contract.

## What to Compare

- The contract being used by the app should be the same contract code shipped in this repo.
- The resolution flow should depend on non-deterministic evidence fetch + prompt judgment.
- The result should be visible in stored contract state before release.

## Key Proof Paths

- Contract:
  `contracts/genlayer_builder_dispute_agent.py`
- Live client:
  `src/genlayer-live-agent.ts`
- Live app UI:
  `site/live-dapp.js`
- Repo judge:
  `genlayer-builder-agent/tools/judge-genlayer-builder.mjs`
