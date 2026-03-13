import { useState, useEffect, useCallback } from "react";
import type { AllMessage, TimestampedSDKMessage } from "../types";
import type { ConversationHistory } from "../../../shared/types";
import { getConversationUrl } from "../config/api";
import { useMessageConverter } from "./useMessageConverter";

const INITIAL_LOAD_LIMIT = 20;

interface HistoryLoaderState {
  messages: AllMessage[];
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  hasMore: boolean;
  totalCount: number;
}

interface HistoryLoaderResult extends HistoryLoaderState {
  loadHistory: (projectPath: string, sessionId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearHistory: () => void;
}

// Type guard to check if a message is a TimestampedSDKMessage
function isTimestampedSDKMessage(
  message: unknown,
): message is TimestampedSDKMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    "timestamp" in message &&
    typeof (message as { timestamp: unknown }).timestamp === "string"
  );
}

/**
 * Hook for loading and converting conversation history from the backend
 */
export function useHistoryLoader(): HistoryLoaderResult {
  const [state, setState] = useState<HistoryLoaderState>({
    messages: [],
    loading: false,
    error: null,
    sessionId: null,
    hasMore: false,
    totalCount: 0,
  });

  const { convertConversationHistory } = useMessageConverter();

  const loadHistory = useCallback(
    async (encodedProjectName: string, sessionId: string) => {
      if (!encodedProjectName || !sessionId) {
        setState((prev) => ({
          ...prev,
          error: "Encoded project name and session ID are required",
        }));
        return;
      }

      try {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));

        const response = await fetch(
          `${getConversationUrl(encodedProjectName, sessionId)}?limit=${INITIAL_LOAD_LIMIT}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load conversation: ${response.status} ${response.statusText}`,
          );
        }

        const conversationHistory: ConversationHistory = await response.json();

        if (
          !conversationHistory.messages ||
          !Array.isArray(conversationHistory.messages)
        ) {
          throw new Error("Invalid conversation history format");
        }

        const timestampedMessages: TimestampedSDKMessage[] = [];
        for (const msg of conversationHistory.messages) {
          if (isTimestampedSDKMessage(msg)) {
            timestampedMessages.push(msg);
          } else {
            console.warn("Skipping invalid message in history:", msg);
          }
        }

        const convertedMessages =
          convertConversationHistory(timestampedMessages);

        setState((prev) => ({
          ...prev,
          messages: convertedMessages,
          loading: false,
          sessionId: conversationHistory.sessionId,
          hasMore: conversationHistory.metadata?.hasMore ?? false,
          totalCount: conversationHistory.metadata?.totalCount ?? convertedMessages.length,
        }));
      } catch (error) {
        console.error("Error loading conversation history:", error);

        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load conversation history",
        }));
      }
    },
    [convertConversationHistory],
  );

  const loadMore = useCallback(async () => {
    const currentCount = state.messages.length;
    if (!state.sessionId || state.loading || !state.hasMore) return;

    try {
      setState((prev) => ({ ...prev, loading: true }));

      const encodedProjectName = window.location.pathname
        .split("/")[2]
        ? decodeURIComponent(window.location.pathname.split("/")[2])
        : null;

      if (!encodedProjectName) return;

      const response = await fetch(
        `${getConversationUrl(
          encodeURIComponent(encodedProjectName),
          state.sessionId,
        )}?limit=${INITIAL_LOAD_LIMIT}&offset=${currentCount}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to load more: ${response.status}`);
      }

      const conversationHistory: ConversationHistory = await response.json();

      const timestampedMessages: TimestampedSDKMessage[] = [];
      for (const msg of conversationHistory.messages) {
        if (isTimestampedSDKMessage(msg)) {
          timestampedMessages.push(msg);
        }
      }

      const newMessages = convertConversationHistory(timestampedMessages);

      setState((prev) => ({
        ...prev,
        messages: [...newMessages, ...prev.messages],
        loading: false,
        hasMore: conversationHistory.metadata?.hasMore ?? false,
      }));
    } catch (error) {
      console.error("Error loading more messages:", error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.sessionId, state.messages.length, state.loading, state.hasMore, convertConversationHistory]);

  const clearHistory = useCallback(() => {
    setState({
      messages: [],
      loading: false,
      error: null,
      sessionId: null,
      hasMore: false,
      totalCount: 0,
    });
  }, []);

  return {
    ...state,
    loadHistory,
    loadMore,
    clearHistory,
  };
}

/**
 * Hook for loading conversation history on mount when sessionId is provided
 */
export function useAutoHistoryLoader(
  encodedProjectName?: string,
  sessionId?: string,
): HistoryLoaderResult {
  const historyLoader = useHistoryLoader();

  useEffect(() => {
    if (encodedProjectName && sessionId) {
      historyLoader.loadHistory(encodedProjectName, sessionId);
    } else if (!sessionId) {
      historyLoader.clearHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedProjectName, sessionId]);

  return historyLoader;
}
