// Cross-platform SEA injection script for Node.js single executable (TypeScript ESM)
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// __dirname and __filename polyfill for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..", "..");

function getNodeBinary(): string {
  return process.execPath;
}

function copyNodeBinary(dest: string) {
  const src = getNodeBinary();
  copyFileSync(src, dest);
  console.log(`Copied Node.js binary from ${src} to ${dest}`);
}

function runPostject(targetBinary: string, blobFile: string) {
  const postjectArgs = [
    "-y",
    "postject",
    targetBinary,
    "NODE_SEA_BLOB",
    blobFile,
    "--sentinel-fuse",
    "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  ];

  if (process.platform === "darwin") {
    postjectArgs.push("--macho-segment-name", "NODE_SEA");
  }

  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    postjectArgs,
    { stdio: "inherit" }
  );
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  const targetBinary = resolve(
    __dirname,
    "bin",
    "starter" + (process.platform === "win32" ? ".exe" : "")
  );
  const blobFile = resolve(__dirname, "sea-prep.blob");

  if (!existsSync(blobFile)) {
    console.error("Error: blob file not found. Run the SEA blob step first.");
    process.exit(1);
  }

  // Ensure bin directory exists within the project root
  mkdirSync(resolve(__dirname, "bin"), { recursive: true });
  copyNodeBinary(targetBinary);
  runPostject(targetBinary, blobFile);
  console.log("SEA injection complete!");
}

main();
