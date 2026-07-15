import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

export const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".vercel",
  ".pytest_cache",
  "__pycache__",
]);

export const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".py",
  ".sol",
  ".rs",
  ".toml",
  ".env",
]);

export function isUrl(input) {
  return /^https?:\/\//i.test(input) || /^git@/i.test(input);
}

export function ensureRepo(input, tempPrefix = "genlayer-builder-agent-") {
  if (!input) {
    throw new Error("Missing repo path or URL.");
  }

  if (!isUrl(input)) {
    const localPath = path.resolve(input);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local path not found: ${localPath}`);
    }
    return { repoPath: localPath, cleanup: null, source: localPath };
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  const repoPath = path.join(tempRoot, "repo");
  execFileSync("git", ["clone", "--depth", "1", input, repoPath], {
    stdio: "inherit",
  });
  return {
    repoPath,
    cleanup: () => fs.rmSync(tempRoot, { recursive: true, force: true }),
    source: input,
  };
}

export function shouldReadFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || path.basename(filePath).toLowerCase() === "readme";
}

export function walkFiles(rootDir) {
  const files = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          walk(fullPath);
        }
        continue;
      }
      if (shouldReadFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files;
}

export function rel(repoPath, filePath) {
  return path.relative(repoPath, filePath).replace(/\\/g, "/");
}

export function countLine(text, index) {
  return text.slice(0, index).split("\n").length;
}

export function findMatches(repoPath, files, regex, limit = 12) {
  const matches = [];
  for (const filePath of files) {
    let text;
    try {
      text = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    const localRegex = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = localRegex.exec(text)) !== null) {
      matches.push({
        file: rel(repoPath, filePath),
        line: countLine(text, match.index),
        snippet: match[0].trim().slice(0, 220),
      });
      if (matches.length >= limit) {
        return matches;
      }
      if (match.index === localRegex.lastIndex) {
        localRegex.lastIndex += 1;
      }
    }
  }
  return matches;
}

export function firstFile(repoPath, files, predicate) {
  const hit = files.find((filePath) => predicate(rel(repoPath, filePath)));
  return hit ? rel(repoPath, hit) : null;
}

export function readFileIfExists(repoPath, relativePath) {
  const fullPath = path.join(repoPath, relativePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf8");
}

export function filterFiles(repoPath, files, predicate) {
  return files.filter((filePath) => predicate(rel(repoPath, filePath)));
}

export function sumLengths(groups) {
  return groups.reduce((total, group) => total + group.length, 0);
}

export function formatMatches(title, matches, emptyMessage) {
  const lines = [`${title}`];
  if (!matches.length) {
    lines.push(`  - ${emptyMessage}`);
    return lines.join("\n");
  }
  for (const match of matches.slice(0, 4)) {
    lines.push(`  - ${match.file}:${match.line} -> ${match.snippet}`);
  }
  return lines.join("\n");
}

export function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}
