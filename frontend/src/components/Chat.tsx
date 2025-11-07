"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import {
  WebSocketService,
  ChatMessage,
} from "@/lib/services/web-socket-service";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface ChatProps {
  webSocketService: WebSocketService | null;
  currentUserId: string;
  currentUserName: string;
}

export function Chat({
  webSocketService,
  currentUserId,
  currentUserName,
}: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check if service has chat methods available
  const hasChatMethods = useMemo(() => {
    if (!webSocketService) return false;
    return (
      typeof (webSocketService as any).onChatChange === "function" &&
      typeof (webSocketService as any).sendChatMessage === "function"
    );
  }, [webSocketService]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to chat changes from Yjs
  useEffect(() => {
    if (!hasChatMethods || !isOpen) return;

    const unsubscribe = (webSocketService as any).onChatChange(
      (chatMessages: ChatMessage[]) => {
        setMessages(chatMessages);
      }
    );

    return unsubscribe;
  }, [webSocketService, hasChatMethods, isOpen]);

  const sendMessage = () => {
    if (!input.trim() || !hasChatMethods || !currentUserId || !currentUserName)
      return;

    (webSocketService as any).sendChatMessage(
      currentUserId,
      currentUserName,
      input.trim()
    );
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      {/* Chat Container */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-40"
          style={{ marginBottom: "76px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">Team Chat</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center px-4">
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}

            {messages.map((message) => {
              const isOwnMessage = message.userId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${
                    isOwnMessage ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div className="flex-shrink-0">
                    <UserAvatar username={message.userName} size="sm" />
                  </div>
                  <div
                    className={`flex flex-col ${
                      isOwnMessage ? "items-end" : "items-start"
                    } flex-1`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {isOwnMessage ? "You" : message.userName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="self-end px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-20 h-14 w-14 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center z-40"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
