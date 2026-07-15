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
const activityFeed = document.getElementById("activity-feed");
const modeGrid = document.getElementById("mode-grid");
const pipelineGrid = document.getElementById("pipeline-grid");

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

const stageOrder = ["fetch", "classify", "verify", "report"];

function nowLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function setStatus(message, tone = "idle") {
  statusBox.textContent = message;
  statusBox.classList.remove("status-running", "status-success", "status-error");
  if (tone === "running") statusBox.classList.add("status-running");
  if (tone === "success") statusBox.classList.add("status-success");
  if (tone === "error") statusBox.classList.add("status-error");
}

function pushActivity(title, detail) {
  if (!activityFeed) return;

  const item = document.createElement("div");
  item.className = "activity-item";
  item.innerHTML = `
    <div class="activity-dot"></div>
    <div>
      <strong>${title}</strong>
      <div class="feed-meta">${detail}</div>
      <div class="activity-time">${nowLabel()}</div>
    </div>
  `;

  activityFeed.prepend(item);

  while (activityFeed.children.length > 5) {
    activityFeed.removeChild(activityFeed.lastElementChild);
  }
}

function setActiveMode(mode) {
  if (!modeGrid) return;
  for (const card of modeGrid.querySelectorAll("[data-mode-card]")) {
    card.classList.toggle("is-active", card.getAttribute("data-mode-card") === mode);
  }
}

function setPipelineStage(stage, completedStages = []) {
  if (!pipelineGrid) return;
  for (const card of pipelineGrid.querySelectorAll("[data-stage-card]")) {
    const key = card.getAttribute("data-stage-card");
    card.classList.toggle("is-current", key === stage);
    card.classList.toggle("is-done", completedStages.includes(key));
  }
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
  const verdictClass = result.summary.verdict.toLowerCase();
  verdictPill.textContent = verdictClass;
  verdictPill.className = `pill ${verdictClass}`;
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
  setActiveMode(result.profile);
  setPipelineStage("report", ["fetch", "classify", "verify"]);

  setStatus(
    `Analysis complete for ${result.summary.source}. Verdict: ${result.summary.verdict}.`,
    "success"
  );
  pushActivity(
    `Verdict: ${result.summary.verdict}`,
    `${result.profile} profile finished with fit score ${result.summary.fitScore} on ${result.summary.source}.`
  );
}

async function runAnalysis(event) {
  event.preventDefault();

  const repo = repoInput.value.trim();
  const profile = profileInput.value;

  if (!repo) {
    setStatus("Please enter a GitHub repository URL.", "error");
    return;
  }

  runButton.disabled = true;
  runButton.textContent = "Running...";
  setStatus("Agent is fetching the repository and scanning live GenLayer signals...", "running");
  verdictPill.textContent = "running";
  verdictPill.className = "pill neutral";
  setActiveMode(profile);
  setPipelineStage("fetch");

  pushActivity("Fetch started", `Loading ${repo} with the ${profile} profile.`);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repo, profile }),
    });

    setPipelineStage("classify", ["fetch"]);
    pushActivity("Classification", "Repo fetched. The agent is scoring fit, execution, and proof signals.");

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    setPipelineStage("verify", ["fetch", "classify"]);
    renderResult(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    setStatus(message, "error");
    verdictPill.textContent = "error";
    verdictPill.className = "pill fail";
    setPipelineStage("fetch");
    pushActivity("Runtime error", message);
  } finally {
    runButton.disabled = false;
    runButton.textContent = "Run Agent";
  }
}

function installRevealAnimations() {
  const nodes = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 }
  );

  for (const node of nodes) {
    observer.observe(node);
  }
}

form.addEventListener("submit", runAnalysis);

for (const button of document.querySelectorAll(".preset-button")) {
  button.addEventListener("click", () => {
    const repo = button.getAttribute("data-repo");
    if (repo && repo.startsWith("https://github.com/")) {
      repoInput.value = repo;
      setStatus("Preset loaded. Run the live agent when ready.");
      pushActivity("Preset loaded", `Prepared ${repo} for analysis.`);
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
    pushActivity("Report copied", "The generated submission markdown was copied to clipboard.");
  } catch {
    copyFeedback.textContent = "Clipboard permission was blocked.";
  }
});

setActiveMode(profileInput.value);
setPipelineStage("fetch");
installRevealAnimations();
