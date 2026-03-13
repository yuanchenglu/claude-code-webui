export interface StreamResponse {
  type: "claude_json" | "error" | "done" | "aborted" | "permission_request" | "ask_user_question";
  data?: unknown;
  error?: string;
  permissionRequestId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  question?: string;
  suggestions?: string[];
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  requestId: string;
  allowedTools?: string[];
  workingDirectory?: string;
  permissionMode?: "default" | "plan" | "acceptEdits";
}

export interface AbortRequest {
  requestId: string;
}

export interface ProjectInfo {
  path: string;
  encodedName: string;
}

export interface ProjectsResponse {
  projects: ProjectInfo[];
}

// Conversation history types
export interface ConversationSummary {
  sessionId: string;
  startTime: string;
  lastTime: string;
  messageCount: number;
  lastMessagePreview: string;
}

export interface HistoryListResponse {
  conversations: ConversationSummary[];
}

// Conversation history types
// Note: messages are typed as unknown[] to avoid frontend/backend dependency issues
// Frontend should cast to TimestampedSDKMessage[] (defined in frontend/src/types.ts)
export interface ConversationHistory {
  sessionId: string;
  messages: unknown[];
  metadata: {
    startTime: string;
    endTime: string;
    messageCount: number;
  };
}

export interface PermissionResponse {
  requestId: string;
  allow: boolean;
  rememberEntry?: string;
  updatedInput?: Record<string, unknown>;
  message?: string;
}

export interface AskUserResponse {
  requestId: string;
  answer: string | string[];
}
