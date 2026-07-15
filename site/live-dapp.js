const walletStatus = document.getElementById("wallet-status");
const contractAddressInput = document.getElementById("contract-address");
const txLogOutput = document.getElementById("tx-log-output");
const caseJsonOutput = document.getElementById("case-json-output");

let currentWallet = null;

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
  const [{ createClient }, chainsModule] = await Promise.all([
    import("https://esm.sh/genlayer-js@1.1.8?bundle"),
    import("https://esm.sh/genlayer-js@1.1.8/chains"),
  ]);
  return {
    createClient,
    studionet: chainsModule.studionet,
  };
}

function parseGenToWei(input) {
  const [wholePart, decimalPart = ""] = String(input).trim().split(".");
  const whole = wholePart ? BigInt(wholePart) : 0n;
  const decimals = BigInt((decimalPart + "0".repeat(18)).slice(0, 18));
  return whole * 10n ** 18n + decimals;
}

async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask or another EIP-1193 wallet is required.");
  }

  const { createClient, studionet } = await loadGenlayerSdk();
  const [account] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

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

  const contractCode = await fetch("./contracts/genlayer_builder_dispute_agent.py").then((response) =>
    response.text()
  );

  const txHash = await client.deployContract({
    code: new TextEncoder().encode(contractCode),
    args: [],
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED",
  });

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
  const address = contractAddressInput.value.trim();
  if (!address) {
    throw new Error("Please set a contract address first.");
  }

  const payload = {
    address,
    functionName,
    args,
  };

  if (value !== undefined) {
    payload.value = value;
  }

  const txHash = await client.writeContract(payload);
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED",
  });

  setTxLog({
    step: functionName,
    txHash,
    receipt,
  });
}

async function readCase() {
  const { client } = await requireWallet();
  const address = contractAddressInput.value.trim();
  if (!address) {
    throw new Error("Please set a contract address first.");
  }

  const caseId =
    document.getElementById("response-case-id").value.trim() ||
    document.getElementById("open-case-id").value.trim();
  if (!caseId) {
    throw new Error("Please enter a case id.");
  }

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
        document.getElementById("open-case-id").value.trim(),
        document.getElementById("open-title").value.trim(),
        document.getElementById("open-claim-text").value.trim(),
        document.getElementById("open-respondent-address").value.trim(),
        document.getElementById("open-evidence-url").value.trim(),
      ],
      parseGenToWei(document.getElementById("open-stake-gen").value.trim())
    );
  })
);

document.getElementById("submit-response-button").addEventListener("click", () =>
  guarded(async () => {
    await writeContract(
      "submit_response",
      [
        document.getElementById("response-case-id").value.trim(),
        document.getElementById("response-text").value.trim(),
        document.getElementById("response-evidence-url").value.trim(),
      ],
      parseGenToWei(document.getElementById("response-stake-gen").value.trim())
    );
  })
);

document.getElementById("resolve-case-button").addEventListener("click", () =>
  guarded(async () => {
    await writeContract("resolve_case", [document.getElementById("response-case-id").value.trim()]);
  })
);

document.getElementById("read-case-button").addEventListener("click", () => guarded(readCase));
