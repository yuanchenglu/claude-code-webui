import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AllMessage } from "../../types";
import {
  isChatMessage,
  isSystemMessage,
  isToolMessage,
  isToolResultMessage,
  isPlanMessage,
  isThinkingMessage,
  isTodoMessage,
} from "../../types";
import {
  ChatMessageComponent,
  SystemMessageComponent,
  ToolMessageComponent,
  ToolResultMessageComponent,
  PlanMessageComponent,
  ThinkingMessageComponent,
  TodoMessageComponent,
  LoadingComponent,
} from "../MessageComponents";

interface ChatMessagesProps {
  messages: AllMessage[];
  isLoading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function ChatMessages({ messages, isLoading, hasMore, onLoadMore, isLoadingMore }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && messagesEndRef.current.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const renderMessage = (message: AllMessage, index: number) => {
    const key = `${message.timestamp}-${index}`;

    if (isSystemMessage(message)) {
      return <SystemMessageComponent key={key} message={message} />;
    } else if (isToolMessage(message)) {
      return <ToolMessageComponent key={key} message={message} />;
    } else if (isToolResultMessage(message)) {
      return <ToolResultMessageComponent key={key} message={message} />;
    } else if (isPlanMessage(message)) {
      return <PlanMessageComponent key={key} message={message} />;
    } else if (isThinkingMessage(message)) {
      return <ThinkingMessageComponent key={key} message={message} />;
    } else if (isTodoMessage(message)) {
      return <TodoMessageComponent key={key} message={message} />;
    } else if (isChatMessage(message)) {
      return <ChatMessageComponent key={key} message={message} />;
    }
    return null;
  };

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 p-3 sm:p-6 mb-3 sm:mb-6 rounded-2xl shadow-sm backdrop-blur-sm flex flex-col"
    >
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex-1" aria-hidden="true"></div>
          {hasMore && onLoadMore && (
            <LoadMoreButton onClick={onLoadMore} isLoading={isLoadingMore} />
          )}
          {messages.map(renderMessage)}
          {isLoading && <LoadingComponent />}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

function LoadMoreButton({ onClick, isLoading }: { onClick: () => void; isLoading?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="mb-4 py-2 px-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
    >
      {isLoading ? t("chat.loadingMore") : t("chat.loadMore")}
    </button>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400">
      <div>
        <div className="text-6xl mb-6 opacity-60">
          <span role="img" aria-label="chat icon">
            💬
          </span>
        </div>
        <p className="text-lg font-medium">{t("chat.startConversation")}</p>
        <p className="text-sm mt-2 opacity-80">
          {t("chat.typeMessage")}
        </p>
      </div>
    </div>
  );
}
