import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail("Database-backed tests require DATABASE_URL.");

let hostname: string;
try {
  hostname = new URL(connectionString).hostname;
} catch {
  fail("Database-backed tests require a valid DATABASE_URL.");
}

if (process.env.MYKARAOKE_TEST_DB_HOST !== hostname) {
  fail(
    "Database-backed tests refused this database. Set MYKARAOKE_TEST_DB_HOST to the exact hostname of a dedicated hosted test project.",
  );
}

const suite = process.argv[2];
let args: string[];

if (suite === "integration") {
  const files = readdirSync("tests/integration")
    .filter((file) => file.endsWith(".test.ts"))
    .sort()
    .map((file) => `tests/integration/${file}`);
  args = ["--import", "tsx", "--test", ...files];
} else if (suite === "e2e") {
  args = ["playwright", "test", ...process.argv.slice(3)];
} else {
  fail("Expected the integration or e2e database-backed test suite.");
}

const command = suite === "e2e" ? "npx" : process.execPath;
const result = spawnSync(command, args, { env: process.env, stdio: "inherit" });
if (result.error) fail(`Could not start ${suite} tests: ${result.error.message}`);
process.exit(result.status ?? 1);
