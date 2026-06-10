import { format } from 'date-fns';
import type { Message } from '../types';

interface Props {
  message: Message;
  isOwn: boolean;
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'seen') {
    return (
      <svg className="w-3.5 h-3.5 text-blue-300" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 6 5 10 12 1" />
        <polyline points="8 6 12 10 19 1" />
      </svg>
    );
  }
  if (status === 'delivered') {
    return (
      <svg className="w-3.5 h-3.5 text-indigo-200 opacity-70" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 6 5 10 12 1" />
        <polyline points="8 6 12 10 19 1" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 text-indigo-200 opacity-50" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 6 5 10 11 1" />
    </svg>
  );
}

export function MessageBubble({ message, isOwn }: Props) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`max-w-[72%] px-3.5 py-2 rounded-2xl ${
          isOwn
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-gray-700 text-gray-100 rounded-bl-sm'
        }`}
      >
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {message.message}
        </p>
        <div
          className={`flex items-center gap-1 mt-0.5 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}
        >
          <span className="text-[10px] opacity-60">
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
          {isOwn && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
