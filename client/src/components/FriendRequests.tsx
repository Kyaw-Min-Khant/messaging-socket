import { useState } from "react";
import type { FriendRequest } from "../types";
import { confirmFriendRequest } from "../api/users";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "./Avatar";

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
      <div className="flex flex-col items-center justify-center text-center py-14 px-6">
        <span className="text-4xl mb-3" aria-hidden>
          📭
        </span>
        <p className="text-sm text-gray-400">No pending requests</p>
      </div>
    );
  }

  return (
    <div className="px-2 space-y-0.5">
      {requests.map((req) => (
        <div key={req._id} className="flex items-center gap-3 px-2.5 py-2.5 rounded-2xl">
          <Avatar name={req.requester.username} src={req.requester.avatar} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-gray-100 truncate">{req.requester.username}</p>
            <p className="text-xs text-gray-500 truncate">
              Wants to connect · {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
            </p>
          </div>
          <button
            onClick={() => handleAccept(req._id)}
            disabled={accepting === req._id}
            className="h-9 min-w-[76px] px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-full transition-colors shrink-0 flex items-center justify-center"
          >
            {accepting === req._id ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Accept"
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
