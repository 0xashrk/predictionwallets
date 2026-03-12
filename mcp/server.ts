import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerWalletBalanceTools } from "../src/mcp/wallet-balance-tools";

const server = new McpServer({
  name: "predictionwallets",
  version: process.env.npm_package_version ?? "0.0.0",
});

registerWalletBalanceTools(server);

const transport = new StdioServerTransport();
let isShuttingDown = false;

async function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  await server.close().catch(() => undefined);
  process.exit(exitCode);
}

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

try {
  await server.connect(transport);
} catch (error) {
  console.error("Failed to start the MCP server.", error);
  await shutdown(1);
}
