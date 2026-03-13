import { Context } from "hono";
import { query, type PermissionMode } from "@anthropic-ai/claude-code";
import type {
  ChatRequest,
  StreamResponse,
  PermissionResponse,
} from "../../shared/types.ts";
import { logger } from "../utils/logger.ts";
import {
  createPermissionRequest,
  resolvePermissionRequest,
  generateRequestId,
} from "./permission.ts";

const TOOLS_REQUIRING_INTERACTION = new Set(["AskUserQuestion"]);

interface PermissionQueueItem {
  type: "permission_request";
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
}

async function* executeClaudeCommand(
  message: string,
  requestId: string,
  requestAbortControllers: Map<string, AbortController>,
  cliPath: string,
  sessionId?: string,
  allowedTools?: string[],
  workingDirectory?: string,
  permissionMode?: PermissionMode,
  permissionQueue?: PermissionQueueItem[],
): AsyncGenerator<StreamResponse> {
  const abortController = new AbortController();
  requestAbortControllers.set(requestId, abortController);
  const permissionQueueLocal = permissionQueue || [];

  let processedMessage = message;
  if (message.startsWith("/")) {
    processedMessage = message.substring(1);
  }

  const canUseTool = async (
    toolName: string,
    input: Record<string, unknown>,
    options: { signal: AbortSignal; suggestions?: unknown },
  ): Promise<{ behavior: "allow" | "deny"; updatedInput: Record<string, unknown>; message?: string }> => {
    const requiresInteraction = TOOLS_REQUIRING_INTERACTION.has(toolName);

    if (permissionMode === "bypassPermissions" && !requiresInteraction) {
      return { behavior: "allow", updatedInput: input };
    }

    if (allowedTools) {
      const isAllowed = allowedTools.some(
        (tool) => tool === toolName || tool.startsWith(`${toolName}(`),
      );
      if (isAllowed && !requiresInteraction) {
        return { behavior: "allow", updatedInput: input };
      }
    }

    const permRequestId = generateRequestId();

    permissionQueueLocal.push({
      type: "permission_request",
      requestId: permRequestId,
      toolName,
      toolInput: input,
    });

    try {
      const response = await createPermissionRequest(
        permRequestId,
        toolName,
        input,
      );

      if (response.allow) {
        if (response.rememberEntry && allowedTools) {
          allowedTools.push(response.rememberEntry);
        }
        return {
          behavior: "allow",
          updatedInput: response.updatedInput || input,
        };
      }

      return {
        behavior: "deny",
        updatedInput: input,
        message: response.message || "User denied tool use",
      };
    } catch (error) {
      return {
        behavior: "deny",
        updatedInput: input,
        message: error instanceof Error ? error.message : "Permission request failed",
      };
    }
  };

  try {
    const queryOptions: Parameters<typeof query>[0]["options"] = {
      abortController,
      executable: "node" as const,
      executableArgs: [],
      pathToClaudeCodeExecutable: cliPath,
      ...(sessionId ? { resume: sessionId } : {}),
      ...(allowedTools ? { allowedTools } : {}),
      ...(workingDirectory ? { cwd: workingDirectory } : {}),
      ...(permissionMode ? { permissionMode } : {}),
      canUseTool,
    };

    for await (const sdkMessage of query({
      prompt: processedMessage,
      options: queryOptions,
    })) {
      logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });

      while (permissionQueueLocal.length > 0) {
        const permRequest = permissionQueueLocal.shift()!;
        yield {
          type: "permission_request",
          permissionRequestId: permRequest.requestId,
          toolName: permRequest.toolName,
          toolInput: permRequest.toolInput,
        };
      }

      yield {
        type: "claude_json",
        data: sdkMessage,
      };
    }

    while (permissionQueueLocal.length > 0) {
      const permRequest = permissionQueueLocal.shift()!;
      yield {
        type: "permission_request",
        permissionRequestId: permRequest.requestId,
        toolName: permRequest.toolName,
        toolInput: permRequest.toolInput,
      };
    }

    yield { type: "done" };
  } catch (error) {
    logger.chat.error("Claude Code execution failed: {error}", { error });
    yield {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (requestAbortControllers.has(requestId)) {
      requestAbortControllers.delete(requestId);
    }
  }
}

export async function handleChatRequest(
  c: Context,
  requestAbortControllers: Map<string, AbortController>,
) {
  const chatRequest: ChatRequest = await c.req.json();
  const { cliPath } = c.var.config;

  logger.chat.debug(
    "Received chat request {*}",
    chatRequest as unknown as Record<string, unknown>,
  );

  const permissionQueue: PermissionQueueItem[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of executeClaudeCommand(
          chatRequest.message,
          chatRequest.requestId,
          requestAbortControllers,
          cliPath,
          chatRequest.sessionId,
          chatRequest.allowedTools,
          chatRequest.workingDirectory,
          chatRequest.permissionMode,
          permissionQueue,
        )) {
          const data = JSON.stringify(chunk) + "\n";
          controller.enqueue(new TextEncoder().encode(data));
        }
        controller.close();
      } catch (error) {
        const errorResponse: StreamResponse = {
          type: "error",
          error: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(errorResponse) + "\n"),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function handlePermissionResponse(c: Context) {
  const response: PermissionResponse = await c.req.json();

  logger.permission.debug("Received permission response: {response}", {
    response,
  });

  const success = resolvePermissionRequest(response);

  if (!success) {
    return c.json({ error: "No pending permission request found" }, 404);
  }

  return c.json({ success: true });
}