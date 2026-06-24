import apiClient from "./client";
import type { Friend, FriendRequest } from "../types";

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

export async function getFriendRequests(): Promise<FriendRequest[]> {
  const { data } = await apiClient.get("/users/friendrequest");
  return data.data ?? [];
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
