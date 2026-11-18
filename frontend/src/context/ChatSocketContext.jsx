import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import { tokenStorage } from '../api/axiosClient';

/**
 * Một kết nối WebSocket (STOMP) dùng chung cho cả app, mở khi người dùng đăng nhập.
 *  - Admin nghe  /topic/admin/chat     (mọi hội thoại)
 *  - Khách nghe  /user/queue/chat      (hội thoại của mình) + /topic/public/support (tư vấn viên online?)
 *  - Cả hai nghe /user/queue/call      (cuộc gọi video, xem CallContext)
 * Component nào cần sự kiện thì gọi addListener(fn).
 * Đi qua proxy /ws của Vite nên máy khác trong mạng LAN cũng kết nối được.
 */
const ChatSocketContext = createContext(null);

export function ChatSocketProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [connectionId, setConnectionId] = useState(0); // tăng mỗi lần (re)connect -> các khung chat tải lại tin bị lỡ
  const [supportOnline, setSupportOnline] = useState(false);
  const clientRef = useRef(null);
  const listeners = useRef(new Set());

  useEffect(() => {
    const token = tokenStorage.get();
    if (!user || !token) return undefined;
    const isAdmin = user.role === 'ADMIN';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

    const client = new Client({
      brokerURL: `${protocol}://${window.location.host}/ws`,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
      onConnect: () => {
        const dispatch = (frame) => {
          const event = JSON.parse(frame.body);
          listeners.current.forEach((fn) => fn(event));
        };
        client.subscribe('/user/queue/call', dispatch); // cuộc gọi video: sự kiện type = CALL_*
        if (isAdmin) {
          client.subscribe('/topic/admin/chat', dispatch);
        } else {
          client.subscribe('/user/queue/chat', dispatch);
          client.subscribe('/topic/public/support', (f) => setSupportOnline(!!JSON.parse(f.body).online));
        }
        setConnected(true);
        setConnectionId((n) => n + 1);
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const addListener = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const publish = useCallback((destination, body) => {
    const client = clientRef.current;
    if (client?.connected) client.publish({ destination, body: JSON.stringify(body) });
  }, []);

  const value = useMemo(() => ({
    connected, connectionId, supportOnline, setSupportOnline, addListener, publish,
  }), [connected, connectionId, supportOnline, addListener, publish]);

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) throw new Error('useChatSocket phải dùng bên trong <ChatSocketProvider>');
  return ctx;
}
