export interface Page<T> {
    content: T[];
    last: boolean;
    totalElements: number;
    pageable: {
      pageNumber: number;
      pageSize: number;
    };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  type?: "CHAT" | "JOIN" | "LEAVE"
}