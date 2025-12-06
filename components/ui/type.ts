export interface MessageBubbleProps {
  msg: { id: string; uuid: string; sender: string; senderId: string; content: string; timestamp: string };
  userId: string;
  selectedId?: string;
  onSelect: (id: string) => void;
}