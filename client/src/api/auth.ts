import type { ApiResponse, AuthUser } from "../types";
import apiClient from "./client";

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const { data } = await apiClient.post<ApiResponse<{ user: AuthUser }>>(
    "/auth/login",
    {
      email,
      password,
      fcmtoken: "",
    },
  );
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Login failed");
  return data.data.user;
}

export async function register(
  username: string,
  email: string,
  password: string,
): Promise<void> {
  const { data } = await apiClient.post<ApiResponse>("/auth/register", {
    username,
    email,
    password,
  });
  if (!data.success) throw new Error(data.message ?? "Registration failed");
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } =
    await apiClient.get<ApiResponse<{ user: AuthUser }>>("/auth/user");
  if (!data.success || !data.data)
    throw new Error(data.message ?? "Failed to fetch user");
  return data.data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
