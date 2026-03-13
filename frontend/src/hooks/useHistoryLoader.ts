import { useState, useEffect, useCallback, useRef } from "react";
import type { AllMessage, TimestampedSDKMessage } from "../types";
import type { ConversationHistory } from "../../../shared/types";
import { getConversationUrl } from "../config/api";
import { useMessageConverter } from "./useMessageConverter";
import { convertConversationHistory as convertMessages } from "../utils/messageConversion";

interface HistoryLoaderState {
  messages: AllMessage[];
  loading: boolean;
  error: string | null;
  sessionId: string | null;
}

interface HistoryLoaderResult extends HistoryLoaderState {
  loadHistory: (projectPath: string, sessionId: string) => Promise<void>;
  appendMessages: (newMessages: AllMessage[]) => void;
  clearHistory: () => void;
}

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

export function useHistoryLoader(): HistoryLoaderResult {
  const [state, setState] = useState<HistoryLoaderState>({
    messages: [],
    loading: false,
    error: null,
    sessionId: null,
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
          getConversationUrl(encodedProjectName, sessionId),
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

  const appendMessages = useCallback((newMessages: AllMessage[]) => {
    if (newMessages.length === 0) return;

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, ...newMessages],
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState({
      messages: [],
      loading: false,
      error: null,
      sessionId: null,
    });
  }, []);

  return {
    ...state,
    loadHistory,
    appendMessages,
    clearHistory,
  };
}

const POLLING_INTERVAL_MS = 3000;

export function useAutoHistoryLoader(
  encodedProjectName?: string,
  sessionId?: string,
  enablePolling = false,
): HistoryLoaderResult {
  const historyLoader = useHistoryLoader();
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    if (encodedProjectName && sessionId) {
      historyLoader.loadHistory(encodedProjectName, sessionId);
    } else if (!sessionId) {
      historyLoader.clearHistory();
    }
  }, [encodedProjectName, sessionId, historyLoader.loadHistory, historyLoader.clearHistory]);

  useEffect(() => {
    if (!enablePolling || !encodedProjectName || !sessionId) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          getConversationUrl(encodedProjectName, sessionId),
        );

        if (response.ok) {
          const conversationHistory: ConversationHistory = await response.json();
          const messages = conversationHistory.messages || [];
          const messageCount = messages.length;

          if (messageCount > lastMessageCountRef.current) {
            const startIndex = lastMessageCountRef.current;
            const newRawMessages = messages.slice(startIndex);

            const timestampedMessages: TimestampedSDKMessage[] = [];
            for (const msg of newRawMessages) {
              if (isTimestampedSDKMessage(msg)) {
                timestampedMessages.push(msg);
              }
            }

            if (timestampedMessages.length > 0) {
              const convertedMessages = convertMessages(timestampedMessages);
              historyLoader.appendMessages(convertedMessages);
            }

            lastMessageCountRef.current = messageCount;
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [enablePolling, encodedProjectName, sessionId, historyLoader]);

  return historyLoader;
}