import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function run(cmd, args, { label, allowFail = false } = {}) {
  const pretty = `${cmd} ${args.join(" ")}`.trim();
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const code = typeof res.status === "number" ? res.status : 1;
  if (code !== 0 && !allowFail) {
    throw new Error(`${label ?? "Command"} failed (${code}): ${pretty}`);
  }
  return { code };
}

function runCapture(cmd, args, { label, allowFail = false } = {}) {
  const pretty = `${cmd} ${args.join(" ")}`.trim();
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const code = typeof res.status === "number" ? res.status : 1;
  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";

  if (code !== 0 && !allowFail) {
    const snippet = (stdout + "\n" + stderr).split(/\r?\n/).slice(0, 40).join("\n");
    throw new Error(`${label ?? "Command"} failed (${code}): ${pretty}\n${snippet}`);
  }
  return { code, stdout, stderr };
}

function walk(dir, { includeExts, ignoreDirs }) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (ignoreDirs.has(entry)) continue;
      results.push(...walk(full, { includeExts, ignoreDirs }));
      continue;
    }
    const ext = path.extname(entry).toLowerCase();
    if (includeExts.has(ext)) results.push(full);
  }
  return results;
}

function scanFiles(files) {
  const findings = {
    consoleCalls: [],
    suspiciousEncoding: [],
  };

  const consoleRe = /\bconsole\.(log|error|warn|info|debug)\s*\(/;
  const qMarksRe = /\?\?\?/;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const text = readFileSync(file, "utf8");

    if (consoleRe.test(text)) {
      findings.consoleCalls.push(rel);
    }

    if (qMarksRe.test(text)) {
      findings.suspiciousEncoding.push(rel);
    }

  }

  return findings;
}

function printFindings(findings) {
  const sections = [];

  if (findings.consoleCalls.length) {
    sections.push({
      title: "console.* calls (should be 0)",
      items: findings.consoleCalls,
    });
  }

  if (findings.suspiciousEncoding.length) {
    sections.push({
      title: "Suspicious '???' (possible encoding/garble)",
      items: findings.suspiciousEncoding,
    });
  }

  if (!sections.length) {
    console.log("\nStatic scan: no findings ✅");
    return;
  }

  console.log("\nStatic scan findings:");
  for (const s of sections) {
    console.log(`\n- ${s.title}`);
    for (const item of s.items.slice(0, 50)) console.log(`  - ${item}`);
    if (s.items.length > 50) console.log(`  ...and ${s.items.length - 50} more`);
  }
}

function runEslintReport() {
  const targets = [
    "app",
    "components",
    "lib",
    "contexts",
    "globals.d.ts",
    "eslint.config.mjs",
    "next.config.ts",
    "tailwind.config.ts",
  ];

  const eslintArgs = [
    "eslint",
    ...targets,
    "--format",
    "json",
    "--no-error-on-unmatched-pattern",
  ];

  const { code, stdout, stderr } = runCapture("npx", eslintArgs, {
    label: "ESLint",
    allowFail: true,
  });

  let parsed;
  try {
    parsed = JSON.parse(stdout || "[]");
  } catch {
    console.log("\nESLint: failed to parse JSON output.");
    if (stderr) console.log(stderr.split(/\r?\n/).slice(0, 20).join("\n"));
    return { errorCount: 0, warningCount: 0, fatal: true, exitCode: code };
  }

  let errorCount = 0;
  let warningCount = 0;
  const issues = [];

  for (const fileResult of parsed) {
    errorCount += fileResult.errorCount || 0;
    warningCount += fileResult.warningCount || 0;
    for (const m of fileResult.messages || []) {
      issues.push({
        filePath: fileResult.filePath,
        line: m.line,
        column: m.column,
        severity: m.severity,
        ruleId: m.ruleId,
        message: m.message,
      });
    }
  }

  const relIssues = issues
    .map((i) => ({
      ...i,
      rel: path.relative(ROOT, i.filePath),
    }))
    .sort((a, b) => (b.severity - a.severity) || a.rel.localeCompare(b.rel) || (a.line - b.line));

  console.log("\nESLint report:");
  console.log(`- Errors: ${errorCount}`);
  console.log(`- Warnings: ${warningCount}`);

  const maxItems = 30;
  if (relIssues.length) {
    console.log(`\nTop ${Math.min(maxItems, relIssues.length)} issues:`);
    for (const it of relIssues.slice(0, maxItems)) {
      const sev = it.severity === 2 ? "ERROR" : "WARN";
      const at = it.line ? `:${it.line}:${it.column}` : "";
      console.log(`- [${sev}] ${it.rel}${at} ${it.ruleId ?? ""} ${it.message}`);
    }
  }

  return { errorCount, warningCount, fatal: false, exitCode: code };
}

function runAuditReport() {
  const { code, stdout } = runCapture("npm", ["audit", "--omit=dev", "--json"], {
    label: "npm audit",
    allowFail: true,
  });

  try {
    const json = JSON.parse(stdout || "{}");
    const meta = json.metadata?.vulnerabilities;
    if (!meta) {
      console.log("\nnpm audit: no metadata (maybe disabled/unsupported)." );
      return { ok: true, exitCode: code };
    }
    const total = Object.values(meta).reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
    console.log("\nnpm audit summary (omit dev):");
    console.log(`- total: ${total} (low:${meta.low ?? 0}, moderate:${meta.moderate ?? 0}, high:${meta.high ?? 0}, critical:${meta.critical ?? 0})`);
    return { ok: (meta.high ?? 0) === 0 && (meta.critical ?? 0) === 0, exitCode: code };
  } catch {
    console.log("\nnpm audit: failed to parse JSON output.");
    return { ok: false, exitCode: code };
  }
}

function main() {
  console.log("\n=== AL-LamiSoft Health Check ===\n");

  // 1) Typecheck/build (authoritative)
  run("npm", ["run", "build"], { label: "Build" });

  // 2) ESLint (report-only; we print a compact summary)
  const eslint = runEslintReport();

  // 3) Security audit (report-only)
  const audit = runAuditReport();

  // 4) Workspace static scan
  const ignoreDirs = new Set([
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    "out",
    "coverage",
    "public",
  ]);
  const includeExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

  const appFiles = walk(path.join(ROOT, "app"), { includeExts, ignoreDirs });
  const libFiles = walk(path.join(ROOT, "lib"), { includeExts, ignoreDirs });
  const componentsFiles = walk(path.join(ROOT, "components"), { includeExts, ignoreDirs });
  const contextFiles = walk(path.join(ROOT, "contexts"), { includeExts, ignoreDirs });

  const all = [...appFiles, ...libFiles, ...componentsFiles, ...contextFiles];
  const findings = scanFiles(all);
  printFindings(findings);

  const hardFail =
    (eslint.fatal || eslint.errorCount > 0) ||
    findings.consoleCalls.length > 0;

  if (hardFail) {
    process.exitCode = 2;
    console.log("\nHealth check FAILED (see summary above).\n");
    return;
  }

  if (!audit.ok) {
    console.log("\nHealth check PASSED (with audit warnings).\n");
    return;
  }

  console.log("\nHealth check PASSED ✅\n");
}

main();
