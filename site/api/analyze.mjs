import { analyzeGitHubRepo } from "../lib/agent-engine.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const repo = body?.repo?.trim();
    const profile = body?.profile?.trim() || "coach";

    if (!repo) {
      res.status(400).json({ error: "Missing repo URL." });
      return;
    }

    const result = await analyzeGitHubRepo(repo, profile);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unknown analysis error.",
    });
  }
}
