import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import type { Friend } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useMessages } from "../hooks/useMessages";
import { MessageBubble } from "./MessageBubble";

interface Props {
  friend: Friend;
}

export function ChatWindow({ friend }: Props) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { messages, isLoading, typingUser, sendMessage, sendTyping } =
    useMessages(friend.id, socket, user!.id);

  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const isOnline = onlineUsers.get(friend.id) ?? friend.isOnline;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [friend.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? input.length;
      const end = textarea.selectionEnd ?? input.length;
      const next = input.slice(0, start) + emojiData.emoji + input.slice(end);
      setInput(next);
      setTimeout(() => {
        const pos = start + emojiData.emoji.length;
        textarea.setSelectionRange(pos, pos);
        textarea.focus();
      }, 0);
    } else {
      setInput((prev) => prev + emojiData.emoji);
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput("");
    sendTyping(false);
    clearTimeout(typingTimerRef.current);
  };

  const handleChange = (value: string) => {
    setInput(value);
    sendTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const avatarLetter = friend.username[0].toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-gray-800 border-b border-gray-700/60 shrink-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
            {friend.avatar ? (
              <img
                src={friend.avatar}
                alt={friend.username}
                className="w-full h-full object-cover"
              />
            ) : (
              avatarLetter
            )}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-800" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{friend.username}</p>
          <p className="text-xs text-gray-400">
            {isOnline
              ? "Online"
              : `Last seen ${formatDistanceToNow(new Date(friend.lastSeen), { addSuffix: true })}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-sm">No messages yet. Say hi!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                isOwn={msg.senderId === user!.id}
              />
            ))}
            {typingUser && (
              <div className="flex justify-start mb-1">
                <div className="bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-gray-800 border-t border-gray-700/60 shrink-0">
        <div className="relative flex items-end gap-2">
          {/* Emoji picker popup */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-12 left-0 z-50"
            >
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={handleEmojiClick}
                lazyLoadEmojis
              />
            </div>
          )}

          {/* Emoji toggle button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-yellow-400 transition-colors shrink-0"
            title="Emoji"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5c-.83 0-1.5-.67-1.5-1.5S9.17 13.5 10 13.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM12 9c-1.66 0-3 .9-3.58 2.22-.12.27.09.78.41.78h6.34c.32 0 .53-.51.41-.78C15 9.9 13.66 9 12 9z"/>
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${friend.username}...`}
            rows={1}
            className="flex-1 bg-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            <svg
              className="w-4 h-4 translate-x-px"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
