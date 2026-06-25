import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { updateAvatar, AVATAR_OPTIONS } from "../api/users";

export function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  if (!user) return null;

  const handleSave = async () => {
    if (!selected || selected === user.avatar) {
      setShowPicker(false);
      return;
    }
    setSaving(true);
    try {
      await updateAvatar(selected);
      setUser({ ...user, avatar: selected });
      setShowPicker(false);
    } catch {
      // stay open on error
    } finally {
      setSaving(false);
    }
  };

  const openPicker = () => {
    setSelected(user.avatar ?? null);
    setShowPicker(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to Chat
        </button>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-indigo-600 to-violet-600" />

          <div className="px-6 pb-6">
            <div className="-mt-12 mb-4">
              {/* Avatar with edit button */}
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full bg-indigo-500 border-4 border-gray-900 flex items-center justify-center text-white font-bold text-3xl overflow-hidden">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.username[0].toUpperCase()
                  )}
                </div>
                <button
                  onClick={openPicker}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-600 hover:bg-indigo-500 border-2 border-gray-900 rounded-full flex items-center justify-center transition-colors"
                  title="Change avatar"
                >
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-white">{user.username}</h1>
                <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
              </div>
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                  user.isOnline
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? "bg-green-400" : "bg-gray-500"}`}
                />
                {user.isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-white">{user.email}</p>
                </div>
              </div>

              {user.createdAt && (
                <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Member since</p>
                    <p className="text-sm text-white">
                      {format(new Date(user.createdAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zM12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last seen</p>
                  <p className="text-sm text-white">
                    {user.isOnline
                      ? "Currently online"
                      : formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white font-semibold text-base mb-1">Choose your avatar</h2>
            <p className="text-gray-400 text-xs mb-5">Select one of the available profile pictures</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {AVATAR_OPTIONS.map((url) => {
                const isActive = selected === url;
                return (
                  <button
                    key={url}
                    onClick={() => setSelected(url)}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                      isActive
                        ? "border-indigo-500 ring-2 ring-indigo-500/40 scale-105"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <img
                      src={url}
                      alt="avatar option"
                      className="w-full h-full object-cover"
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                        <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPicker(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !selected || selected === user.avatar}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
