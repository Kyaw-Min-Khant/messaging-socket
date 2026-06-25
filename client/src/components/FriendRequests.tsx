import { useState } from "react";
import type { FriendRequest } from "../types";
import { confirmFriendRequest } from "../api/users";
import toast from "react-hot-toast";

interface Props {
  requests: FriendRequest[];
  onAccepted: () => void;
}

export function FriendRequests({ requests, onAccepted }: Props) {
  const [accepting, setAccepting] = useState<string | null>(null);

  const handleAccept = async (requestId: string) => {
    setAccepting(requestId);
    try {
      await confirmFriendRequest(requestId);
      toast.success("Friend request accepted!");
      onAccepted();
    } catch {
      toast.error("Failed to accept request");
    } finally {
      setAccepting(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <svg
          className="w-12 h-12 mb-3 opacity-30"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        <p className="text-sm">No pending requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {requests.map((req) => (
        <div
          key={req._id}
          className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50"
        >
          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
            {req.requester.avatar ? (
              <img
                src={req.requester.avatar}
                alt={req.requester.username}
                className="w-full h-full object-cover"
              />
            ) : (
              req.requester.username[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {req.requester.username}
            </p>
            <p className="text-xs text-gray-400">Wants to connect</p>
          </div>
          <button
            onClick={() => handleAccept(req._id)}
            disabled={accepting === req._id}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
          >
            {accepting === req._id ? (
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              "Accept"
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
