import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const isWindows = process.platform === "win32";
const isDarwin = process.platform === "darwin";

const NODE_SEA_BLOB = "NODE_SEA_BLOB";
const NODE_SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";
const BIN_DIR = "bin";
const EXECUTABLE_NAME = "starter" + (isWindows ? ".exe" : "");
const BLOB_FILE = "sea-prep.blob";

const logInfo = (msg: string) => console.log(`[INFO] ${msg}`);
const logError = (msg: string) => console.error(`[ERROR] ${msg}`);

const projectRoot = process.cwd();

function ensureBinDir(binDir: string): void {
  if (!existsSync(binDir)) {
    logInfo(`Creating bin directory at ${binDir}`);
    mkdirSync(binDir, { recursive: true });
  }
}

function copyNodeBinary(dest: string): void {
  const src = process.execPath;
  copyFileSync(src, dest);
  logInfo(`Copied Node.js binary from ${src} to ${dest}`);
}

function cleanBinDir(binDir: string): void {
  if (existsSync(binDir)) {
    logInfo(`Cleaning existing bin directory at ${binDir}`);
    rmSync(binDir, { recursive: true, force: true });
  }
}

async function downloadNodeBinary(dest: string): Promise<void> {
  const nodeVersion = process.version;

  let platform: string;
  let arch: string;
  let extension: string;

  if (isDarwin) {
    platform = "darwin";
    extension = "tar.gz";
  } else if (isWindows) {
    platform = "win";
    extension = "zip";
  } else {
    platform = "linux";
    extension = "tar.xz";
  }

  if (process.arch === "x64") {
    arch = "x64";
  } else if (process.arch === "arm64") {
    arch = "arm64";
  } else {
    arch = process.arch;
  }

  const filename = `node-${nodeVersion}-${platform}-${arch}`;
  const downloadUrl = `https://nodejs.org/dist/${nodeVersion}/${filename}.${extension}`;

  logInfo(`Downloading fresh Node.js binary from ${downloadUrl}`);

  const downloadPath = resolve(projectRoot, `${filename}.${extension}`);
  const curlResult = spawnSync(
    "curl",
    ["-L", "-o", downloadPath, downloadUrl],
    {
      stdio: "inherit",
    }
  );

  if (curlResult.error || curlResult.status !== 0) {
    logError(
      `Failed to download Node.js binary: ${curlResult.error || curlResult.status
      }`
    );
    process.exit(1);
  }

  const extractDir = resolve(projectRoot, "temp-extract");
  if (existsSync(extractDir)) {
    rmSync(extractDir, { recursive: true, force: true });
  }
  mkdirSync(extractDir, { recursive: true });

  if (isDarwin || platform === "linux") {
    const tarResult = spawnSync(
      "tar",
      ["-xf", downloadPath, "-C", extractDir],
      {
        stdio: "inherit",
      }
    );
    if (tarResult.error || tarResult.status !== 0) {
      logError(
        `Failed to extract tar file: ${tarResult.error || tarResult.status}`
      );
      process.exit(1);
    }

    const nodeBinaryPath = resolve(extractDir, filename, "bin", "node");
    copyFileSync(nodeBinaryPath, dest);
  } else {
    logError(
      "Windows zip extraction not implemented. Please use the current binary approach for Windows."
    );
    process.exit(1);
  }

  rmSync(downloadPath, { force: true });
  rmSync(extractDir, { recursive: true, force: true });

  logInfo(`Downloaded and copied fresh Node.js binary to ${dest}`);
}

