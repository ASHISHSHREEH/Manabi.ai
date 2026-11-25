import os from "node:os";
import type { NextConfig } from "next";

function getLocalIpv4Addresses(): string[] {
  const ips: string[] = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

// Sandbox preview only: the Base44 preview proxy forwards requests with the
// public host as Origin, which Next.js dev blocks unless it is allowlisted.
// Gated on BASE44_PREVIEW_MODE === "1"; unset keeps the original behaviour.
const previewHostOrigins =
  process.env.BASE44_PREVIEW_MODE === "1" && process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
    : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "127.0.0.1",
    ...getLocalIpv4Addresses(),
    ...previewHostOrigins,
  ],
};

export default nextConfig;
