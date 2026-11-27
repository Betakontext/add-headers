// SPDX-FileCopyrightText: 2026 Christoph Medicus
// SPDX-License-Identifier: MIT

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, extname, resolve, relative, dirname  } from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";

// -- headers.txt next to *.mts
const scriptDir = dirname(fileURLToPath(import.meta.url));

// --- CLI ---
const targetDir = process.argv[2];
if (!targetDir) {
  console.error("Usage: npx tsx add-headers.mts <path-to-repo>");
  process.exit(1);
}

const root = resolve(targetDir);
if (!existsSync(root)) {
  console.error(`Error: path does not exist: ${root}`);
  process.exit(1);
}

// --- Load header ---
const HEADER_FILE = join(scriptDir, "header.txt");
if (!existsSync(HEADER_FILE)) {
  console.error(`Error: ${HEADER_FILE} not found.`);
  process.exit(1);
}
const rawHeader = readFileSync(HEADER_FILE, "utf-8");

// --- Config ---
const SKIP_DIRS = new Set([
  "node_modules", "__pycache__", "models", "outputs",
  "build", "third_party", "CMakeFiles", "cmake-build-debug", "cmake-build-release",
  "parakeet.cpp",
]);
const SKIP_EXTS = new Set([".json", ".bin", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".mp4", ".woff", ".woff2"]);

function getCommentStyle(ext: string): { prefix: string; wrap?: [string, string] } | null {
  switch (ext) {
    case ".py": case ".sh": case ".ps1": case ".service":
    case ".toml": case ".yml": case ".yaml": case ".env":
      return { prefix: "# " };
    case ".ts": case ".tsx": case ".js": case ".jsx":
    case ".astro": case ".css": case ".scss":
      return { prefix: "// " };
    case ".html":
      return { wrap: ["<!-- ", " -->"] };
    default:
      return null;
  }
}

function buildHeader(raw: string, style: { prefix: string; wrap?: [string, string] }): string {
  const lines = raw.trim().split("\n");
  if (style.wrap) {
    const body = lines.map((l) => `  ${l}`).join("\n");
    return `${style.wrap[0]}\n${body}\n${style.wrap[1]}\n\n`;
  }
  return lines.map((l) => style.prefix + l).join("\n") + "\n\n";
}

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

// --- Scan ---
const files = walk(root);
const toModify: string[] = [];
const skipped: string[] = [];
const SKIP_FILES = new Set(["license", "license.md", "license.txt", "licence.md", "licence.txt", "copying", "copying.md"]);

for (const file of files) {
  const basename = file.split("/").pop()!.split("\\").pop()!.toLowerCase();
  if (SKIP_FILES.has(basename)) continue;
  const ext = extname(file).toLowerCase();
  if (SKIP_EXTS.has(ext)) continue;
  const style = getCommentStyle(ext);
  if (!style) continue;

  const content = readFileSync(file, "utf-8");
  if (content.includes("SPDX-License-Identifier")) {
    skipped.push(file);
    continue;
  }
  toModify.push(file);
}

// --- Summary & confirm ---
console.log(`\nTarget: ${root}`);
console.log(`Files to update: ${toModify.length}`);
console.log(`Already have header (skipped): ${skipped.length}\n`);

if (toModify.length === 0) {
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

// --- Execute ---
let modified = 0;
for (const file of toModify) {
  const ext = extname(file).toLowerCase();
  const style = getCommentStyle(ext)!;
  const content = readFileSync(file, "utf-8");
  writeFileSync(file, buildHeader(rawHeader, style) + content, "utf-8");
  console.log(`✅ ${relative(root, file)}`);
  modified++;
}

console.log(`\nDone: ${modified} file(s) updated.`);
