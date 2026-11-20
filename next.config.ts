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

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "127.0.0.1",
    ...getLocalIpv4Addresses(),
  ],
};

export default nextConfig;
