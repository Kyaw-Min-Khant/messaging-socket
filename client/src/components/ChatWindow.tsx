import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { differenceInMinutes, format, isSameDay, isSameYear, isToday, isYesterday } from "date-fns";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import type { Friend, Message } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { lastSeenLabel } from "../lib/presence";
import { useMessages } from "../hooks/useMessages";
import { MessageBubble } from "./MessageBubble";
import { Avatar } from "./Avatar";

interface Props {
  friend: Friend;
  /** Return to the conversation list (shown on phones). */
  onBack: () => void;
}

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, isSameYear(date, new Date()) ? "EEEE, MMM d" : "MMM d, yyyy");
}

/** Messages from the same sender within a few minutes form one visual group. */
function sameGroup(a: Message | undefined, b: Message | undefined) {
  if (!a || !b) return false;
  const ta = new Date(a.timestamp);
  const tb = new Date(b.timestamp);
  return a.senderId === b.senderId && isSameDay(ta, tb) && Math.abs(differenceInMinutes(tb, ta)) < 5;
}

const hasFinePointer = () => window.matchMedia?.("(pointer: fine)").matches ?? true;

export function ChatWindow({ friend, onBack }: Props) {
  const { user } = useAuth();
  const { socket, isOnline: isFriendOnline, lastSeenOf } = useSocket();
  const { messages, isLoading, typingUser, sendMessage, sendTyping } = useMessages(friend.id, socket, user!.id);

  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const isOnline = isFriendOnline(friend);

  // Jump to the bottom on first load, then scroll smoothly for new messages.
  useEffect(() => {
    if (isLoading || messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: didInitialScroll.current ? "smooth" : "auto" });
    didInitialScroll.current = true;
  }, [messages, typingUser, isLoading]);

  // Focusing on phones would pop the keyboard over the conversation.
  useEffect(() => {
    if (hasFinePointer()) textareaRef.current?.focus();
  }, [friend.id]);

  // Grow the textarea with its content, up to a cap.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

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
    // On touch keyboards Enter inserts a newline; the send button sends.
    if (e.key === "Enter" && !e.shiftKey && hasFinePointer()) {
      e.preventDefault();
      handleSend();
    }
  };

  const status = typingUser
    ? "typing…"
    : isOnline
      ? "Online"
      : lastSeenLabel("Last seen", lastSeenOf(friend));

  return (
    <div className="flex flex-col w-full h-full bg-gray-950">
      {/* Header */}
      <div className="shrink-0 pt-[env(safe-area-inset-top)] bg-gray-950/90 backdrop-blur border-b border-gray-800/80">
        <div className="h-16 px-2 md:px-4 flex items-center gap-2">
          <button
            onClick={onBack}
            aria-label="Back to chats"
            className="md:hidden p-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <Avatar name={friend.username} src={friend.avatar} size="sm" online={isOnline} />
          <div className="min-w-0 ml-1">
            <p className="text-[15px] font-semibold text-white truncate">{friend.username}</p>
            <p className={`text-xs truncate ${typingUser ? "text-indigo-400" : isOnline ? "text-emerald-400" : "text-gray-500"}`}>
              {status}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Avatar name={friend.username} src={friend.avatar} size="lg" />
            <p className="text-base font-semibold text-gray-200 mt-3">{friend.username}</p>
            <p className="text-sm text-gray-500 mt-1">No messages yet. Say hi! 👋</p>
            <button
              onClick={() => sendMessage("👋")}
              className="mt-4 px-5 py-2 rounded-full bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 transition-colors"
            >
              Send a wave 👋
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const date = new Date(msg.timestamp);
              const newDay = !prev || !isSameDay(new Date(prev.timestamp), date);
              return (
                <Fragment key={msg._id}>
                  {newDay && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 rounded-full bg-gray-800/80 text-[11px] font-medium text-gray-400">
                        {dayLabel(date)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={msg}
                    isOwn={msg.senderId === user!.id}
                    groupStart={!sameGroup(prev, msg)}
                    groupEnd={!sameGroup(msg, next)}
                  />
                </Fragment>
              );
            })}
            {typingUser && (
              <div className="flex justify-start mb-2">
                <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-2 md:px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gray-950 border-t border-gray-800/80">
        <div className="relative max-w-3xl mx-auto flex items-end gap-2">
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full mb-2 left-0 z-50">
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={handleEmojiClick}
                lazyLoadEmojis
                width="min(350px, calc(100vw - 1rem))"
                height={380}
              />
            </div>
          )}

          <div className="flex-1 flex items-end bg-gray-800/80 rounded-3xl pl-1 pr-3 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-shadow">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={`w-10 h-11 flex items-center justify-center shrink-0 transition-colors ${
                showEmojiPicker ? "text-amber-400" : "text-gray-400 hover:text-amber-400"
              }`}
              title="Emoji"
              aria-label="Emoji"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              rows={1}
              enterKeyHint="send"
              className="flex-1 bg-transparent text-white placeholder-gray-500 py-3 text-base md:text-[15px] leading-5 resize-none focus:outline-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send"
            className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-full flex items-center justify-center transition shrink-0"
          >
            <svg className="w-5 h-5 translate-x-px" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
