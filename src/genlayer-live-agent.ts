import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT_SOURCE_URL = "/contracts/genlayer_builder_dispute_agent.py";

function parseGenToWei(input: string): bigint {
  const [wholePart, decimalPart = ""] = input.trim().split(".");
  const whole = wholePart ? BigInt(wholePart) : 0n;
  const decimals = BigInt((decimalPart + "0".repeat(18)).slice(0, 18));
  return whole * 10n ** 18n + decimals;
}

export async function connectLiveWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask or another EIP-1193 wallet is required.");
  }

  const [account] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  return {
    account,
    client: createClient({
      chain: studionet,
      account,
    }),
  };
}

export async function deployLiveDisputeAgent() {
  const { client } = await connectLiveWallet();
  await client.connect("studionet");
  await client.initializeConsensusSmartContract();

  const contractCode = await fetch(CONTRACT_SOURCE_URL).then((response) => response.text());
  const txHash = await client.deployContract({
    code: new TextEncoder().encode(contractCode),
    args: [],
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED",
  });

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
    address: params.contractAddress,
    functionName: "open_case",
    args: [
      params.caseId,
      params.title,
      params.claimText,
      params.respondentAddress,
      params.claimantEvidenceUrl,
    ],
    value: parseGenToWei(params.stakeGen),
  });

  return client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED",
  });
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
    address: params.contractAddress,
    functionName: "submit_response",
    args: [params.caseId, params.responseText, params.respondentEvidenceUrl],
    value: parseGenToWei(params.stakeGen),
  });

  return client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED",
  });
}

export async function resolveDisputeCase(contractAddress: string, caseId: string) {
  const { client } = await connectLiveWallet();
  await client.connect("studionet");

  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: "resolve_case",
    args: [caseId],
  });

  return client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED",
  });
}

export async function readDisputeCase(contractAddress: string, caseId: string) {
  const { client } = await connectLiveWallet();
  const raw = await client.readContract({
    address: contractAddress,
    functionName: "get_case_json",
    args: [caseId],
  });

  return typeof raw === "string" ? JSON.parse(raw.replace(/'/g, "\"")) : raw;
}
