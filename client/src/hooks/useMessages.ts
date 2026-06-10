import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Message } from '../types';
import { getMessages } from '../api/messages';

export function useMessages(
  friendId: string | null,
  socket: Socket | null,
  currentUserId: string
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!friendId) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    getMessages(friendId, currentUserId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [friendId, currentUserId]);

  useEffect(() => {
    if (!socket || !friendId) return;

    const onNewMessage = (msg: Message) => {
      const involves =
        (msg.senderId === friendId && msg.recipientId === currentUserId) ||
        (msg.senderId === currentUserId && msg.recipientId === friendId);
      if (!involves) return;
      setMessages((prev) => [...prev, msg]);
      if (msg.senderId === friendId) {
        socket.emit('markAsRead', { messageId: msg._id, senderId: friendId });
      }
    };

    const onMessageSent = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onTyping = (data: { senderId: string; isTyping: boolean }) => {
      if (data.senderId !== friendId) return;
      if (data.isTyping) {
        setTypingUser(data.senderId);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingUser(null), 3000);
      } else {
        setTypingUser(null);
        clearTimeout(typingTimer.current);
      }
    };

    const onMessageRead = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, status: 'seen' as const } : m
        )
      );
    };

    socket.on('newDirectMessage', onNewMessage);
    socket.on('messageSent', onMessageSent);
    socket.on('userTyping', onTyping);
    socket.on('messageRead', onMessageRead);

    return () => {
      socket.off('newDirectMessage', onNewMessage);
      socket.off('messageSent', onMessageSent);
      socket.off('userTyping', onTyping);
      socket.off('messageRead', onMessageRead);
    };
  }, [socket, friendId, currentUserId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socket || !friendId || !content.trim()) return;
      socket.emit('sendDirectMessage', {
        recipientId: friendId,
        message: content.trim(),
        messageType: 'text',
      });
    },
    [socket, friendId]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !friendId) return;
      socket.emit('typing', { recipientId: friendId, isTyping });
    },
    [socket, friendId]
  );

  return { messages, isLoading, typingUser, sendMessage, sendTyping };
}
