import apiClient from './client';
import type { DbMessage, Message } from '../types';

function normalize(msg: DbMessage, currentUserId: string, friendId: string): Message {
  const senderId =
    typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
  const senderUsername =
    typeof msg.sender === 'object' ? msg.sender.username : '';
  return {
    _id: msg._id,
    conversationId: msg.conversation,
    senderId,
    senderUsername,
    recipientId: senderId === currentUserId ? friendId : currentUserId,
    message: msg.content,
    messageType: msg.messageType,
    timestamp: msg.createdAt,
    status: msg.status,
  };
}

export async function getMessages(
  friendId: string,
  currentUserId: string,
  page = 1
): Promise<Message[]> {
  const { data } = await apiClient.get(
    `/conversations/${friendId}/messages?page=${page}`
  );
  const raw: DbMessage[] = data.data ?? [];
  return raw.map((m) => normalize(m, currentUserId, friendId)).reverse();
}
