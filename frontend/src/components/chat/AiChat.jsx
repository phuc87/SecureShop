import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import aiApi, { aiSession } from '../../api/aiApi';
import Icon from '../common/Icon';
import ProductImage from '../common/ProductImage';
import PriceTag from '../common/PriceTag';

const HISTORY_KEY = 'secureshop_ai_history';
const MAX_KEEP = 40;
const WELCOME = {
  id: 'welcome', from: 'ai',
  text: 'Xin chào! 👋 Mình là trợ lý AI của SecureShop, trực 24/7.\nMình gợi ý camera, khóa cửa, chuông cửa... theo nhu cầu và ngân sách của bạn, báo giá, so sánh mẫu, giải đáp giao hàng, bảo hành.',
  quickReplies: ['Tư vấn camera trong nhà', 'Camera ngoài trời dưới 2 triệu', 'Khóa vân tay cho chung cư', 'Phí giao hàng thế nào?'],
};

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
    if (saved?.session === aiSession.get() && Array.isArray(saved.messages) && saved.messages.length) return saved.messages;
  } catch { /* hỏng thì bỏ */ }
  return [WELCOME];
}

/**
 * Tab "Trợ lý AI" trong khung chat. Dùng được cả khi chưa đăng nhập.
 * onHandoff(): AI đã chuyển khách sang tư vấn viên -> khung chat mở tab tư vấn viên.
 */
export default function AiChat({ onHandoff, onNavigate, loggedIn }) {
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ session: aiSession.get(), messages: messages.slice(-MAX_KEEP) }));
  }, [messages]);

  useEffect(() => {
    aiApi.status().then((s) => setOnline(!!s.online)).catch(() => setOnline(false));
  }, []);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const push = (m) => setMessages((list) => [...list, { id: `${Date.now()}-${Math.random()}`, ...m }]);

  const handleReply = (res) => {
    push({ from: 'ai', ...res });
    if (res.action === 'OFFLINE') setOnline(false);
    else setOnline(true);
    if (res.action === 'HANDOFF') setTimeout(() => onHandoff?.(), 1200);
  };

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    if (message === 'Gặp tư vấn viên') { handoff(); return; }
    setInput('');
    push({ from: 'me', text: message });
    setBusy(true);
    try {
      handleReply(await aiApi.ask(message));
    } catch (err) {
      push({ from: 'ai', text: err.message || 'Có lỗi, bạn thử lại nhé.', error: true });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const handoff = async () => {
    if (busy) return;
    push({ from: 'me', text: 'Gặp tư vấn viên' });
    setBusy(true);
    try {
      handleReply(await aiApi.handoff());
    } catch (err) {
      push({ from: 'ai', text: err.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const rate = async (m, value) => {
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, rated: value } : x)));
    aiApi.feedback(m.logId, value).catch(() => {});
  };

  const restart = () => {
    aiSession.reset();
    setMessages([WELCOME]);
  };

  const lastAi = [...messages].reverse().find((m) => m.from === 'ai');

  return (
    <div className="chat-thread ai-chat">
      <div className="ai-toolbar">
        <span className={`ai-status ${online ? 'on' : ''}`}>{online ? 'Trợ lý AI · trả lời ngay' : 'Trợ lý AI tạm nghỉ'}</span>
        <button type="button" className="link-btn" onClick={restart} title="Xoá ngữ cảnh, hỏi lại từ đầu">Hỏi lại từ đầu</button>
        <button type="button" className="link-btn ai-handoff" onClick={handoff} disabled={busy}>
          <Icon name="headset" size={14} /> Gặp tư vấn viên
        </button>
      </div>
      <div className="chat-messages" ref={listRef} aria-live="polite">
        {messages.map((m) => (m.from === 'me' ? (
          <div key={m.id} className="msg-row mine">
            <div className="msg-bubble type-text"><p className="msg-text">{m.text}</p></div>
          </div>
        ) : (
          <div key={m.id} className="msg-row theirs">
            <div className={`msg-bubble type-text is-ai ${m.error ? 'is-error' : ''}`}>
              <span className="msg-sender">🤖 Trợ lý AI</span>
              <p className="msg-text">{m.text}</p>
              {m.products?.length > 0 && (
                <div className="ai-products">
                  {m.products.map((p) => (
                    <Link key={p.id} to={`/products/${p.slug}`} className="msg-product" onClick={onNavigate}>
                      <ProductImage src={p.thumbnailUrl} alt="" categoryName={p.categoryName} iconSize={30} />
                      <span>
                        <b>{p.name}</b>
                        <PriceTag price={p.price} salePrice={p.salePrice} />
                        <small>{p.stock > 0 ? 'Xem chi tiết →' : 'Tạm hết hàng'}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {m.links?.length > 0 && (
                <div className="ai-links">
                  {m.links.map((l) => <Link key={l.url} to={l.url} onClick={onNavigate}>{l.label} →</Link>)}
                </div>
              )}
              {m.logId && (
                <div className="ai-rate" role="group" aria-label="Câu trả lời này có hữu ích không?">
                  <button type="button" className={m.rated === 'GOOD' ? 'on' : ''} onClick={() => rate(m, 'GOOD')}
                          disabled={!!m.rated} aria-label="Hữu ích">👍</button>
                  <button type="button" className={m.rated === 'BAD' ? 'on' : ''} onClick={() => rate(m, 'BAD')}
                          disabled={!!m.rated} aria-label="Chưa đúng ý">👎</button>
                  {m.rated && <small>Cảm ơn bạn!</small>}
                </div>
              )}
            </div>
          </div>
        )))}
        {busy && (
          <div className="msg-row theirs">
            <div className="typing-dots" aria-label="Trợ lý AI đang trả lời"><span /><span /><span /></div>
          </div>
        )}
        {lastAi?.quickReplies?.length > 0 && !busy && (
          <div className="ai-chips">
            {lastAi.quickReplies.map((q) => (
              <button type="button" key={q} onClick={() => send(q)}>{q}</button>
            ))}
          </div>
        )}
        {!loggedIn && lastAi?.action === 'LOGIN_REQUIRED' && (
          <p className="ai-hint">Đăng nhập để chat trực tiếp với tư vấn viên và xem đơn hàng.</p>
        )}
      </div>
      <form className="composer ai-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="composer-row">
          <label htmlFor="ai-input" className="sr-only">Hỏi trợ lý AI</label>
          <input id="ai-input" ref={inputRef} className="composer-input" maxLength={500} autoComplete="off"
                 placeholder="VD: camera ngoài trời quay đêm có màu tầm 1tr5" value={input}
                 onChange={(e) => setInput(e.target.value)} />
          <button type="submit" className="send-btn" disabled={busy || !input.trim()} aria-label="Gửi">
            <Icon name="send" size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
