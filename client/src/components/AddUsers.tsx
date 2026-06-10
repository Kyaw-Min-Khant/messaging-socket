import { useState } from 'react';
import type { Friend } from '../types';
import { addFriend } from '../api/users';
import toast from 'react-hot-toast';

interface Props {
  users: Friend[];
  onAdded: () => void;
}

export function AddUsers({ users, onAdded }: Props) {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const handleAdd = async (userId: string) => {
    setSending(userId);
    try {
      await addFriend(userId);
      setSent((prev) => new Set(prev).add(userId));
      toast.success('Friend request sent!');
      onAdded();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to send request';
      toast.error(msg);
    } finally {
      setSending(null);
    }
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <p className="text-sm">No users available</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {users.map((u) => (
        <div
          key={u.id}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
            {u.avatar ? (
              <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
            ) : (
              u.username[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{u.username}</p>
            <p className="text-xs text-gray-400">
              {u.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
          <button
            onClick={() => handleAdd(u.id)}
            disabled={sending === u.id || sent.has(u.id)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
          >
            {sent.has(u.id) ? (
              <span className="text-green-400">Sent</span>
            ) : sending === u.id ? (
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              'Add'
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
