import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bin as cloudflaredBin, install as installCloudflared } from "cloudflared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");

const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const mode = modeArg === "--mode=start" ? "start" : "dev";
const port = Number(process.env.PORT || 3000);
const localUrl = `http://127.0.0.1:${port}`;
const TRY_CLOUDFLARE_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

function waitForServer(url, timeoutMs = 60000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for Next.js at ${url}`));
          return;
        }
        setTimeout(check, 500);
      });
      req.setTimeout(2000, () => req.destroy());
    };
    check();
  });
}

async function main() {
  if (!fs.existsSync(cloudflaredBin)) {
    console.log("Installing cloudflared binary for public tunnel...");
    await installCloudflared(cloudflaredBin);
  }

  const nextBin = path.join(appDir, "node_modules", "next", "dist", "bin", "next");
  const nextArgs = [nextBin, mode, "-p", String(port), "-H", "0.0.0.0"];

  console.log(`Starting Next.js (${mode}) on ${localUrl}...`);
  const nextProc = spawn(process.execPath, nextArgs, {
    cwd: appDir,
    stdio: "inherit",
    env: process.env,
  });

  let cfProc = null;
  let shuttingDown = false;
  let publicUrl = null;
  let bannerScheduled = false;

  const cleanup = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (cfProc && !cfProc.killed) {
      cfProc.kill();
    }
    if (!nextProc.killed) {
      nextProc.kill();
    }
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  nextProc.on("exit", (code) => {
    if (!shuttingDown) {
      cleanup();
      process.exit(code ?? 1);
    }
  });

  await waitForServer(localUrl);
  console.log("Opening Cloudflare public tunnel (works from any Wi-Fi or mobile data)...");

  cfProc = spawn(
    cloudflaredBin,
    ["tunnel", "--url", localUrl, "--no-autoupdate"],
    { cwd: appDir, stdio: ["ignore", "pipe", "pipe"] }
  );

  const printBannerWhenReady = () => {
    if (bannerScheduled || !publicUrl) return;
    bannerScheduled = true;
    console.log("Tunnel registered. Waiting 8s for public DNS propagation...");
    setTimeout(() => {
      if (shuttingDown || !publicUrl) return;
      console.log("");
      console.log("===============================================================");
      console.log(" Manabi Prep is LIVE across any Wi-Fi or mobile network!");
      console.log(` Public URL : ${publicUrl}`);
      console.log(` Local URL  : http://localhost:${port}`);
      console.log(" Note       : Keep this terminal open while using the Public URL.");
      console.log("              Press Ctrl+C to stop.");
      console.log("===============================================================");
      console.log("");
    }, 8000);
  };

  const handleTunnelOutput = (chunk) => {
    const text = chunk.toString();
    const match = text.match(TRY_CLOUDFLARE_RE);
    if (match && !publicUrl) {
      publicUrl = match[0];
    }
    if (publicUrl && text.includes("Registered tunnel connection")) {
      printBannerWhenReady();
    }
    if (text.includes("ERR ") || text.includes("failed")) {
      process.stderr.write(text);
    }
  };

  cfProc.stdout.on("data", handleTunnelOutput);
  cfProc.stderr.on("data", handleTunnelOutput);

  cfProc.on("error", (err) => {
    console.error("Cloudflare tunnel error:", err.message);
  });

  cfProc.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`Cloudflare tunnel exited with code ${code}`);
      cleanup();
      process.exit(code ?? 1);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
