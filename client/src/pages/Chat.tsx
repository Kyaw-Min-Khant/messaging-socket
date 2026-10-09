import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { ChatWindow } from "../components/ChatWindow";
import { useFriends } from "../hooks/useFriends";

export function Chat() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const friendsData = useFriends();
  const selectedFriend = friendsData.friends.find((f) => f.id === friendId) ?? null;

  // Phones show one pane at a time: the list, or the open conversation.
  const showConversation = !!friendId;

  return (
    <div className="flex h-full bg-gray-950">
      <div className={`${showConversation ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 shrink-0 h-full`}>
        <Sidebar
          {...friendsData}
          selectedFriend={selectedFriend}
          onSelectFriend={(f) => navigate(`/chats/${f.id}`)}
        />
      </div>

      <div className={`${showConversation ? "flex" : "hidden md:flex"} flex-1 min-w-0 h-full`}>
        {selectedFriend ? (
          <ChatWindow key={selectedFriend.id} friend={selectedFriend} onBack={() => navigate("/chats")} />
        ) : friendId && friendsData.isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 select-none">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600/30 to-violet-700/30 flex items-center justify-center mb-5 text-5xl">
              💬
            </div>
            <h2 className="text-lg font-semibold text-gray-200 mb-1">
              {friendId ? "Conversation not found" : "Your messages"}
            </h2>
            <p className="text-sm text-gray-500 max-w-xs">
              {friendId
                ? "This person isn't in your friends list."
                : "Pick a friend from the list to start chatting."}
            </p>
            {friendId && (
              <button
                onClick={() => navigate("/chats")}
                className="mt-4 text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                Back to chats
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
