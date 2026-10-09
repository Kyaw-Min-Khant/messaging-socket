import { useEffect, useState, type ReactNode } from "react";
import { differenceInCalendarDays, format, formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../api/auth";
import { AVATAR_OPTIONS, getFriends, updateAvatar } from "../api/users";
import { getMonthlyReport } from "../api/expenses";
import { Avatar } from "../components/Avatar";
import { BottomSheet } from "../components/expenses/BottomSheet";
import { currentMonth, formatMoney } from "../components/expenses/ui";

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex-1 text-center px-2">
      <p className="text-lg font-bold text-white tabular-nums truncate">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function Row({
  icon,
  tint,
  label,
  value,
  action,
}: {
  icon: string;
  tint: string;
  label: string;
  value: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className={`w-9 h-9 rounded-xl ${tint} flex items-center justify-center text-lg shrink-0`} aria-hidden>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-[15px] text-gray-100 truncate">{value}</p>
      </div>
      {action}
    </div>
  );
}

export function Profile() {
  const { user, setUser, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [spent, setSpent] = useState<string | null>(null);

  // Glance stats from both apps; each one is optional if its service is down.
  useEffect(() => {
    getFriends()
      .then((f) => setFriendCount(f.length))
      .catch(() => {});
    getMonthlyReport(currentMonth())
      .then((r) => setSpent(r.totalExpense))
      .catch(() => {});
  }, []);

  if (!user) return null;

  const goBack = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate("/"));

  const openPicker = () => {
    setSelected(user.avatar ?? null);
    setShowPicker(true);
  };

  const handleSave = async () => {
    if (!selected || selected === user.avatar) {
      setShowPicker(false);
      return;
    }
    setSaving(true);
    try {
      await updateAvatar(selected);
      setUser({ ...user, avatar: selected });
      toast.success("Avatar updated");
      setShowPicker(false);
    } catch {
      toast.error("Couldn't update avatar");
    } finally {
      setSaving(false);
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      toast.success("Email copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
    }
  };

  const memberDays = user.createdAt ? differenceInCalendarDays(new Date(), new Date(user.createdAt)) + 1 : null;

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Aurora glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-indigo-600/40 blur-3xl animate-pulse" />
          <div className="absolute -top-10 right-[-4rem] w-64 h-64 rounded-full bg-fuchsia-600/30 blur-3xl animate-pulse [animation-delay:1s]" />
          <div className="absolute top-32 left-1/3 w-56 h-56 rounded-full bg-emerald-500/20 blur-3xl animate-pulse [animation-delay:2s]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-gray-950" />
        </div>

        <div className="relative max-w-md mx-auto px-4 pt-[env(safe-area-inset-top)]">
          <div className="h-14 flex items-center justify-between">
            <button
              onClick={goBack}
              aria-label="Back"
              className="p-2 -ml-2 rounded-full text-gray-200 hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <p className="text-sm font-semibold text-gray-200">Profile</p>
            <span className="w-10" />
          </div>

          <div className="flex flex-col items-center text-center pt-4 pb-8">
            <button onClick={openPicker} className="relative group" aria-label="Change avatar">
              {/* Rotating gradient ring */}
              <span
                className="absolute -inset-1.5 rounded-full bg-[conic-gradient(from_0deg,#6366f1,#d946ef,#10b981,#6366f1)] animate-[spin_8s_linear_infinite]"
                aria-hidden
              />
              <span className="relative block rounded-full p-1 bg-gray-950">
                <Avatar name={user.username} src={user.avatar} size="xl" />
              </span>
              <span className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" />
                  <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                </svg>
              </span>
            </button>

            <h1 className="mt-5 text-2xl font-bold text-white">{user.username}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium ring-1 ring-emerald-500/30">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              Online now
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-5">
        {/* Stats */}
        <div className="flex divide-x divide-gray-800 py-4 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur">
          <Stat value={friendCount ?? "—"} label="Friends" />
          <Stat value={spent !== null ? formatMoney(spent) : "—"} label={`Spent in ${format(new Date(), "MMM")}`} />
          <Stat value={memberDays ?? "—"} label={memberDays === 1 ? "Day" : "Days"} />
        </div>

        {/* App shortcuts */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/chats"
            className="group p-4 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 hover:brightness-110 active:scale-[0.98] transition"
          >
            <span className="text-2xl" aria-hidden>
              💬
            </span>
            <p className="mt-3 text-base font-semibold text-white">Chats</p>
            <p className="text-xs text-white/70">{friendCount !== null ? `${friendCount} friends` : "Open messages"}</p>
          </Link>
          <Link
            to="/expenses"
            className="group p-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:brightness-110 active:scale-[0.98] transition"
          >
            <span className="text-2xl" aria-hidden>
              💰
            </span>
            <p className="mt-3 text-base font-semibold text-white">Expenses</p>
            <p className="text-xs text-white/70">Track this month</p>
          </Link>
        </div>

        {/* Details */}
        <section>
          <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Account</h2>
          <div className="rounded-3xl bg-gray-900 border border-gray-800 divide-y divide-gray-800/80">
            <Row
              icon="✉️"
              tint="bg-indigo-500/15"
              label="Email"
              value={user.email}
              action={
                <button
                  onClick={copyEmail}
                  aria-label="Copy email"
                  className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                  </svg>
                </button>
              }
            />
            {user.createdAt && (
              <Row
                icon="🗓️"
                tint="bg-violet-500/15"
                label="Member since"
                value={format(new Date(user.createdAt), "MMMM d, yyyy")}
              />
            )}
            <Row
              icon="🕒"
              tint="bg-sky-500/15"
              label="Last seen"
              value={user.isOnline ? "Active now" : formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
            />
            <button onClick={openPicker} className="w-full text-left hover:bg-gray-800/50 transition-colors rounded-b-3xl">
              <Row
                icon="🎨"
                tint="bg-fuchsia-500/15"
                label="Appearance"
                value="Change avatar"
                action={
                  <span className="text-gray-600 text-xl pr-1" aria-hidden>
                    ›
                  </span>
                }
              />
            </button>
          </div>
        </section>

        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-3xl bg-gray-900 border border-gray-800 text-rose-400 text-sm font-semibold hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
        >
          Log out
        </button>
      </div>

      {showPicker && (
        <BottomSheet title="Choose your avatar" subtitle="Pick a picture for your profile" onClose={() => setShowPicker(false)}>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {AVATAR_OPTIONS.map((url) => {
              const isActive = selected === url;
              return (
                <button
                  key={url}
                  onClick={() => setSelected(url)}
                  className={`relative rounded-full overflow-hidden aspect-square transition-all ${
                    isActive ? "ring-4 ring-indigo-500 scale-105" : "ring-1 ring-gray-700 hover:ring-gray-500 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt="Avatar option" className="w-full h-full object-cover" />
                  {isActive && (
                    <span className="absolute inset-0 bg-indigo-500/25 flex items-center justify-center">
                      <span className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !selected || selected === user.avatar}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save avatar"}
          </button>
        </BottomSheet>
      )}
    </div>
  );
}
