import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import chatApi from '../../api/chatApi';
import { useChatSocket } from '../../context/ChatSocketContext';
import { useCall } from '../../context/CallContext';
import { useToast } from '../../context/ToastContext';
import ChatThread from '../../components/chat/ChatThread';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';
import Icon from '../../components/common/Icon';

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'WAITING', label: 'Đang chờ' },
  { value: 'ACTIVE', label: 'Đang tư vấn' },
  { value: 'CLOSED', label: 'Đã đóng' },
];
const STATUS = {
  AI: { label: 'Trợ lý AI', cls: '' },
  WAITING: { label: 'Đang chờ', cls: 'chip-red' },
  ACTIVE: { label: 'Đang tư vấn', cls: 'chip-blue' },
  CLOSED: { label: 'Đã đóng', cls: 'chip-green' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function Inbox() {
  const toast = useToast();
  const { addListener, connected, connectionId } = useChatSocket();
  const { startCall, inCall } = useCall();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = Number(searchParams.get('c')) || null;
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => {
    chatApi.adminList({ status: status || undefined, q: q.trim() || undefined })
      .then((res) => { setList(res); setError(null); })
      .catch((err) => setError(err.message));
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load, connectionId]);

  // Cập nhật danh sách theo thời gian thực
  useEffect(() => addListener((ev) => {
    if ((ev.type === 'MESSAGE' || ev.type === 'CONVERSATION') && ev.conversation) {
      setList((prev) => {
        if (!prev) return prev;
        const c = ev.conversation;
        const others = prev.filter((x) => x.id !== c.id);
        if (status && c.status !== status) return others;
        return [c, ...others].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    } else if (ev.type === 'PRESENCE') {
      setList((prev) => prev?.map((c) => (c.customer.id === ev.userId ? { ...c, customer: { ...c.customer, online: ev.online } } : c)));
    }
  }), [addListener, status]);

  const selected = useMemo(() => list?.find((c) => c.id === selectedId) || null, [list, selectedId]);

  const select = (id) => {
    setSearchParams({ c: String(id) });
    // Đánh dấu đã đọc ngay trên giao diện (server xác nhận qua sự kiện CONVERSATION)
    setList((prev) => prev?.map((c) => (c.id === id ? { ...c, unreadAdmin: 0 } : c)));
  };

  const doClose = async () => {
    setClosing(true);
    try {
      const res = await chatApi.adminClose(selected.id);
      setList((prev) => prev?.map((c) => (c.id === res.id ? res : c)));
      toast.success('Đã kết thúc cuộc trò chuyện');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setClosing(false);
      setConfirmClose(false);
    }
  };

  return (
    // Điện thoại / máy tính bảng: chỉ hiện danh sách HOẶC hội thoại (giống Messenger), có nút quay lại
    <div className={`inbox ${selected ? 'has-selection' : ''}`}>
      <aside className="inbox-list" aria-label="Danh sách hội thoại">
        <div className="inbox-list-head">
          <h1>Hộp thư tư vấn</h1>
          <span className={`conn-dot ${connected ? 'on' : ''}`} title={connected ? 'Đã kết nối realtime' : 'Đang kết nối...'} />
        </div>
        <label htmlFor="inbox-search" className="sr-only">Tìm khách hàng</label>
        <input id="inbox-search" type="search" className="input input-sm" placeholder="Tìm theo tên, email khách"
               value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="tabs tabs-sm" role="tablist" aria-label="Lọc trạng thái">
          {TABS.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={status === t.value}
                    className={status === t.value ? 'active' : ''} onClick={() => setStatus(t.value)}>{t.label}</button>
          ))}
        </div>

        {!list && !error && <Spinner />}
        {error && <ErrorState message={error} onRetry={load} />}
        {list && list.length === 0 && <EmptyState title="Chưa có hội thoại nào" />}
        <ul className="conv-list">
          {list?.map((c) => (
            <li key={c.id}>
              <button type="button" className={`conv-item ${c.id === selectedId ? 'active' : ''} ${c.unreadAdmin ? 'unread' : ''}`}
                      onClick={() => select(c.id)}>
                <span className="conv-avatar">
                  {c.customer.fullName.charAt(0)}
                  <span className={`presence ${c.customer.online ? 'on' : ''}`} aria-label={c.customer.online ? 'Đang online' : 'Offline'} />
                </span>
                <span className="conv-main">
                  <span className="conv-top">
                    <b>{c.customer.fullName}</b>
                    <time>{timeAgo(c.lastMessageAt)}</time>
                  </span>
                  <span className="conv-bottom">
                    <span className="conv-preview">
                      {c.lastSenderType === 'ADMIN' && 'Bạn: '}{c.lastMessagePreview}
                    </span>
                    {c.unreadAdmin > 0 && <span className="menu-badge">{c.unreadAdmin}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="inbox-thread" aria-label="Nội dung hội thoại">
        {!selected ? (
          <div className="inbox-empty">
            <Icon name="headset" size={48} />
            <p>Chọn một hội thoại bên trái để bắt đầu tư vấn.</p>
          </div>
        ) : (
          <>
            <header className="inbox-thread-head">
              <button type="button" className="inbox-back" onClick={() => setSearchParams({})} aria-label="Quay lại danh sách hội thoại">
                <Icon name="arrowLeft" size={20} />
              </button>
              <div className="inbox-thread-info">
                <b>{selected.customer.fullName}</b>
                <span className={`chip ${STATUS[selected.status]?.cls}`}>{STATUS[selected.status]?.label}</span>
                <small>
                  {selected.customer.online ? <span className="text-success">● Đang online</span> : 'Offline'}
                  {' · '}<a href={`mailto:${selected.customer.email}`}>{selected.customer.email}</a>
                  {selected.customer.phone && <> · <a href={`tel:${selected.customer.phone}`}>{selected.customer.phone}</a></>}
                  {selected.admin && <> · Phụ trách: {selected.admin.fullName}</>}
                </small>
              </div>
              <button type="button" className="btn btn-primary btn-sm inbox-call" aria-label={`Gọi video cho ${selected.customer.fullName}`}
                      disabled={!selected.customer.online || inCall}
                      title={selected.customer.online ? `Gọi video cho ${selected.customer.fullName}` : 'Khách đang offline, chưa gọi được'}
                      onClick={() => startCall({ conversationId: selected.id, peerName: selected.customer.fullName })}>
                <Icon name="video" size={16} /><span className="hide-sm">&nbsp;Gọi video</span>
              </button>
              {selected.status !== 'CLOSED' && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmClose(true)}>
                  Kết thúc<span className="hide-sm">&nbsp;tư vấn</span>
                </button>
              )}
            </header>
            {selected.aiSummary && (
              <div className="ai-summary"><b>Tóm tắt nhu cầu (AI):</b> {selected.aiSummary}</div>
            )}
            <ChatThread key={selected.id} conversationId={selected.id} side="ADMIN" />
          </>
        )}
      </section>

      <ConfirmDialog open={confirmClose} title="Kết thúc cuộc trò chuyện?"
                     message="Khách sẽ thấy thông báo cuộc trò chuyện đã kết thúc. Nếu khách nhắn tiếp, hội thoại sẽ tự mở lại."
                     confirmLabel="Kết thúc" busy={closing} onConfirm={doClose} onCancel={() => setConfirmClose(false)} />
    </div>
  );
}
