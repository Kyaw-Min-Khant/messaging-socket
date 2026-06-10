import { useState } from 'react';
import type { Friend } from '../types';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';

export function Chat() {
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  return (
    <div className="flex h-full bg-gray-950">
      <div className="w-72 shrink-0 h-full">
        <Sidebar
          selectedFriend={selectedFriend}
          onSelectFriend={setSelectedFriend}
        />
      </div>

      <div className="flex-1 h-full overflow-hidden">
        {selectedFriend ? (
          <ChatWindow key={selectedFriend.id} friend={selectedFriend} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 select-none">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 opacity-30"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-300 mb-1">
              Your messages
            </h2>
            <p className="text-sm text-gray-500">
              Select a friend to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
