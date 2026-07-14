const form = document.getElementById("analyze-form");
const repoInput = document.getElementById("repo-input");
const profileInput = document.getElementById("profile-input");
const runButton = document.getElementById("run-button");
const statusBox = document.getElementById("status-box");
const verdictPill = document.getElementById("verdict-pill");
const profilePill = document.getElementById("profile-pill");
const repoTitle = document.getElementById("repo-title");
const repoDescription = document.getElementById("repo-description");
const fitScore = document.getElementById("fit-score");
const repoStars = document.getElementById("repo-stars");
const repoBranch = document.getElementById("repo-branch");
const riskList = document.getElementById("risk-list");
const fixPlan = document.getElementById("fix-plan");
const reviewerNotes = document.getElementById("reviewer-notes");
const markdownOutput = document.getElementById("markdown-output");
const copyMarkdownButton = document.getElementById("copy-markdown");
const copyFeedback = document.getElementById("copy-feedback");

const checkGrid = document.getElementById("check-grid");
const flowGrid = document.getElementById("flow-grid");
const evidenceNondet = document.getElementById("evidence-nondet");
const evidenceExecution = document.getElementById("evidence-execution");
const evidenceOutcome = document.getElementById("evidence-outcome");

let lastMarkdown = "";

const checkMap = [
  ["Meaningful non-determinism", "meaningfulNondeterminism"],
  ["App-to-contract path", "appToContractPath"],
  ["Observable outcome", "observableOutcome"],
  ["Reviewer proof", "reviewerProof"],
];

const flowMap = [
  ["Deploy", "deploy"],
  ["Submit", "submit"],
  ["Resolve", "resolve"],
  ["Read-back", "readBack"],
];

function setStatus(message) {
  statusBox.textContent = message;
}

function renderList(target, items, emptyMessage, formatter = (item) => item) {
  if (!items || !items.length) {
    target.innerHTML = `<li>${emptyMessage}</li>`;
    return;
  }

  target.innerHTML = items.map((item) => `<li>${formatter(item)}</li>`).join("");
}

function renderChecks(checks) {
  checkGrid.innerHTML = checkMap
    .map(([label, key]) => {
      const ok = checks?.[key];
      return `<div class="check-card ${ok ? "ok" : "no"}"><strong>${label}</strong><span>${ok ? "present" : "missing"}</span></div>`;
    })
    .join("");
}

function renderFlow(flow) {
  flowGrid.innerHTML = flowMap
    .map(([label, key]) => {
      const ok = flow?.[key];
      return `<div class="${ok ? "ok" : "no"}"><strong>${label}</strong><span>${ok ? "present" : "missing"}</span></div>`;
    })
    .join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderEvidence(target, items) {
  renderList(
    target,
    items,
    "No matching signal found.",
    (item) => `<code>${escapeHtml(`${item.file}:${item.line}`)}</code> -> ${escapeHtml(item.snippet)}`
  );
}

function renderResult(result) {
  verdictPill.textContent = result.summary.verdict.toLowerCase();
  verdictPill.className = `pill ${result.summary.verdict.toLowerCase()}`;
  profilePill.textContent = `profile: ${result.profile}`;
  repoTitle.textContent = result.summary.source;
  repoDescription.textContent = result.summary.description || result.goal;
  fitScore.textContent = String(result.summary.fitScore);
  repoStars.textContent = String(result.summary.stars);
  repoBranch.textContent = result.summary.defaultBranch || "-";

  renderChecks(result.checks);
  renderFlow(result.flow);
  renderList(riskList, result.risks, "No major risks detected.");
  renderList(
    fixPlan,
    result.fixPlan,
    "No major fixes suggested.",
    (item) => `${item.priority} ${item.area}: ${item.action}`
  );
  renderList(reviewerNotes, result.reviewerNotes, "No reviewer notes returned.");
  renderEvidence(evidenceNondet, result.evidence?.nondeterminism || []);
  renderEvidence(evidenceExecution, result.evidence?.execution || []);
  renderEvidence(evidenceOutcome, result.evidence?.outcome || []);

  markdownOutput.textContent = result.markdown;
  lastMarkdown = result.markdown;
  setStatus(`Analysis complete for ${result.summary.source}. Verdict: ${result.summary.verdict}.`);
}

async function runAnalysis(event) {
  event.preventDefault();

  const repo = repoInput.value.trim();
  const profile = profileInput.value;

  if (!repo) {
    setStatus("Please enter a GitHub repository URL.");
    return;
  }

  runButton.disabled = true;
  setStatus("Agent is fetching the repo and analyzing live signals...");
  verdictPill.textContent = "running";
  verdictPill.className = "pill neutral";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repo, profile }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    renderResult(data);
  } catch (error) {
    setStatus(error.message || "Analysis failed.");
    verdictPill.textContent = "error";
    verdictPill.className = "pill fail";
  } finally {
    runButton.disabled = false;
  }
}

form.addEventListener("submit", runAnalysis);

for (const button of document.querySelectorAll(".preset-button")) {
  button.addEventListener("click", () => {
    const repo = button.getAttribute("data-repo");
    if (repo && repo.startsWith("https://github.com/")) {
      repoInput.value = repo;
      setStatus("Preset loaded. Run the agent when ready.");
    } else {
      repoInput.focus();
      repoInput.select();
      setStatus("Paste a public GitHub repo URL to run the live agent.");
    }
  });
}

copyMarkdownButton.addEventListener("click", async () => {
  if (!lastMarkdown) {
    copyFeedback.textContent = "No generated report to copy yet.";
    return;
  }

  try {
    await navigator.clipboard.writeText(lastMarkdown);
    copyFeedback.textContent = "Markdown report copied.";
  } catch {
    copyFeedback.textContent = "Clipboard permission was blocked.";
  }
});
