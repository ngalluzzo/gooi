import {
  PROTOCOL_VERSION,
  type ListSessionsResponse,
  type LoadSessionRequest,
  type SessionNotification,
} from "@agentclientprotocol/sdk";
import { edge, invoke, path } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { LOG_LIST, LOG_READ, type Log, type StreamInfo } from "@gooi/log";
import { acp } from "./acp.js";

const LIST_REQUEST = { id: "urn:gooi:agent:list-sessions", version: 1 };
const LIST_RESPONSE = {
  id: "https://agentclientprotocol.com/protocol/v1/schema#ListSessionsResponse",
  version: PROTOCOL_VERSION,
};
const SHOW_REQUEST = { id: "urn:gooi:agent:show-session", version: 1 };
const LOAD_REQUEST = {
  id: "https://agentclientprotocol.com/protocol/v1/schema#LoadSessionRequest",
  version: PROTOCOL_VERSION,
};
const TRANSCRIPT = { id: "urn:gooi:agent:transcript", version: 1 };

function transcript(notifications: readonly SessionNotification[]): string {
  const lines: string[] = [];
  const tools = new Map<string, string>();
  for (const { update } of notifications) {
    switch (update.sessionUpdate) {
      case "user_message_chunk":
      case "agent_message_chunk": {
        const speaker = update.sessionUpdate === "user_message_chunk" ? "You" : "Agent";
        const content = update.content;
        lines.push(`${speaker}: ${content.type === "text" ? content.text : `[${content.type}]`}`);
        break;
      }
      case "tool_call":
        tools.set(update.toolCallId, update.title);
        lines.push(`Tool: ${update.title}`);
        break;
      case "tool_call_update":
        if (update.status)
          lines.push(`Tool: ${tools.get(update.toolCallId) ?? update.toolCallId} (${update.status})`);
        break;
    }
  }
  return lines.join("\n");
}

export function sessionHistory(log: Log, cwd: string) {
  const sessions = edge({
    operation: { input: LIST_REQUEST, output: LIST_RESPONSE },
    inputSchema: { type: "object", description: "List saved agent sessions", additionalProperties: false },
    claim: { id: "urn:gooi:agent:sessions-listed", version: 1 },
    scope: "Mapped the observed streams to ACP session information for this workspace",
  }, async (): Promise<ListSessionsResponse> => {
    const result = await invoke(log.list, artifact(LOG_LIST, {}));
    const streams = result.artifact.value as unknown as StreamInfo[];
    return { sessions: streams.map(({ stream, updated }) => ({ sessionId: stream, cwd, updatedAt: updated })) };
  });

  const loadRequest = edge({
    operation: { input: SHOW_REQUEST, output: LOAD_REQUEST },
    inputSchema: {
      type: "object",
      description: "Show the transcript of a saved agent session",
      properties: { session: { type: "string", minLength: 1, description: "Session ID from agent sessions" } },
      required: ["session"],
      additionalProperties: false,
    },
    claim: { id: "urn:gooi:agent:load-request", version: 1 },
    scope: "Formed an ACP load request for the named session in this workspace",
  }, (input): LoadSessionRequest => ({
    sessionId: (input.value as { session: string }).session,
    cwd,
    mcpServers: [],
  }));

  const loadTranscript = edge({
    operation: { input: LOAD_REQUEST, output: TRANSCRIPT },
    inputSchema: acp("LoadSessionRequest"),
    claim: { id: "urn:gooi:agent:transcript-rendered", version: 1 },
    scope: "Read the saved ACP notifications in order and rendered their messages and tool statuses",
  }, async (input) => {
    const request = input.value as unknown as LoadSessionRequest;
    if (request.cwd !== cwd) throw new Error(`Session workspace must be ${cwd}`);
    const result = await invoke(log.read, artifact(LOG_READ, { stream: request.sessionId }));
    const notifications = result.artifact.value as unknown as SessionNotification[];
    if (!notifications.length) throw new Error(`No saved agent session ${request.sessionId}`);
    return transcript(notifications);
  });

  return { sessions, show: path(loadRequest, loadTranscript) };
}
