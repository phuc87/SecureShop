import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChatSocket } from '../../context/ChatSocketContext';
import { useCall } from '../../context/CallContext';
import chatApi from '../../api/chatApi';
import ChatThread from './ChatThread';
import AiChat from './AiChat';
import Icon from '../common/Icon';

/**
 * Nút chat nổi góc phải cho khách hàng, 2 tab:
 *  - Trợ lý AI: trả lời ngay 24/7, khách chưa đăng nhập cũng hỏi được.
 *  - Tư vấn viên: người thật (cần đăng nhập), có gửi ảnh/ghi âm, gọi video.
 * Trang khác mở khung chat bằng: window.dispatchEvent(new CustomEvent('chat:open', { detail: { product } }))
 *   (có product -> mở tab tư vấn viên và đính kèm sản phẩm).
 */
export default function ChatWidget() {
  const { user, canShop } = useAuth();
  const { addListener, supportOnline, setSupportOnline, connected } = useChatSocket();
  const { startCall, inCall } = useCall();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('ai');
  const [conversation, setConversation] = useState(null);
  const [unread, setUnread] = useState(0);
  const [attachedProduct, setAttachedProduct] = useState(null);
  const [error, setError] = useState(null);

  const loadConversation = () => chatApi.myConversation()
    .then((res) => {
      setConversation(res.conversation);
      setUnread(res.conversation.unreadCustomer);
      setSupportOnline(res.supportOnline);
      return res.conversation;
    })
    .catch((err) => setError(err.message));

  // Khách đăng nhập: lấy hội thoại để biết số tin chưa đọc. Đang được tư vấn dở -> mở sẵn tab tư vấn viên
  useEffect(() => {
    setConversation(null);
    setUnread(0);
    if (!user || !canShop) return;
    loadConversation().then((c) => {
      if (c && c.unreadCustomer > 0 && c.status !== 'CLOSED') setTab('human');
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tin mới từ tư vấn viên khi đang ở tab AI / khung đóng -> tăng badge
  useEffect(() => addListener((ev) => {
    if (ev.type === 'MESSAGE' && ev.message.senderType !== 'CUSTOMER') {
      setConversation(ev.conversation);
      if (!open || tab !== 'human') setUnread((n) => n + 1);
    }
  }), [addListener, open, tab]);

  // Trang khác yêu cầu mở chat (vd. nút "Hỏi tư vấn viên" ở trang sản phẩm)
  useEffect(() => {
    const onOpen = (e) => {
      setOpen(true);
      if (e.detail?.product) {
        setTab('human');
        setAttachedProduct(e.detail.product);
      }
    };
    window.addEventListener('chat:open', onOpen);
    return () => window.removeEventListener('chat:open', onOpen);
  }, []);

  useEffect(() => { if (open && tab === 'human') setUnread(0); }, [open, tab]);

  if (!canShop) return null; // admin dùng trang Hộp thư tư vấn

  const onHandoff = () => {
    loadConversation();
    setTab('human');
  };

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-panel" aria-label="Chat với SecureShop">
          <header className="chat-panel-head">
            <span className="chat-avatar" aria-hidden="true"><Icon name={tab === 'ai' ? 'cpu' : 'headset'} size={20} /></span>
            <div>
              <b>{tab === 'ai' ? 'Trợ lý AI SecureShop' : 'Tư vấn viên SecureShop'}</b>
              <small className={tab === 'ai' || supportOnline ? 'online' : ''}>
                {tab === 'ai' ? 'Trả lời ngay, 24/7'
                  : !user ? 'Hỗ trợ 8:00 - 21:00' : !connected ? 'Đang kết nối...' : supportOnline ? 'Đang online' : 'Sẽ phản hồi sớm nhất có thể'}
              </small>
            </div>
            {tab === 'human' && user && conversation && (
              <button type="button" className="chat-call" disabled={!connected || !supportOnline || inCall}
                      onClick={() => startCall({ conversationId: conversation.id, peerName: 'Tư vấn viên SecureShop' })}
                      aria-label="Gọi video cho tư vấn viên"
                      title={!supportOnline ? 'Chưa có tư vấn viên online để nghe máy' : 'Gọi video cho tư vấn viên'}>
                <Icon name="video" size={20} />
              </button>
            )}
            <button type="button" className="chat-close" onClick={() => setOpen(false)} aria-label="Thu nhỏ khung chat">✕</button>
          </header>

          <div className="chat-tabs" role="tablist" aria-label="Chọn người tư vấn">
            <button type="button" role="tab" aria-selected={tab === 'ai'} className={tab === 'ai' ? 'active' : ''}
                    onClick={() => setTab('ai')}>
              <Icon name="cpu" size={16} /> Trợ lý AI
            </button>
            <button type="button" role="tab" aria-selected={tab === 'human'} className={tab === 'human' ? 'active' : ''}
                    onClick={() => setTab('human')}>
              <Icon name="headset" size={16} /> Tư vấn viên
              {unread > 0 && tab !== 'human' && <span className="chat-tab-badge">{unread}</span>}
            </button>
          </div>

          {tab === 'ai' ? (
            <AiChat loggedIn={!!user} onHandoff={onHandoff}
                    onNavigate={() => { if (window.innerWidth <= 640) setOpen(false); }} />
          ) : !user ? (
            <div className="chat-login">
              <Icon name="headset" size={40} />
              <p>Đăng nhập để nhắn tin, gửi ảnh, ghi âm, gọi video với tư vấn viên. Lịch sử trò chuyện được lưu lại.</p>
              <Link to="/login" state={{ from: location }} className="btn btn-primary" onClick={() => setOpen(false)}>Đăng nhập</Link>
              <Link to="/register" className="link-btn" onClick={() => setOpen(false)}>Chưa có tài khoản? Đăng ký</Link>
              <button type="button" className="link-btn" onClick={() => setTab('ai')}>Hoặc hỏi Trợ lý AI ngay (không cần đăng nhập)</button>
            </div>
          ) : error ? (
            <div className="chat-login"><p>{error}</p></div>
          ) : conversation ? (
            <ChatThread conversationId={conversation.id} side="CUSTOMER" active={open && tab === 'human'}
                        attachedProduct={attachedProduct} onClearProduct={() => setAttachedProduct(null)}
                        emptyHint={<>Xin chào {user.fullName}! 👋<br />Bạn cần tư vấn thiết bị nào? Hãy mô tả nhu cầu (diện tích, trong nhà hay ngoài trời, ngân sách) để được gợi ý nhanh nhất.</>} />
          ) : null}
        </section>
      )}

      <button type="button" className="chat-fab" onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Đóng chat' : `Chat với SecureShop${unread ? `, ${unread} tin mới` : ''}`}>
        {open ? <span aria-hidden="true">✕</span> : <Icon name="headset" size={26} />}
        {!open && unread > 0 && <span className="badge">{unread}</span>}
      </button>
    </div>
  );
}
