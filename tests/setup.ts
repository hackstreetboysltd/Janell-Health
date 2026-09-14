import { execSync } from "node:child_process";

const migrated = Symbol.for("carelink.test.migrated");
const globalState = globalThis as Record<symbol, boolean>;

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && !process.env.DIRECT_URL) {
  process.env.DIRECT_URL = databaseUrl;
}
if (
  !globalState[migrated] &&
  databaseUrl &&
  (databaseUrl.includes("carelink_test") || process.env.VITEST_FORCE_MIGRATE === "true")
) {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
  globalState[migrated] = true;
}
