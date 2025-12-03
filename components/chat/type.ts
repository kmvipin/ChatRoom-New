// === ROOM ===
export interface RoomMessage {
  id: string;
  uuid: string;
  sender: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: "CHAT" | "JOIN" | "LEAVE";
}

export interface RoomApiResponse {
  roomMessages: RoomMessage[];
  hasMore: boolean;
  nextPage: number;
}

export interface DirectMessage {
  id: string;
  uuid: string;
  sender: string;
  senderId: string;
  content: string;
  timestamp: string;
  type?: "CHAT";
}

export interface DirectApiResponse {
  messages: DirectMessage[];
  hasMore: boolean;
  nextPage: number;
}