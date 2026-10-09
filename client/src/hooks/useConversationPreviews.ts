import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Message } from "../types";

export interface ConversationPreview {
  lastMessage: Message;
  unread: number;
}

type Previews = Record<string, ConversationPreview>;

const storageKey = (userId: string) => `conversationPreviews:${userId}`;

function load(userId: string): Previews {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) ?? "{}") as Previews;
  } catch {
    return {};
  }
}

/**
 * Tracks the latest message and unread count per friend from live socket
 * events, so the chat list updates without opening each conversation.
 * Kept in localStorage so it survives a refresh; messages received while
 * logged out aren't counted (the backend has no unread endpoint).
 */
export function useConversationPreviews(
  socket: Socket | null,
  currentUserId: string,
  activeFriendId: string | null,
) {
  const [previews, setPreviews] = useState<Previews>(() => load(currentUserId));

  useEffect(() => setPreviews(load(currentUserId)), [currentUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(currentUserId), JSON.stringify(previews));
    } catch {
      // Storage unavailable (private mode, quota) — previews stay in memory.
    }
  }, [previews, currentUserId]);

  // Opening a conversation reads everything in it.
  useEffect(() => {
    if (!activeFriendId) return;
    setPreviews((prev) =>
      prev[activeFriendId]?.unread
        ? { ...prev, [activeFriendId]: { ...prev[activeFriendId], unread: 0 } }
        : prev,
    );
  }, [activeFriendId]);

  useEffect(() => {
    if (!socket) return;

    const record = (friendId: string, msg: Message, countUnread: boolean) =>
      setPreviews((prev) => ({
        ...prev,
        [friendId]: {
          lastMessage: msg,
          unread: (prev[friendId]?.unread ?? 0) + (countUnread ? 1 : 0),
        },
      }));

    const onIncoming = (msg: Message) => {
      if (msg.senderId === currentUserId) return;
      record(msg.senderId, msg, msg.senderId !== activeFriendId);
    };
    const onSent = (msg: Message) => record(msg.recipientId, msg, false);

    socket.on("newDirectMessage", onIncoming);
    socket.on("messageSent", onSent);
    return () => {
      socket.off("newDirectMessage", onIncoming);
      socket.off("messageSent", onSent);
    };
  }, [socket, currentUserId, activeFriendId]);

  const totalUnread = Object.values(previews).reduce((n, p) => n + p.unread, 0);
  const previewOf = useCallback((friendId: string) => previews[friendId], [previews]);

  return { previewOf, totalUnread };
}
