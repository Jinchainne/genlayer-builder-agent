import { readFileSync } from "node:fs";
import path from "node:path";

function getExecutionFailure(receipt) {
  const leaderReceipt = receipt?.consensus_data?.leader_receipt;
  if (!leaderReceipt) {
    return null;
  }

  const executionResult = String(leaderReceipt.execution_result || "").toUpperCase();
  if (executionResult && executionResult !== "SUCCESS") {
    return leaderReceipt.error || `Execution result was ${executionResult}.`;
  }

  return null;
}

export default async function deployDisputeAgent(client) {
  const contractPath = path.resolve(process.cwd(), "contracts", "genlayer_builder_dispute_agent.py");
  const contractCode = new Uint8Array(readFileSync(contractPath));

  await client.initializeConsensusSmartContract();

  const txHash = await client.deployContract({
    code: contractCode,
    args: [],
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 200,
    interval: 3000,
    fullTransaction: true,
  });

  const contractAddress =
    receipt?.data?.contract_address ||
    receipt?.txDataDecoded?.contractAddress ||
    receipt?.contractAddress ||
    null;

  const executionFailure = getExecutionFailure(receipt);
  if (executionFailure) {
    throw new Error(`Deployment reached receipt status but execution failed: ${executionFailure}`);
  }

  if (!contractAddress) {
    throw new Error(`Deployment did not return a contract address. Receipt: ${JSON.stringify(receipt)}`);
  }

  console.log("GenLayer Builder Dispute Agent deployed", {
    txHash,
    contractAddress,
    status: receipt?.statusName || receipt?.status || "unknown",
  });

  return contractAddress;
}
