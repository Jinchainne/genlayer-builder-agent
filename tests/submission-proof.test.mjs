import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";

const contract = fs.readFileSync("contracts/genlayer_builder_dispute_agent.py", "utf8");
const liveClient = fs.readFileSync("src/genlayer-live-agent.ts", "utf8");
const liveUi = fs.readFileSync("site/live-dapp.js", "utf8");

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
});

test("live UI includes wallet connect and on-chain interaction actions", () => {
  assert.match(liveUi, /eth_requestAccounts/);
  assert.match(liveUi, /deployContract/);
  assert.match(liveUi, /resolve_case/);
  assert.match(liveUi, /get_case_json/);
});
