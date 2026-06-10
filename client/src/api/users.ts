import apiClient from './client';
import type { Friend, FriendRequest } from '../types';

function normalizeFriend(u: Record<string, unknown>): Friend {
  return {
    id: (u._id ?? u.id) as string,
    username: u.username as string,
    avatar: u.avatar as string | undefined,
    isOnline: (u.isOnline as boolean) ?? false,
    lastSeen: (u.lastSeen as string) ?? new Date().toISOString(),
  };
}

export async function getFriends(): Promise<Friend[]> {
  const { data } = await apiClient.get('/users/friends');
  return (data.data ?? []).map(normalizeFriend);
}

export async function getAvailableUsers(): Promise<Friend[]> {
  const { data } = await apiClient.get('/users');
  return (data.data ?? []).map(normalizeFriend);
}

export async function addFriend(friendId: string): Promise<void> {
  await apiClient.post('/users/addfriend', { friend_id: friendId });
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  const { data } = await apiClient.get('/users/friendrequest');
  return data.data ?? [];
}

export async function confirmFriendRequest(requestId: string): Promise<void> {
  await apiClient.put('/users/confirm_request', { request_id: requestId });
}
