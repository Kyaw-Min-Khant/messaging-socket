import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
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
              <div className="w-24 h-24 rounded-full bg-indigo-500 border-4 border-gray-900 flex items-center justify-center text-white font-bold text-3xl overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user.username[0].toUpperCase()
                )}
              </div>
            </div>

            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-white">{user.username}</h1>
                <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
              </div>
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                  user.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}
                />
                {user.isOnline ? 'Online' : 'Offline'}
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
                    <p className="text-sm text-white">{format(new Date(user.createdAt), 'MMMM d, yyyy')}</p>
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
                      ? 'Currently online'
                      : formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
