// MessageBubble.tsx
import { MessageBubbleProps } from "./type";

export default function MessageBubble({ msg, userId, selectedId, onSelect }: MessageBubbleProps) {
  const isOwn = msg.senderId === userId;
  const isSelected = selectedId === msg.uuid;

  const handleClick = () => {
    onSelect(isSelected ? "" : msg.uuid);
  };

  return (
    <div className={`flex gap-2 sm:gap-3 ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
          {msg.sender[0].toUpperCase()}
        </div>
      )}
      <div className={`flex flex-col gap-1 max-w-xs sm:max-w-sm ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && <span className="text-xs font-semibold text-muted-foreground px-2">{msg.sender}</span>}
        <div
          onClick={handleClick}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm cursor-default transition ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-none hover:bg-primary/90"
              : "bg-card border border-border text-foreground rounded-bl-none hover:bg-accent/50"
          }`}
        >
          <p className="break-words whitespace-pre-wrap cursor-text">{msg.content}</p>
        </div>
        {isSelected && (
          <span className={`block text-xs text-muted-foreground mt-1 ${isOwn ? "text-right" : "text-left"}`}>
            {new Date(msg.timestamp).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}