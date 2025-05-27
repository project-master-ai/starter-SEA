import { execSync, spawn } from "child_process";
import {
  DEFAULT_PROJECT_NAME,
  RECOMMENDED_NODE_VERSION,
  SCRIPT_FILE_MODE_EXECUTABLE,
} from "./constants";
import path from "path";
import fs from "fs";

const validateNodeVersion = (recommendedVersion: number): boolean => {
  console.log(`Checking for Node.js installation...`);

  try {
    const versionOutput = execSync("node --version", { encoding: "utf8" });
    const version = versionOutput.replace("v", "").trim();
    const major = parseInt(version.split(".")[0], 10);

    console.log(`Found Node.js version ${version}`);

    if (major >= recommendedVersion) {
      console.log(`Node.js version is sufficient (≥ ${recommendedVersion})`);
      return true;
    } else {
      console.log(
        `Node.js version is below recommended version ${recommendedVersion}`
      );
      return false;
    }
  } catch (error) {
    console.log("Node.js not found in current environment");
    console.log("Will install Node.js automatically");
    return false;
  }
};

const installNode = (version: number): void => {
  console.log(`Installing Node.js v${version}...`);

  try {
    let isFnmInstalled = false;
    try {
      execSync("fnm --version", { stdio: "ignore", shell: "cmd.exe" });
      isFnmInstalled = true;
    } catch {
      isFnmInstalled = false;
    }

    if (!isFnmInstalled) {
      console.log("Installing fnm via winget...");
      execSync(
        "winget install Schniz.fnm -e --accept-package-agreements --accept-source-agreements",
        { stdio: "inherit", shell: "cmd.exe" }
      );
    }

    console.log(`Installing Node.js v${version} using fnm...`);
    execSync(`fnm install ${version}`, {
      stdio: "inherit",
      shell: "cmd.exe",
    });

    console.log(
      `Node.js v${version} installed successfully. Environment will be set up in the project setup.`
    );
  } catch (err) {
    console.error("Failed to install Node.js with fnm:", err);
    throw err;
  }
};

const launchProjectScaffold = (
  projectRoot: string,
  projectName: string,
  nodeVersion: number
): void => {
  const setupScript = [
    "@echo off",
    `cd /d "${projectRoot}"`,
    "echo Creating Vite React Project...",
    "echo.",
    "",
    "REM Setup Node.js environment",
    "fnm --version >nul 2>&1",
    "if errorlevel 1 (",
    "    winget install Schniz.fnm -e --accept-package-agreements --accept-source-agreements --silent",
    ")",
    "",
    `fnm install ${nodeVersion} >nul 2>&1`,
    `fnm use ${nodeVersion} >nul 2>&1`,
    "if errorlevel 1 (",
    '    for /f "usebackq delims=" %%i in (`fnm env --use-on-cd`) do %%i',
    `    fnm use ${nodeVersion}`,
    ")",
    "",
    "node --version >nul 2>&1",
    "if errorlevel 1 (",
    "    echo ERROR: Node.js setup failed. Please restart your terminal and try again.",
    "    pause",
    "    exit /b 1",
    ")",
    "",
    "echo Creating project...",
    `echo y | npx create-vite@latest ${projectName} --template react`,
    `if not exist "${projectName}" (`,
    "    echo Failed to create project",
    "    pause",
    "    exit /b 1",
    ")",
    "",
    `cd /d "${projectName}"`,
    "echo Installing dependencies...",
    "npm install",
    "if errorlevel 1 (",
    "    echo npm install failed",
    "    pause",
    "    exit /b 1",
    ")",
    "",
    "echo Starting development server...",
    "echo Press Ctrl+C to stop the server",
    "timeout /t 2 /nobreak >nul",
    "start \"\" \"http://localhost:5173\"",
    "npm run dev",
  ].join("\n");

  const setupPath = path.join(projectRoot, "setup.bat");
  fs.writeFileSync(setupPath, setupScript, {
    mode: SCRIPT_FILE_MODE_EXECUTABLE,
  });

  spawn("cmd", ["/c", "start", "", "/D", projectRoot, "cmd", "/k", setupPath], {
    detached: true,
    stdio: "ignore",
  });

  console.log("A new Command Prompt window has been opened to complete setup.");

  process.exit(0);
};

export const setupWindows = () => {
  const hasRequiredNodeVersion = validateNodeVersion(RECOMMENDED_NODE_VERSION);

  if (!hasRequiredNodeVersion) {
    console.log("Installing Node.js...");
    installNode(RECOMMENDED_NODE_VERSION);
    console.log("Node.js installation completed.");
    console.log(
      "Note: Node.js environment will be configured in the setup script."
    );
  } else {
    console.log("Node.js is available and ready.");
  }

  console.log("Launching project scaffolding...");

  launchProjectScaffold(
    __dirname,
    DEFAULT_PROJECT_NAME,
    RECOMMENDED_NODE_VERSION
  );
};
