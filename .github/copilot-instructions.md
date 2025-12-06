# Copilot / AI Agent Instructions for ChatRoom-New

This repository is a Next.js (App Router) real-time chat client that connects to a separate backend REST + STOMP/SockJS server. The goal of this file is to give AI coding agents the concrete, repository-specific knowledge they need to be productive immediately.

High-level architecture
- **Frontend:** Next.js (app/ dir), React 19, client components (`"use client"`) for interactive UIs. See `app/layout.tsx` which wraps the app in `WebSocketProvider`.
- **Backend integration:** The frontend proxies or calls a separate backend at `BACKEND_URL` (env) via serverless route handlers in `app/api/**` (these routes often forward requests to `BACKEND_URL`).
- **Realtime transport:** STOMP over SockJS. Client code lives in `src/lib/websocket.ts` and a context wrapper in `src/lib/websocket-provider.tsx`.

Important files and why they matter
- `lib/websocket.ts`: single global STOMP `Client` instance, pub/sub destinations and message shape. Patterns for subscriptions and publishing are defined here (destinations: `/topic/room/{roomId}`, `/user/{userId}/queue/dm`, `/app/chat.room.{id}`, `/app/chat.private.{id}`).
- `lib/websocket-provider.tsx`: React Context + `useWebSocket()` hook used across chat components. This connects at app startup using `NEXT_PUBLIC_WEBSOCKET_URL`.
- `lib/api.ts`: axios instance with a 401 interceptor that clears `localStorage` keys and redirects to `/` on auth failures.
- `app/api/**`: server-side proxy routes that call `BACKEND_URL`. These routes handle DTO mapping and are a primary integration point.
- `components/chat/*`, `components/ChatWindow.tsx`, `components/chat/PrivateChatWindow.tsx`, `components/chat/RoomChatWindow.tsx`: core chat UI and usage examples of `useWebSocket` and REST paginated fetch patterns.

Key runtime/env variables
- `BACKEND_URL` (server API) — default `http://localhost:8080` in code.
- `NEXT_PUBLIC_WEBSOCKET_URL` — STOMP/SockJS endpoint; default `http://localhost:8080/ws` in `websocket-provider.tsx`.
- localStorage keys used by the app: `authToken`, `user`, `userEmail`, `userName`.

Authentication and tokens
- The STOMP client attaches the JWT as a query param: `?jwt_token=Bearer ${token}` (see `lib/websocket.ts`). The backend must accept a SockJS/STOMP connection with the JWT in that query param.
- Many client fetches and server route handlers forward an `Authorization` header: client code attaches `Authorization: Bearer <authToken>` to requests.

Conventions & patterns to follow
- Single global STOMP client: `lib/websocket.ts` exposes `connectWebSocket`, `disconnectWebSocket`, `subscribeToRoom`, `subscribeToPrivateChat`, `sendRoomMessage`, `sendPrivateMessage`. Use the `useWebSocket()` context wrapper to access these in components.
- Message shape: see `Message` interface in `lib/websocket.ts`. Map backend DTOs to this shape in `app/api/*` routes (examples in `app/api/message/direct/[id]/route.ts`).
- Pagination: components use page/size query parameters and expect responses with `{ messages|roomMessages, hasMore, nextPage, total }` — follow the same page-size pattern when adding endpoints.
- Error handling: server routes use axios and return structured JSON. The client `lib/api.ts` interceptor handles 401 by clearing auth and redirecting.

Developer workflows (how to run & debug locally)
- Run dev server: `pnpm dev` or `npm run dev` from the repository root (package.json uses standard Next scripts: `dev`, `build`, `start`).
- Required env vars for local testing: set `BACKEND_URL` and `NEXT_PUBLIC_WEBSOCKET_URL` to point at your backend. Example:

```bash
export BACKEND_URL=http://localhost:8080
export NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:8080/ws
pnpm dev
```

- If you get 401s, check `localStorage.getItem('authToken')` and confirm backend accepts the JWT format being passed to STOMP.

Patch & change guidance for an AI agent
- When adding new backend calls prefer placing integration logic into `app/api/*` (server) routes so client components remain simple and to centralize DTO mappings.
- To add new STOMP topics or message flows, update `lib/websocket.ts` with a destination naming convention and add a typed wrapper. Then consume via `useWebSocket()` in client components.
- Preserve the `localStorage` keys used by the app when modifying auth flows (`authToken`, `user`, `userEmail`, `userName`).

Examples (copyable patterns)
- Subscribe to a room in a component:
  - `const { subscribeRoom } = useWebSocket();`
  - `useEffect(() => { const unsub = subscribeRoom(roomId, (msg) => setList(prev => [...prev, msg])); return () => unsub(); }, [roomId]);`
- Send a room message:
  - `sendRoom(roomId, { sender: userName, content: 'hi', type: 'CHAT' })`

Notes and gotchas discovered in the codebase
- Some API route filenames may not exactly match their behavior (e.g. `signup/route.ts` contains login logic). Validate the route behavior rather than relying solely on the filename.
- STOMP client uses a global `stompClient` and inspects private fields like `_subscriptions` in runtime checks — be careful when refactoring to newer STOMP APIs.
- The code mixes `axios` (server routes and `lib/api.ts`) and `fetch` (client components). Keep server-side backend calls in `app/api` routes (axios) and client-side in components (fetch) unless centralizing logic.

When in doubt, examine these files first
- `src/lib/websocket.ts`
- `src/lib/websocket-provider.tsx`
- `app/api/*` (proxied backend calls)
- `components/chat/*` and `components/ChatWindow.tsx`
- `lib/api.ts` and `lib/utils.ts`

If any section is unclear or you'd like me to expand on an area (e.g., detailed examples for adding new STOMP topics, or a checklist for adding a new server-proxied API route), tell me which area and I'll iterate.