function removeSignature(targetBinary: string): void {
  if (isDarwin) {
    logInfo(`Removing signature from ${targetBinary} (macOS)...`);
    const result = spawnSync("codesign", ["--remove-signature", targetBinary], {
      stdio: "inherit",
      shell: false,
    });
    if (result.error || result.status !== 0) {
      logError(
        `codesign --remove-signature failed. Error: ${result.error}, Status: ${result.status}`
      );
      process.exit(result.status || 1);
    }
    logInfo("Signature removed successfully (macOS).");
  } else if (isWindows) {
    logInfo(`Attempting to remove signature from ${targetBinary} (Windows)...`);
    const result = spawnSync("signtool", ["remove", "/s", targetBinary], {
      stdio: "inherit",
      shell: false,
    });
    if (result.error) {
      logInfo(
        `signtool remove command failed to start (signtool may not be in PATH or installed): ${result.error}. This step is optional on Windows.`
      );
    } else if (result.status !== 0) {
      logInfo(
        `signtool remove command exited with status ${result.status}. This step is optional on Windows.`
      );
    } else {
      logInfo("Signature removal with signtool successful (Windows).");
    }
  }
}

function signBinary(targetBinary: string): void {
  if (isDarwin) {
    logInfo(`Signing ${targetBinary} (macOS)...`);
    const result = spawnSync("codesign", ["--sign", "-", targetBinary], {
      stdio: "inherit",
      shell: false,
    });
    if (result.error || result.status !== 0) {
      logError(
        `codesign --sign - failed. Error: ${result.error}, Status: ${result.status}`
      );
      process.exit(result.status || 1);
    }
    logInfo("Binary signed successfully (macOS).");
  } else if (isWindows) {
    logInfo(
      `Signing ${targetBinary} (Windows) is optional and typically requires a certificate. Skipping automatic signing.`
    );
    // For Windows, manual signing with a specific certificate would be done here if needed:
    // e.g., signtool sign /f MyCert.pfx /p MyPassword myapp.exe
  }
}

function getPostjectCommandAndArgs(
  targetBinary: string,
  blobFile: string
): { command: string; args: string[]; shell: boolean; } {
  const postjectBin = resolve(
    projectRoot,
    "node_modules",
    ".bin",
    isWindows ? "postject.cmd" : "postject"
  );
  const command = isWindows ? "cmd.exe" : postjectBin;
  const baseArgs = isWindows ? ["/c", postjectBin] : [];
  const args = [
    ...baseArgs,
    targetBinary,
    NODE_SEA_BLOB,
    blobFile,
    "--sentinel-fuse",
    NODE_SEA_FUSE,
  ];

  if (isDarwin) {
    args.push("--macho-segment-name", "NODE_SEA");
  }

  return { command, args, shell: isWindows };
}

function runPostject(targetBinary: string, blobFile: string): void {
  logInfo("Injecting SEA blob into the Node.js binary...");
  const { command, args, shell } = getPostjectCommandAndArgs(
    targetBinary,
    blobFile
  );
  logInfo(`Executing: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell });
  if (result.error) {
    logError(`Failed to start postject: ${result.error}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    logError(`Postject failed with status ${result.status}.`);
    process.exit(result.status || 1);
  }
  logInfo("Postject execution successful.");
}

async function main(): Promise<void> {
  const binDir = resolve(projectRoot, BIN_DIR);
  const targetBinaryPath = resolve(binDir, EXECUTABLE_NAME);
  const blobFilePath = resolve(projectRoot, BLOB_FILE);

  if (!existsSync(blobFilePath)) {
    logError(
      `Blob file not found at ${blobFilePath}. Run 'node --experimental-sea-config sea-config.json' (or your equivalent blob generation script) first.`
    );
    process.exit(1);
  }

  cleanBinDir(binDir);
  ensureBinDir(binDir);
  if (isWindows) {
    copyNodeBinary(targetBinaryPath);
  } else {
    await downloadNodeBinary(targetBinaryPath);
  }
  removeSignature(targetBinaryPath);
  runPostject(targetBinaryPath, blobFilePath);
  signBinary(targetBinaryPath);
  logInfo(`SEA injection complete! Executable created at: ${targetBinaryPath}`);
}

main().catch((error) => {
  logError(`Unexpected error: ${error}`);
  process.exit(1);
});
