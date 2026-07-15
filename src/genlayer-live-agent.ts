import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT_SOURCE_URL = "/contracts/genlayer_builder_dispute_agent.py";
const ACCEPTED_STATUS = "ACCEPTED";

function parseGenToWei(input: string): bigint {
  const normalized = input.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(normalized)) {
    throw new Error("GEN amount must be a positive number with up to 18 decimals.");
  }
  const [wholePart, decimalPart = ""] = normalized.split(".");
  const whole = wholePart ? BigInt(wholePart) : 0n;
  const decimals = BigInt((decimalPart + "0".repeat(18)).slice(0, 18));
  const wei = whole * 10n ** 18n + decimals;
  if (wei <= 0n) {
    throw new Error("GEN amount must be greater than zero.");
  }
  return wei;
}

function requireTrimmedValue(value: string, label: string, minLength = 1): string {
  const normalized = value.trim();
  if (normalized.length < minLength) {
    throw new Error(`${label} is required${minLength > 1 ? ` and must be at least ${minLength} characters.` : "."}`);
  }
  return normalized;
}

function requireAddress(value: string, label: string): `0x${string}` {
  const normalized = requireTrimmedValue(value, label);
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    throw new Error(`${label} must be a valid 0x address.`);
  }
  return normalized as `0x${string}`;
}

function requireHttpsUrl(value: string, label: string): string {
  const normalized = requireTrimmedValue(value, label, 12);
  const url = new URL(normalized);
  if (url.protocol !== "https:") {
    throw new Error(`${label} must use https.`);
  }
  if (/(^localhost$)|(^127\.)|(^10\.)|(^192\.168\.)|(^172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) {
    throw new Error(`${label} cannot point to localhost or a private network.`);
  }
  return normalized;
}

function getExecutionFailure(receipt: any): string | null {
  const leaderReceipt = receipt?.consensus_data?.leader_receipt;
  if (!leaderReceipt) {
    return null;
  }

  const executionResult = String(leaderReceipt.execution_result || "").toUpperCase();
  if (executionResult && executionResult !== "SUCCESS") {
    return leaderReceipt.error || `Execution result was ${executionResult}.`;
  }

  const eqOutputs = leaderReceipt.eq_outputs?.leader || {};
  for (const raw of Object.values(eqOutputs)) {
    if (typeof raw !== "string") {
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.transaction_success === false) {
        return parsed.transaction_error || "Transaction execution returned transaction_success=false.";
      }
    } catch {
      // Ignore malformed diagnostics and keep scanning.
    }
  }

  return null;
}

async function waitForConfirmedExecution(client: any, txHash: `0x${string}`) {
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: ACCEPTED_STATUS,
    fullTransaction: true,
    retries: 120,
    interval: 3000,
  });

  const statusName = String(receipt?.statusName || receipt?.status || "").toUpperCase();
  if (statusName && statusName !== "ACCEPTED" && statusName !== "FINALIZED") {
    throw new Error(`Transaction reached unexpected status ${statusName}.`);
  }

  const executionFailure = getExecutionFailure(receipt);
  if (executionFailure) {
    throw new Error(`GenLayer execution failed: ${executionFailure}`);
  }

  return receipt;
}

export async function connectLiveWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask or another EIP-1193 wallet is required.");
  }

  const [account] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  const normalizedAccount = requireAddress(account, "Connected wallet");

  return {
    account: normalizedAccount,
    client: createClient({
      chain: studionet,
      account: normalizedAccount,
    }),
  };
}

export async function deployLiveDisputeAgent() {
  const { client } = await connectLiveWallet();
  await client.connect("studionet");
  await client.initializeConsensusSmartContract();

  const response = await fetch(CONTRACT_SOURCE_URL);
  if (!response.ok) {
    throw new Error("Could not load the dispute-agent contract source.");
  }
  const contractCode = await response.text();
  const txHash = await client.deployContract({
    code: new TextEncoder().encode(contractCode),
    args: [],
  });

  const receipt = await waitForConfirmedExecution(client, txHash);

  return {
    txHash,
    receipt,
  };
}

export async function openDisputeCase(params: {
  contractAddress: string;
  caseId: string;
  title: string;
  claimText: string;
  respondentAddress: string;
  claimantEvidenceUrl: string;
  stakeGen: string;
}) {
  const { client } = await connectLiveWallet();
  await client.connect("studionet");

  const txHash = await client.writeContract({
    address: requireAddress(params.contractAddress, "Contract address"),
    functionName: "open_case",
    args: [
      requireTrimmedValue(params.caseId, "Case ID", 4).toLowerCase(),
      requireTrimmedValue(params.title, "Title", 8),
      requireTrimmedValue(params.claimText, "Claim text", 20),
      requireAddress(params.respondentAddress, "Respondent address"),
      requireHttpsUrl(params.claimantEvidenceUrl, "Claimant evidence URL"),
    ],
    value: parseGenToWei(params.stakeGen),
  });

  return waitForConfirmedExecution(client, txHash);
}

export async function submitDisputeResponse(params: {
  contractAddress: string;
  caseId: string;
  responseText: string;
  respondentEvidenceUrl: string;
  stakeGen: string;
}) {
  const { client } = await connectLiveWallet();
  await client.connect("studionet");

  const txHash = await client.writeContract({
    address: requireAddress(params.contractAddress, "Contract address"),
    functionName: "submit_response",
    args: [
      requireTrimmedValue(params.caseId, "Case ID", 4).toLowerCase(),
      requireTrimmedValue(params.responseText, "Response text", 20),
      requireHttpsUrl(params.respondentEvidenceUrl, "Respondent evidence URL"),
    ],
    value: parseGenToWei(params.stakeGen),
  });

  return waitForConfirmedExecution(client, txHash);
}

export async function resolveDisputeCase(contractAddress: string, caseId: string) {
  const { client } = await connectLiveWallet();
  await client.connect("studionet");

  const txHash = await client.writeContract({
    address: requireAddress(contractAddress, "Contract address"),
    functionName: "resolve_case",
    args: [requireTrimmedValue(caseId, "Case ID", 4).toLowerCase()],
  });

  return waitForConfirmedExecution(client, txHash);
}

export async function claimDisputeRelease(contractAddress: string, caseId: string) {
  const { client } = await connectLiveWallet();
  await client.connect("studionet");

  const txHash = await client.writeContract({
    address: requireAddress(contractAddress, "Contract address"),
    functionName: "claim_release",
    args: [requireTrimmedValue(caseId, "Case ID", 4).toLowerCase()],
  });

  return waitForConfirmedExecution(client, txHash);
}

export async function readDisputeCase(contractAddress: string, caseId: string) {
  const { client } = await connectLiveWallet();
  const raw = await client.readContract({
    address: requireAddress(contractAddress, "Contract address"),
    functionName: "get_case_json",
    args: [requireTrimmedValue(caseId, "Case ID", 4).toLowerCase()],
  });

  return typeof raw === "string" ? JSON.parse(raw.replace(/'/g, "\"")) : raw;
}
