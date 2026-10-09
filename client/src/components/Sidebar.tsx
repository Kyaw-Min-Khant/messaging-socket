import { useState } from "react";
import { Link } from "react-router-dom";
import { format, isThisWeek, isToday } from "date-fns";
import type { Friend, FriendRequest, Message } from "../types";
import { logout } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { lastSeenLabel } from "../lib/presence";
import { useConversationPreviews } from "../hooks/useConversationPreviews";
import { FriendRequests } from "./FriendRequests";
import { AddUsers } from "./AddUsers";
import { AppSwitcher, HomeButton } from "./AppSwitcher";
import { Avatar } from "./Avatar";

interface Props {
  friends: Friend[];
  requests: FriendRequest[];
  availableUsers: Friend[];
  isLoading: boolean;
  reload: () => void;
  selectedFriend: Friend | null;
  onSelectFriend: (friend: Friend) => void;
}

type Tab = "chats" | "requests" | "add";

function shortTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisWeek(date)) return format(date, "EEE");
  return format(date, "MMM d");
}

function previewText(msg: Message): string {
  switch (msg.messageType) {
    case "image":
      return "📷 Photo";
    case "audio":
      return "🎤 Voice message";
    case "file":
      return "📎 File";
    default:
      return msg.message;
  }
}

export function Sidebar({
  friends,
  requests,
  availableUsers,
  isLoading,
  reload,
  selectedFriend,
  onSelectFriend,
}: Props) {
  const { user, clearAuth } = useAuth();
  const { socket, isOnline, lastSeenOf } = useSocket();
  const { previewOf, totalUnread } = useConversationPreviews(socket, user?.id ?? "", selectedFriend?.id ?? null);
  const [tab, setTab] = useState<Tab>("chats");
  const [search, setSearch] = useState("");

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
    }
  };

  const matches = (name: string) => name.toLowerCase().includes(search.trim().toLowerCase());

  // Most recent conversation first; friends without messages follow, online first, then alphabetical.
  const lastAt = (f: Friend) => {
    const t = new Date(previewOf(f.id)?.lastMessage.timestamp ?? "").getTime();
    return isNaN(t) ? 0 : t;
  };
  const filtered = friends
    .filter((f) => matches(f.username))
    .sort(
      (a, b) =>
        lastAt(b) - lastAt(a) ||
        Number(isOnline(b)) - Number(isOnline(a)) ||
        a.username.localeCompare(b.username),
    );
  const activeNow = friends.filter(isOnline);

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "chats", label: "Chats", badge: totalUnread },
    { key: "requests", label: "Requests", badge: requests.length },
    { key: "add", label: "Find people" },
  ];

  return (
    <div className="flex flex-col w-full h-full bg-gray-950 md:bg-gray-900 md:border-r md:border-gray-800">
      {/* App bar */}
      <div className="shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="h-14 px-2 flex items-center gap-1">
          <HomeButton />
          <div className="flex-1 flex justify-center md:justify-start">
            <AppSwitcher />
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title + me */}
      <div className="shrink-0 px-4 pt-1 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        {user && (
          <Link to="/profile" title="Your profile" className="rounded-full hover:ring-2 hover:ring-indigo-500/60 transition">
            <Avatar name={user.username} src={user.avatar} size="sm" online ringClass="border-gray-950 md:border-gray-900" />
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="shrink-0 px-4 pb-3">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
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
            placeholder={tab === "add" ? "Search people" : "Search friends"}
            className="w-full bg-gray-800/80 text-white placeholder-gray-500 text-base md:text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-shadow"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 px-4 pb-3">
        <div className="flex p-1 bg-gray-800/80 rounded-xl">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === t.key ? "bg-gray-950 text-white shadow" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t.label}
              {!!t.badge && (
                <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-[10px] rounded-full flex items-center justify-center text-white font-bold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {tab === "chats" && (
          <>
            {activeNow.length > 0 && !search && (
              <div className="pb-3">
                <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Active now</p>
                <div className="flex gap-4 overflow-x-auto px-4">
                  {activeNow.map((f) => (
                    <button key={f.id} onClick={() => onSelectFriend(f)} className="flex flex-col items-center gap-1 w-14 shrink-0">
                      <Avatar name={f.username} src={f.avatar} size="lg" online ringClass="border-gray-950 md:border-gray-900" />
                      <span className="text-[11px] text-gray-400 w-full truncate text-center">{f.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-14">
                <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14 px-6">
                <span className="text-4xl mb-3" aria-hidden>
                  {search ? "🔍" : "👋"}
                </span>
                <p className="text-sm text-gray-400">{search ? "No friends match your search" : "No friends yet"}</p>
                {!search && (
                  <button
                    onClick={() => setTab("add")}
                    className="mt-2 text-sm font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    Find people to chat with
                  </button>
                )}
              </div>
            ) : (
              <div className="px-2 space-y-0.5">
                {filtered.map((friend) => {
                  const online = isOnline(friend);
                  const selected = selectedFriend?.id === friend.id;
                  const preview = previewOf(friend.id);
                  const unread = preview?.unread ?? 0;
                  return (
                    <button
                      key={friend.id}
                      onClick={() => onSelectFriend(friend)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-2xl text-left transition-colors ${
                        selected ? "bg-indigo-600/20 ring-1 ring-indigo-500/40" : "hover:bg-gray-800/70 active:bg-gray-800"
                      }`}
                    >
                      <Avatar
                        name={friend.username}
                        src={friend.avatar}
                        online={online}
                        ringClass="border-gray-950 md:border-gray-900"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className="flex-1 text-[15px] font-semibold text-gray-100 truncate">{friend.username}</p>
                          {preview && (
                            <span className={`text-[11px] shrink-0 ${unread ? "text-indigo-400 font-semibold" : "text-gray-500"}`}>
                              {shortTime(preview.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {preview ? (
                            <p className={`flex-1 text-xs truncate ${unread ? "text-gray-100 font-semibold" : "text-gray-500"}`}>
                              {preview.lastMessage.senderId === user?.id && "You: "}
                              {previewText(preview.lastMessage)}
                            </p>
                          ) : (
                            <p className={`flex-1 text-xs truncate ${online ? "text-emerald-400" : "text-gray-500"}`}>
                              {online ? "Online" : lastSeenLabel("Active", lastSeenOf(friend))}
                            </p>
                          )}
                          {unread > 0 && (
                            <span className="min-w-[20px] h-5 px-1.5 bg-indigo-600 text-[11px] rounded-full flex items-center justify-center text-white font-bold shrink-0">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-600 md:hidden" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "requests" && (
          <FriendRequests requests={requests.filter((r) => matches(r.requester.username))} onAccepted={reload} />
        )}

        {tab === "add" && <AddUsers users={availableUsers.filter((u) => matches(u.username))} onAdded={reload} />}
      </div>
    </div>
  );
}
