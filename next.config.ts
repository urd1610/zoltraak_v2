import os from "node:os";
import type { NextConfig } from "next";

function getAllowedDevOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    "127.0.0.1",
    "::1",
  ]);

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.internal) {
        continue;
      }

      const normalizedAddress = address.address.split("%", 1)[0];

      if (normalizedAddress) {
        origins.add(normalizedAddress);
      }
    }
  }

  const extraOrigins = process.env.NEXT_DEV_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of extraOrigins ?? []) {
    origins.add(origin);
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  allowedDevOrigins:
    process.env.NODE_ENV === "development"
      ? getAllowedDevOrigins()
      : undefined,
};

export default nextConfig;
