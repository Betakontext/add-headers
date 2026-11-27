// SPDX-FileCopyrightText: 2026 Christoph Medicus
// SPDX-License-Identifier: MIT

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, resolve, relative, dirname } from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

const targetDir = process.argv[2];
if (!targetDir) {
  console.error("Usage: npx tsx remove-headers.mts <path-to-repo>");
  process.exit(1);
}

const root = resolve(targetDir);

// Same whitelist as add-headers.mts
const TEXT_EXTS = new Set([
  ".py", ".sh", ".ps1", ".service", ".toml", ".yml", ".yaml", ".env",
  ".ts", ".tsx", ".js", ".jsx", ".astro", ".css", ".scss",
  ".html", ".md",
]);

const SKIP_DIRS = new Set(["node_modules"]);

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry) && !entry.startsWith(".")) results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const files = walk(root);
const toRemove: string[] = [];

for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (!TEXT_EXTS.has(ext)) continue;

  const content = readFileSync(file, "utf-8");
  if (content.startsWith("// SPDX-FileCopyrightText:") ||
      content.startsWith("# SPDX-FileCopyrightText:") ||
      content.startsWith("<!--\n  SPDX-FileCopyrightText:")) {
    toRemove.push(file);
  }
}

console.log(`\nTarget: ${root}`);
console.log(`Files to clean: ${toRemove.length}\n`);

if (toRemove.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise<string>((res) =>
  rl.question("Proceed? [y/N] ", (a) => res(a.trim().toLowerCase()))
);
rl.close();

if (answer !== "y" && answer !== "yes") {
  console.log("Aborted.");
  process.exit(0);
}

let cleaned = 0;
for (const file of toRemove) {
  let content = readFileSync(file, "utf-8");
  const lines = content.split("\n");
  let end = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("SPDX-License-Identifier")) { end = i + 1; break; }
  }
  if (end < lines.length && lines[end].trim() === "") end++;

  content = lines.slice(end).join("\n");
  writeFileSync(file, content, "utf-8");
  console.log(`🗑  ${relative(root, file)}`);
  cleaned++;
}

console.log(`\nDone: ${cleaned} file(s) cleaned.`);
