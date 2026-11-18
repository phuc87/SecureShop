import { useCallback, useEffect, useRef, useState } from 'react';
import chatApi from '../api/chatApi';
import { useChatSocket } from '../context/ChatSocketContext';

/**
 * Quản lý tin nhắn của 1 hội thoại: tải lịch sử, nhận tin realtime, gửi tin, "đang nhập", "đã xem".
 * side: 'CUSTOMER' | 'ADMIN' (phía người đang dùng).
 */
export default function useChatThread(conversationId, side) {
  const { addListener, publish, connectionId } = useChatSocket();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimer = useRef(null);

  const addMessage = useCallback((m) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  // Tải tin mới nhất (cả khi kết nối lại, để lấy tin bị lỡ lúc mất mạng)
  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    chatApi.messages(conversationId)
      .then((page) => {
        if (cancelled) return;
        setMessages(page.messages);
        setHasMore(page.hasMore);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [conversationId, connectionId]);

  // Sự kiện realtime
  useEffect(() => {
    if (!conversationId) return undefined;
    return addListener((ev) => {
      if (ev.conversationId !== conversationId) return;
      if (ev.type === 'MESSAGE') {
        addMessage(ev.message);
        if (ev.message.senderType !== side) setOtherTyping(false);
      } else if (ev.type === 'READ' && ev.by !== side) {
        const now = new Date().toISOString();
        setMessages((prev) => prev.map((m) => (m.senderType === side && !m.seenAt ? { ...m, seenAt: now } : m)));
      } else if (ev.type === 'TYPING' && ev.by !== side) {
        setOtherTyping(ev.typing);
        clearTimeout(typingTimer.current);
        if (ev.typing) typingTimer.current = setTimeout(() => setOtherTyping(false), 5000);
      }
    });
  }, [conversationId, side, addListener, addMessage]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const loadOlder = useCallback(async () => {
    if (!messages.length) return;
    const page = await chatApi.messages(conversationId, messages[0].id);
    setMessages((prev) => [...page.messages.filter((m) => !prev.some((x) => x.id === m.id)), ...prev]);
    setHasMore(page.hasMore);
  }, [conversationId, messages]);

  const send = useCallback(async (payload) => {
    const msg = await chatApi.send(conversationId, payload);
    addMessage(msg);
    return msg;
  }, [conversationId, addMessage]);

  const sendFile = useCallback(async (file, onProgress) => {
    const up = await chatApi.upload(file, onProgress);
    return send({ type: up.type, fileUrl: up.url, fileName: up.fileName, fileSize: up.size, mimeType: up.mimeType });
  }, [send]);

  const notifyTyping = useCallback((typing) => {
    publish('/app/chat.typing', { conversationId, typing });
  }, [publish, conversationId]);

  const markRead = useCallback(() => chatApi.markRead(conversationId).catch(() => {}), [conversationId]);

  return { messages, hasMore, loading, error, otherTyping, loadOlder, send, sendFile, notifyTyping, markRead };
}
