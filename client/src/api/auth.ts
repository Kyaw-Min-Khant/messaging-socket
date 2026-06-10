import apiClient from './client';
import type { ApiResponse, AuthUser, LoginResponse } from '../types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
    email,
    password,
    fcmtoken: '',
  });
  if (!data.success || !data.data) throw new Error(data.message ?? 'Login failed');
  return data.data;
}

export async function register(username: string, email: string, password: string): Promise<void> {
  const { data } = await apiClient.post<ApiResponse>('/auth/register', {
    username,
    email,
    password,
  });
  if (!data.success) throw new Error(data.message ?? 'Registration failed');
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get('/auth/user');
  if (!data.success) throw new Error(data.message ?? 'Failed to fetch user');
  return data.data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
