#!/usr/bin/env node
// PostToolUse hook (Write|Edit): formats the touched file with Prettier, then
// runs `eslint --fix` on it. Any lint problems that --fix couldn't resolve
// are reported back to Claude via hookSpecificOutput.additionalContext.
//
// Scoped to this project only (lives in .claude/hooks/, referenced from
// .claude/settings.json which is checked into this repo).
//
// Must never block or crash a Write/Edit: every failure path exits 0 silently
// (or with additionalContext for real lint findings).

import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const PRETTIER_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".mdx",
  ".yml",
  ".yaml",
]);
const ESLINT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) return;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const filePath = payload?.tool_response?.filePath ?? payload?.tool_input?.file_path;
  if (!filePath) return;

  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const abs = path.resolve(root, filePath);
  const rel = path.relative(root, abs);

  // Outside the project (different drive, or escapes via ../) -> skip.
  if (rel.startsWith("..") || path.isAbsolute(rel)) return;

  if (!fs.existsSync(abs)) return;

  const ext = path.extname(abs).toLowerCase();
  const wantsPrettier = PRETTIER_EXTS.has(ext);
  const wantsEslint = ESLINT_EXTS.has(ext);
  if (!wantsPrettier && !wantsEslint) return;

  const prettierBin = path.join(root, "node_modules", "prettier", "bin", "prettier.cjs");
  const eslintBin = path.join(root, "node_modules", "eslint", "bin", "eslint.js");

  if (wantsPrettier && fs.existsSync(prettierBin)) {
    try {
      execFileSync(process.execPath, [prettierBin, "--write", "--ignore-unknown", abs], {
        cwd: root,
        stdio: "ignore",
      });
    } catch {
      // Prettier failing to parse/format a file shouldn't block the turn.
    }
  }

  if (!wantsEslint || !fs.existsSync(eslintBin)) return;

  try {
    execFileSync(process.execPath, [eslintBin, "--fix", abs], {
      cwd: root,
      stdio: "pipe",
    });
    // Exit code 0: no remaining problems.
  } catch (err) {
    const output = [err.stdout, err.stderr]
      .map((b) => (b ? b.toString("utf8") : ""))
      .join("\n")
      .trim();
    if (!output) return;
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `ESLint dejó problemas sin resolver en ${rel} (tras --fix):\n${output}`,
        },
      }),
    );
  }
}

try {
  main();
} catch {
  // Never let a bug in this hook block a Write/Edit.
}
