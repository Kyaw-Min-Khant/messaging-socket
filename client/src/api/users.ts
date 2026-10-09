import apiClient from "./client";
import type { Friend, FriendRequest } from "../types";

function normalizeFriend(u: Record<string, unknown>): Friend {
  return {
    id: (u._id ?? u.id) as string,
    username: u.username as string,
    avatar: u.avatar as string | undefined,
    isOnline: (u.isOnline as boolean) ?? false,
    // No fallback to "now": that would make every friend look online for the grace window.
    lastSeen: u.lastSeen as string | undefined,
  };
}

export async function getFriends(): Promise<Friend[]> {
  const { data } = await apiClient.get("/users/friends");
  return (data.data ?? []).map(normalizeFriend);
}

export async function getAvailableUsers(): Promise<Friend[]> {
  const { data } = await apiClient.get("/users");
  return (data.data ?? []).map(normalizeFriend);
}

export async function addFriend(friendId: string): Promise<void> {
  await apiClient.post("/users/addfriend", { friend_id: friendId });
}

function normalizeFriendRequest(r: Record<string, unknown>): FriendRequest {
  const requester = (r.requester ?? {}) as Record<string, unknown>;
  return {
    _id: (r._id ?? r.id) as string,
    requester: {
      _id: (requester._id ?? requester.id) as string,
      username: requester.username as string,
      avatar: requester.avatar as string | undefined,
    },
    status: (r.status as FriendRequest["status"]) ?? "pending",
    createdAt: (r.createdAt ?? r.created_at ?? r.updatedAt ?? r.updated_at) as string,
  };
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  const { data } = await apiClient.get("/users/friendrequest");
  return (data.data ?? []).map(normalizeFriendRequest);
}

export async function confirmFriendRequest(requestId: string): Promise<void> {
  await apiClient.put("/users/confirm_request", { request_id: requestId });
}

export async function updateAvatar(avatar: string): Promise<void> {
  await apiClient.put("/users/avatar", { avatar });
}

export const AVATAR_OPTIONS = [
  "https://img.freepik.com/premium-vector/female-face-icon-flat-vector-design-woman-girl-profile-design-template-identity-concept_581136-214.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRH87TKQrWcl19xly2VNs0CjBzy8eaKNM-ZpA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyoGULN1LceEjH8Ek-RLyigv6HJm-UFYfZmg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnYh79e7N4rXkThhwCipY3mIfdJ6vavgRorgpEWZgVDw&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8wR88BF7EWiIPx0AczdbsXk2sRKCUIxlItyuvBc_DNg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1abgZFHSN1dft87SClXpEhanK9ijEKqoZAw&s",
];
