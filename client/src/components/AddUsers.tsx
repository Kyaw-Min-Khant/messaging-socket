import { useState } from "react";
import type { Friend } from "../types";
import { addFriend } from "../api/users";
import toast from "react-hot-toast";
import { Avatar } from "./Avatar";
import { useSocket } from "../contexts/SocketContext";

interface Props {
  users: Friend[];
  onAdded: () => void;
}

export function AddUsers({ users, onAdded }: Props) {
  const { isOnline } = useSocket();
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const handleAdd = async (userId: string) => {
    setSending(userId);
    try {
      await addFriend(userId);
      setSent((prev) => new Set(prev).add(userId));
      toast.success("Friend request sent!");
      onAdded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send request";
      toast.error(msg);
    } finally {
      setSending(null);
    }
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-6">
        <span className="text-4xl mb-3" aria-hidden>
          🧭
        </span>
        <p className="text-sm text-gray-400">No one new to add right now</p>
      </div>
    );
  }

  return (
    <div className="px-2 space-y-0.5">
      {users.map((u) => {
        const isSent = sent.has(u.id);
        return (
          <div key={u.id} className="flex items-center gap-3 px-2.5 py-2.5 rounded-2xl">
            <Avatar name={u.username} src={u.avatar} online={isOnline(u)} ringClass="border-gray-950 md:border-gray-900" />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-gray-100 truncate">{u.username}</p>
              <p className={`text-xs ${isOnline(u) ? "text-emerald-400" : "text-gray-500"}`}>
                {isOnline(u) ? "Online" : "Offline"}
              </p>
            </div>
            <button
              onClick={() => handleAdd(u.id)}
              disabled={sending === u.id || isSent}
              className={`h-9 min-w-[76px] px-4 text-sm font-semibold rounded-full transition-colors shrink-0 flex items-center justify-center ${
                isSent
                  ? "bg-transparent border border-gray-700 text-gray-400"
                  : "bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-50"
              }`}
            >
              {isSent ? (
                "Sent ✓"
              ) : sending === u.id ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "+ Add"
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
