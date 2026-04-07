import { createMcpServer } from "@/lib/mcp/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

function getBaseUrl() {
  return process.env.CHORE_CALENDAR_URL || `http://localhost:${process.env.PORT || 3000}`;
}

async function handleRequest(req: Request) {
  const server = createMcpServer(getBaseUrl());
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };
