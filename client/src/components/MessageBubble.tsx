import { format } from "date-fns";
import type { Message } from "../types";

interface Props {
  message: Message;
  isOwn: boolean;
  /** First message in a run from the same sender. */
  groupStart: boolean;
  /** Last message in a run from the same sender; gets the tail and extra spacing. */
  groupEnd: boolean;
}

function StatusIcon({ status }: { status: Message["status"] }) {
  const double = status === "seen" || status === "delivered";
  const color = status === "seen" ? "text-sky-300" : status === "delivered" ? "text-indigo-200/80" : "text-indigo-200/60";
  return (
    <svg
      className={`w-3.5 h-3.5 ${color}`}
      viewBox={double ? "0 0 20 12" : "0 0 12 12"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={status}
    >
      {double ? (
        <>
          <polyline points="1 6 5 10 12 1" />
          <polyline points="8 6 12 10 19 1" />
        </>
      ) : (
        <polyline points="1 6 5 10 11 1" />
      )}
    </svg>
  );
}

// Short messages made only of emoji are shown large, without a bubble.
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️|\s)+$/u;

export function MessageBubble({ message, isOwn, groupStart, groupEnd }: Props) {
  const time = format(new Date(message.timestamp), "HH:mm");
  const text = message.message;
  const bigEmoji = text.length <= 12 && EMOJI_ONLY.test(text);

  const spacing = groupEnd ? "mb-3" : "mb-0.5";

  if (bigEmoji) {
    return (
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} ${spacing}`}>
        <span className="text-5xl leading-tight">{text}</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500 px-1">
          {time}
          {isOwn && <StatusIcon status={message.status} />}
        </span>
      </div>
    );
  }

  // Corners next to neighbouring bubbles from the same sender are tightened.
  const corners = isOwn
    ? `rounded-2xl ${groupStart ? "" : "rounded-tr-md"} ${groupEnd ? "rounded-br-sm" : "rounded-br-md"}`
    : `rounded-2xl ${groupStart ? "" : "rounded-tl-md"} ${groupEnd ? "rounded-bl-sm" : "rounded-bl-md"}`;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} ${spacing}`}>
      <div
        className={`max-w-[80%] md:max-w-[65%] pl-3.5 pr-2.5 pt-2 pb-1.5 ${corners} ${
          isOwn
            ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
            : "bg-gray-800 text-gray-100"
        }`}
      >
        <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">
          {text}
          {/* Invisible spacer so the timestamp never overlaps the last line. */}
          <span className="inline-block w-14" aria-hidden />
        </p>
        <div className="flex items-center justify-end gap-1 -mt-3.5">
          <span className={`text-[10px] ${isOwn ? "text-indigo-100/70" : "text-gray-500"}`}>{time}</span>
          {isOwn && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
