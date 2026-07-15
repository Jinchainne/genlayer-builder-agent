export default async function verifyDisputeAgent(client) {
  const contractAddress = process.env.GENLAYER_DISPUTE_AGENT_ADDRESS;
  if (!contractAddress) {
    console.log("Skipping deploy verification because GENLAYER_DISPUTE_AGENT_ADDRESS is not set.");
    return null;
  }

  const caseIds = await client.readContract({
    address: contractAddress,
    functionName: "get_case_ids",
    args: [],
  });

  console.log("Verified deployed dispute agent", {
    contractAddress,
    knownCases: Array.isArray(caseIds) ? caseIds.length : 0,
  });

  return caseIds;
}
