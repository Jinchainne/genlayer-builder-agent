import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";

const contract = fs.readFileSync("contracts/genlayer_builder_dispute_agent.py", "utf8");
const liveClient = fs.readFileSync("src/genlayer-live-agent.ts", "utf8");
const liveUi = fs.readFileSync("site/live-dapp.js", "utf8");
const deployScript = fs.readFileSync("deploy/001_deploy_dispute_agent.mjs", "utf8");

test("contract uses real GenLayer non-deterministic primitives", () => {
  assert.match(contract, /gl\.nondet\.web\.get\s*\(/);
  assert.match(contract, /gl\.nondet\.exec_prompt\s*\(/);
  assert.match(contract, /gl\.vm\.run_nondet_unsafe\s*\(/);
});

test("client includes deploy, write, and read contract flow", () => {
  assert.match(liveClient, /deployContract\s*\(/);
  assert.match(liveClient, /writeContract\s*\(/);
  assert.match(liveClient, /readContract\s*\(/);
  assert.match(liveClient, /waitForTransactionReceipt\s*\(/);
  assert.match(liveClient, /claimDisputeRelease/);
  assert.match(liveClient, /fullTransaction:\s*true/);
});

test("live UI includes wallet connect and on-chain interaction actions", () => {
  assert.match(liveUi, /eth_requestAccounts/);
  assert.match(liveUi, /deployContract/);
  assert.match(liveUi, /resolve_case/);
  assert.match(liveUi, /claim_release/);
  assert.match(liveUi, /get_case_json/);
});

test("frontend uses a real wallet path and avoids fake localStorage wallet simulation", () => {
  assert.doesNotMatch(liveUi, /localStorage/i);
  assert.match(liveUi, /window\.ethereum/);
});

test("contract defends against the main rejection patterns", () => {
  assert.match(contract, /Only the named respondent can answer/);
  assert.match(contract, /Only the winning party can claim release/);
  assert.match(contract, /Evidence URL must use https/);
  assert.match(contract, /Private or local evidence URLs are not allowed/);
  assert.doesNotMatch(contract, /50\/50|fallback/i);
  assert.match(contract, /policy_bound_to_execution/);
});

test("repo includes an official-style deploy script path", () => {
  assert.match(deployScript, /initializeConsensusSmartContract/);
  assert.match(deployScript, /deployContract\s*\(/);
  assert.match(deployScript, /waitForTransactionReceipt\s*\(/);
});
