const walletStatus = document.getElementById("wallet-status");
const contractAddressInput = document.getElementById("contract-address");
const txLogOutput = document.getElementById("tx-log-output");
const caseJsonOutput = document.getElementById("case-json-output");

let currentWallet = null;
let sdkPromise = null;
const ACCEPTED_STATUS = "ACCEPTED";

function setWalletStatus(message) {
  walletStatus.textContent = message;
}

function setTxLog(value) {
  txLogOutput.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function setCaseJson(value) {
  caseJsonOutput.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

async function loadGenlayerSdk() {
  sdkPromise ||= Promise.all([
    import("https://esm.sh/genlayer-js@1.1.8?bundle"),
    import("https://esm.sh/genlayer-js@1.1.8/chains"),
  ]);
  const [{ createClient }, chainsModule] = await sdkPromise;
  return {
    createClient,
    studionet: chainsModule.studionet,
  };
}

function parseGenToWei(input) {
  const normalized = String(input ?? "").trim();
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

function requireTrimmedValue(value, label, minLength = 1) {
  const normalized = String(value ?? "").trim();
  if (normalized.length < minLength) {
    throw new Error(`${label} is required${minLength > 1 ? ` and must be at least ${minLength} characters.` : "."}`);
  }
  return normalized;
}

function requireAddress(value, label = "Address") {
  const normalized = requireTrimmedValue(value, label);
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    throw new Error(`${label} must be a valid 0x wallet or contract address.`);
  }
  return normalized;
}

function requireHttpsUrl(value, label) {
  const normalized = requireTrimmedValue(value, label, 12);
  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:") {
      throw new Error(`${label} must use https.`);
    }
    if (/(^localhost$)|(^127\.)|(^10\.)|(^192\.168\.)|(^172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) {
      throw new Error(`${label} cannot point to localhost or a private network.`);
    }
    return normalized;
  } catch (error) {
    if (error instanceof Error && error.message !== "Invalid URL") {
      throw error;
    }
    throw new Error(`${label} must be a valid https URL.`);
  }
}

function getExecutionFailure(receipt) {
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
      // Ignore unparseable diagnostic payloads.
    }
  }

  return null;
}

async function waitForConfirmedExecution(client, txHash) {
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

async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask or another EIP-1193 wallet is required.");
  }

  const { createClient, studionet } = await loadGenlayerSdk();
  const [account] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  requireAddress(account, "Connected wallet");

  const client = createClient({
    chain: studionet,
    account,
  });
  await client.connect("studionet");
  currentWallet = { account, client };
  setWalletStatus(`Connected wallet: ${account}`);
  return currentWallet;
}

async function requireWallet() {
  if (currentWallet) {
    return currentWallet;
  }
  return connectWallet();
}

async function deployContract() {
  const { client } = await requireWallet();
  await client.initializeConsensusSmartContract();

  const response = await fetch("./contracts/genlayer_builder_dispute_agent.py");
  if (!response.ok) {
    throw new Error("Could not load the contract source from the deployed site.");
  }
  const contractCode = await response.text();
  if (!contractCode.includes("class GenLayerBuilderDisputeAgent")) {
    throw new Error("The deployed contract asset looks incomplete.");
  }

  const txHash = await client.deployContract({
    code: new TextEncoder().encode(contractCode),
    args: [],
  });

  const receipt = await waitForConfirmedExecution(client, txHash);

  const deployedAddress =
    receipt?.data?.contract_address ||
    receipt?.txDataDecoded?.contractAddress ||
    receipt?.contractAddress ||
    "";

  if (deployedAddress) {
    contractAddressInput.value = deployedAddress;
  }

  setTxLog({
    step: "deployContract",
    txHash,
    receipt,
  });
}

async function writeContract(functionName, args, value) {
  const { client } = await requireWallet();
  const address = requireAddress(contractAddressInput.value, "Contract address");

  const payload = {
    address,
    functionName,
    args,
  };

  if (value !== undefined) {
    payload.value = value;
  }

  const txHash = await client.writeContract(payload);
  const receipt = await waitForConfirmedExecution(client, txHash);

  setTxLog({
    step: functionName,
    txHash,
    receipt,
  });
}

async function readCase() {
  const { client } = await requireWallet();
  const address = requireAddress(contractAddressInput.value, "Contract address");

  const caseId = requireTrimmedValue(
    document.getElementById("response-case-id").value.trim() ||
      document.getElementById("open-case-id").value.trim(),
    "Case ID",
    4
  ).toLowerCase();

  const raw = await client.readContract({
    address,
    functionName: "get_case_json",
    args: [caseId],
  });

  if (typeof raw === "string") {
    try {
      setCaseJson(JSON.parse(raw));
      return;
    } catch {
      setCaseJson(raw);
      return;
    }
  }

  setCaseJson(raw);
}

async function guarded(action) {
  try {
    await action();
  } catch (error) {
    setTxLog({
      error: error instanceof Error ? error.message : "Unknown live dapp error.",
    });
  }
}

document.getElementById("connect-wallet").addEventListener("click", () => guarded(connectWallet));
document.getElementById("deploy-contract").addEventListener("click", () => guarded(deployContract));

document.getElementById("open-case-button").addEventListener("click", () =>
  guarded(async () => {
    await writeContract(
      "open_case",
      [
        requireTrimmedValue(document.getElementById("open-case-id").value, "Case ID", 4).toLowerCase(),
        requireTrimmedValue(document.getElementById("open-title").value, "Title", 8),
        requireTrimmedValue(document.getElementById("open-claim-text").value, "Claim text", 20),
        requireAddress(document.getElementById("open-respondent-address").value, "Respondent address"),
        requireHttpsUrl(document.getElementById("open-evidence-url").value, "Claimant evidence URL"),
      ],
      parseGenToWei(document.getElementById("open-stake-gen").value)
    );
  })
);

document.getElementById("submit-response-button").addEventListener("click", () =>
  guarded(async () => {
    await writeContract(
      "submit_response",
      [
        requireTrimmedValue(document.getElementById("response-case-id").value, "Case ID", 4).toLowerCase(),
        requireTrimmedValue(document.getElementById("response-text").value, "Response text", 20),
        requireHttpsUrl(document.getElementById("response-evidence-url").value, "Respondent evidence URL"),
      ],
      parseGenToWei(document.getElementById("response-stake-gen").value)
    );
  })
);

document.getElementById("resolve-case-button").addEventListener("click", () =>
  guarded(async () => {
    await writeContract("resolve_case", [
      requireTrimmedValue(document.getElementById("response-case-id").value, "Case ID", 4).toLowerCase(),
    ]);
  })
);

document.getElementById("claim-release-button").addEventListener("click", () =>
  guarded(async () => {
    await writeContract("claim_release", [
      requireTrimmedValue(document.getElementById("response-case-id").value, "Case ID", 4).toLowerCase(),
    ]);
  })
);

document.getElementById("read-case-button").addEventListener("click", () => guarded(readCase));
