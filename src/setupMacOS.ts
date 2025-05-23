import { execSync } from "child_process";
import {
  DEFAULT_PROJECT_NAME,
  RECOMMENDED_NODE_VERSION,
  SCRIPT_FILE_MODE_EXECUTABLE,
} from "./constants";
import path from "path";
import fs from "fs";

const validateNodeVersion = (recommendedVersion: number): boolean => {
  const whichCommand = "/usr/bin/which node";
  console.log(`Executing: ${whichCommand}`);

  try {
    const nodePath = execSync(whichCommand).toString().trim();
    console.log(`Node.js found at: ${nodePath}`);

    const versionOutput = execSync(`"${nodePath}" --version`).toString().trim();
    const version = versionOutput.replace("v", "");
    const major = parseInt(version.split(".")[0], 10);

    console.log(`System Node.js version ${version} detected`);

    if (major < recommendedVersion) {
      console.log(`System Node.js version is below ${recommendedVersion}`);

      return false;
    } else {
      console.log(
        `System Node.js version is sufficient (≥ ${recommendedVersion})`
      );

      return true;
    }
  } catch (error) {
    console.log("Node.js not found in PATH");

    throw error;
  }
};

const installNode = (version: number) => {
  console.log(`Installing Node.js v${version}...`);

  try {
    let isNvmInstalled = false;
    try {
      execSync("command -v nvm", { stdio: "ignore", shell: "/bin/bash" });
      isNvmInstalled = true;
    } catch {
      isNvmInstalled = false;
    }

    if (!isNvmInstalled) {
      console.log("Downloading and installing nvm...");
      execSync(
        "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash",
        { stdio: "inherit", shell: "/bin/bash" }
      );
    }

    execSync(`. ~/.nvm/nvm.sh && nvm install ${version}`, {
      stdio: "inherit",
      shell: "/bin/bash",
    });

    execSync(`. ~/.nvm/nvm.sh && nvm alias default ${version}`, {
      stdio: "inherit",
      shell: "/bin/bash",
    });

    console.log(`Node.js v${version} installed using nvm and set as default.`);
  } catch (err) {
    console.error("Failed to install Node.js with nvm:", err);
  }
};

const launchProjectScaffold = (projectRoot: string, projectName: string) => {
  const setupScript = `#!/bin/bash\n\ncd \"${projectRoot}\"\n. ~/.nvm/nvm.sh\nnvm use ${RECOMMENDED_NODE_VERSION}\necho Node version: $(node -v)\nnpm install -g create-vite@latest\nnpm create vite@latest ${projectName} -- --template react\ncd ${projectName}\nnpm install\nnpm run dev -- --open &\nDEV_PID=$!\ndisown $DEV_PID\nrm -- \"$0\"\nexit 0\n`;
  const setupPath = path.join(projectRoot, "setup.sh");
  fs.writeFileSync(setupPath, setupScript, {
    mode: SCRIPT_FILE_MODE_EXECUTABLE,
  });
  const appleScriptCmd = `osascript -e 'tell application "Terminal" to do script "bash '${setupPath}'"'`;
  execSync(appleScriptCmd);
  console.log("A new Terminal window has been opened to complete setup.");
  process.exit(0);
};

export const setupMacOs = () => {
  const hasRequiredNodeVersion = validateNodeVersion(RECOMMENDED_NODE_VERSION);

  if (!hasRequiredNodeVersion) {
    console.log("Installing Node.js...");
    installNode(RECOMMENDED_NODE_VERSION);
    console.log("Node.js installation completed.");
  } else {
    console.log("Node.js is available and ready.");
  }

  launchProjectScaffold(__dirname, DEFAULT_PROJECT_NAME);
};
