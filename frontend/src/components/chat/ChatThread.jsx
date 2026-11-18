import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import useChatThread from '../../hooks/useChatThread';
import MessageBubble from './MessageBubble';
import Composer from './Composer';
import { Spinner, ErrorState } from '../common/StateViews';

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Hôm nay';
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Khung hội thoại dùng chung cho khách (widget) và admin (hộp thư).
 * active = khung đang hiển thị -> tự đánh dấu "đã xem" khi có tin mới của phía bên kia.
 */
export default function ChatThread({ conversationId, side, active = true, attachedProduct, onClearProduct, emptyHint }) {
  const { messages, hasMore, loading, error, otherTyping, loadOlder, send, sendFile, notifyTyping, markRead }
    = useChatThread(conversationId, side);
  const listRef = useRef(null);
  const stickToBottom = useRef(true);
  const prevHeight = useRef(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Giữ cuộn ở cuối khi có tin mới (trừ khi người dùng đang kéo lên đọc tin cũ)
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prevHeight.current != null) {
      el.scrollTop = el.scrollHeight - prevHeight.current; // vừa tải tin cũ: giữ nguyên vị trí đang đọc
      prevHeight.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, otherTyping]);

  const onScroll = () => {
    const el = listRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Có tin chưa xem của phía bên kia -> đánh dấu đã xem
  const lastOther = [...messages].reverse().find((m) => m.senderType !== side);
  useEffect(() => {
    if (active && lastOther && !lastOther.seenAt && document.visibilityState === 'visible') markRead();
  }, [active, lastOther?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadOlder = async () => {
    prevHeight.current = listRef.current.scrollHeight;
    setLoadingOlder(true);
    try { await loadOlder(); } finally { setLoadingOlder(false); }
  };

  // Tin cuối cùng của mình -> hiện "Đã xem"
  const lastMine = [...messages].reverse().find((m) => m.senderType === side);

  return (
    <div className="chat-thread">
      <div className="chat-messages" ref={listRef} onScroll={onScroll} aria-live="polite">
        {loading && <Spinner label="Đang tải tin nhắn..." />}
        {error && <ErrorState message={error} />}
        {!loading && hasMore && (
          <button type="button" className="load-older" onClick={handleLoadOlder} disabled={loadingOlder}>
            {loadingOlder ? 'Đang tải...' : 'Xem tin nhắn cũ hơn'}
          </button>
        )}
        {!loading && messages.length === 0 && emptyHint && <div className="chat-empty">{emptyHint}</div>}
        {messages.map((m, i) => {
          const newDay = i === 0 || new Date(m.createdAt).toDateString() !== new Date(messages[i - 1].createdAt).toDateString();
          return (
            <Fragment key={m.id}>
              {newDay && <div className="chat-day"><span>{dayLabel(m.createdAt)}</span></div>}
              <MessageBubble m={m} mine={m.senderType === side} showSeen={m.id === lastMine?.id} />
            </Fragment>
          );
        })}
        {otherTyping && (
          <div className="msg-row theirs">
            <div className="typing-dots" aria-label="Đang nhập"><span /><span /><span /></div>
          </div>
        )}
      </div>
      <Composer onSend={send} onSendFile={sendFile} onTyping={notifyTyping}
                allowProductPicker={side === 'ADMIN'} attachedProduct={attachedProduct}
                onClearProduct={onClearProduct} disabled={loading || !!error} />
    </div>
  );
}
