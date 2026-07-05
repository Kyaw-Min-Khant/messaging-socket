import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { Friend, FriendRequest } from "../types";
import { getFriends, getFriendRequests, getAvailableUsers } from "../api/users";
import { logout } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { FriendRequests } from "./FriendRequests";
import { AddUsers } from "./AddUsers";

interface Props {
  selectedFriend: Friend | null;
  onSelectFriend: (friend: Friend) => void;
}

type Tab = "chats" | "requests" | "add";

export function Sidebar({ selectedFriend, onSelectFriend }: Props) {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();
  const { onlineUsers } = useSocket();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Friend[]>([]);
  const [tab, setTab] = useState<Tab>("chats");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      const [f, r, u] = await Promise.all([
        getFriends(),
        getFriendRequests(),
        getAvailableUsers(),
      ]);
      setFriends(f);
      setRequests(r);
      setAvailableUsers(u);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
    }
  };

  const filtered = friends.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* App header */}
      <div className="flex items-center justify-between px-4 py-3.5 shrink-0 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">Messages</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/expenses")}
            title="Expenses"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Current user */}
      <button
        onClick={() => navigate("/profile")}
        className="flex items-center gap-3 px-4 py-3 shrink-0 hover:bg-gray-800 transition-colors text-left w-full"
      >
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              user?.username?.[0]?.toUpperCase()
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border-2 border-gray-900" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {user?.username}
          </p>
          <p className="text-xs text-green-400">Online</p>
        </div>
      </button>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-gray-800 text-white placeholder-gray-500 text-sm rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 gap-1 shrink-0 pb-2">
        {(["chats", "requests", "add"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              tab === t
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {t === "requests" && requests.length > 0 ? (
              <span className="flex items-center justify-center gap-1">
                Requests
                <span className="w-4 h-4 bg-red-500 text-[9px] rounded-full flex items-center justify-center text-white font-bold">
                  {requests.length}
                </span>
              </span>
            ) : t === "chats" ? (
              "Chats"
            ) : t === "requests" ? (
              "Requests"
            ) : (
              "Add"
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "chats" && (
          <div className="space-y-0.5 px-2 pb-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-500">
                <svg
                  className="w-10 h-10 mb-3 opacity-30"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
                <p className="text-sm">No friends yet</p>
                <button
                  onClick={() => setTab("add")}
                  className="mt-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Find people to chat with
                </button>
              </div>
            ) : (
              filtered.map((friend) => {
                const isOnline = onlineUsers.get(friend.id) ?? friend.isOnline;
                const isSelected = selectedFriend?.id === friend.id;
                return (
                  <button
                    key={friend.id}
                    onClick={() => onSelectFriend(friend)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                      isSelected ? "bg-indigo-600" : "hover:bg-gray-800"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt={friend.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          friend.username[0].toUpperCase()
                        )}
                      </div>
                      {isOnline && (
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 bg-green-400 ${
                            isSelected ? "border-indigo-600" : "border-gray-900"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isSelected ? "text-white" : "text-gray-200"
                        }`}
                      >
                        {friend.username}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          isSelected ? "text-indigo-200" : "text-gray-500"
                        }`}
                      >
                        {isOnline
                          ? "Online"
                          : `${formatDistanceToNow(new Date(friend.lastSeen), { addSuffix: true })}`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {tab === "requests" && (
          <FriendRequests requests={requests} onAccepted={loadData} />
        )}

        {tab === "add" && (
          <AddUsers users={availableUsers} onAdded={loadData} />
        )}
      </div>
    </div>
  );
}
