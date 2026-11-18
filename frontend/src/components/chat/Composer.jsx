import { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon';
import EmojiPicker from './EmojiPicker';
import ProductPicker from './ProductPicker';
import ProductImage from '../common/ProductImage';
import { useToast } from '../../context/ToastContext';

const MAX_MB = 25;
const MAX_RECORD_SECONDS = 120;
const ACCEPT = 'image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';

/** Ghi âm cần trình duyệt hỗ trợ MediaRecorder và trang chạy trên HTTPS hoặc localhost. */
const canRecord = () => typeof window !== 'undefined' && window.isSecureContext
  && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';

function pickAudioMime() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return types.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || '';
}

const fmtSeconds = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Ô soạn tin: văn bản + emoji, đính kèm (ảnh/âm thanh/video/tài liệu), dán ảnh từ clipboard,
 * ghi âm trực tiếp, và (admin) gửi thẻ sản phẩm.
 */
export default function Composer({ onSend, onSendFile, onTyping, allowProductPicker, attachedProduct, onClearProduct, disabled }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [popover, setPopover] = useState(null); // 'emoji' | 'product' | null
  const [upload, setUpload] = useState(null);   // { name, progress }
  const [recording, setRecording] = useState(null); // { seconds }
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const typingRef = useRef(false);
  const typingTimer = useRef(null);
  const recorderRef = useRef(null);
  const recordCancelled = useRef(false);
  const recordTimer = useRef(null);
  const recordSupported = canRecord();
  const rootRef = useRef(null);

  // Bấm ra ngoài hoặc nhấn Esc thì đóng bảng emoji / chọn sản phẩm
  useEffect(() => {
    if (!popover) return undefined;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setPopover(null); };
    const onKey = (e) => { if (e.key === 'Escape') setPopover(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [popover]);

  // Dọn dẹp khi đóng khung chat giữa chừng
  useEffect(() => () => {
    clearTimeout(typingTimer.current);
    clearInterval(recordTimer.current);
    if (recorderRef.current?.state === 'recording') {
      recordCancelled.current = true;
      recorderRef.current.stop();
    }
  }, []);

  // Tự giãn chiều cao ô nhập
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (typingRef.current) {
      typingRef.current = false;
      onTyping?.(false);
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    if (!typingRef.current) {
      typingRef.current = true;
      onTyping?.(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2500);
  };

  const submit = async () => {
    const content = text.trim();
    if (!content && !attachedProduct) return;
    setSending(true);
    stopTyping();
    try {
      if (attachedProduct) {
        await onSend({ type: 'PRODUCT_CARD', productId: attachedProduct.id, content: content || null });
        onClearProduct?.();
      } else {
        await onSend({ type: 'TEXT', content });
      }
      setText('');
      setPopover(null);
      textareaRef.current?.focus();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Enter gửi, Shift + Enter xuống dòng
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const sendFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File "${file.name}" lớn hơn ${MAX_MB}MB`);
      return;
    }
    setUpload({ name: file.name, progress: 0 });
    try {
      await onSendFile(file, (progress) => setUpload({ name: file.name, progress }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpload(null);
    }
  };

  const handlePaste = (e) => {
    const file = e.clipboardData?.files?.[0];
    if (file) {
      e.preventDefault();
      sendFile(file);
    }
  };

  // ===== Ghi âm =====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickAudioMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      recordCancelled.current = false;
      recorder.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recordTimer.current);
        setRecording(null);
        if (recordCancelled.current || chunks.length === 0) return;
        const type = recorder.mimeType || chunks[0].type || 'audio/webm';
        const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
        const file = new File(chunks, `ghi-am-${Date.now()}.${ext}`, { type });
        sendFile(file);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording({ seconds: 0 });
      recordTimer.current = setInterval(() => {
        setRecording((r) => {
          const seconds = (r?.seconds || 0) + 1;
          if (seconds >= MAX_RECORD_SECONDS && recorder.state === 'recording') recorder.stop();
          return { seconds };
        });
      }, 1000);
    } catch (err) {
      toast.error(err?.name === 'NotAllowedError'
        ? 'Bạn chưa cho phép dùng micro. Hãy bấm biểu tượng ổ khoá trên thanh địa chỉ để cấp quyền.'
        : 'Không mở được micro trên thiết bị này.');
    }
  };

  const finishRecording = (cancel) => {
    recordCancelled.current = cancel;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  if (recording) {
    return (
      <div className="composer composer-recording" role="status">
        <span className="rec-dot" aria-hidden="true" />
        <span>Đang ghi âm {fmtSeconds(recording.seconds)} / {fmtSeconds(MAX_RECORD_SECONDS)}</span>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => finishRecording(true)}>Huỷ</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => finishRecording(false)}>
          <Icon name="send" size={16} /> Gửi
        </button>
      </div>
    );
  }

  return (
    <div className="composer" ref={rootRef}>
      {attachedProduct && (
        <div className="composer-attachment">
          <ProductImage src={attachedProduct.thumbnailUrl} alt="" categoryName={attachedProduct.categoryName || attachedProduct.category?.name} iconSize={18} />
          <span>Hỏi về: <b>{attachedProduct.name}</b></span>
          <button type="button" className="link-btn" onClick={onClearProduct} aria-label="Bỏ sản phẩm đính kèm">✕</button>
        </div>
      )}
      {upload && (
        <div className="composer-upload" role="status">
          <span>Đang gửi "{upload.name}"</span>
          <span className="upload-bar"><span style={{ width: `${upload.progress}%` }} /></span>
          <span>{upload.progress}%</span>
        </div>
      )}

      {popover === 'emoji' && <EmojiPicker onPick={(e) => insertEmoji(e)} />}
      {popover === 'product' && (
        <ProductPicker onPick={async (p) => {
          setPopover(null);
          try { await onSend({ type: 'PRODUCT_CARD', productId: p.id, content: text.trim() || null }); setText(''); }
          catch (err) { toast.error(err.message); }
        }} />
      )}

      <div className="composer-row">
        <div className="composer-tools">
          <button type="button" className={`tool-btn ${popover === 'emoji' ? 'active' : ''}`} title="Biểu tượng cảm xúc"
                  aria-label="Biểu tượng cảm xúc" onClick={() => setPopover((p) => (p === 'emoji' ? null : 'emoji'))} disabled={disabled}>
            <span aria-hidden="true">😊</span>
          </button>
          <button type="button" className="tool-btn" title="Đính kèm ảnh, video, âm thanh, tài liệu (tối đa 25MB)"
                  aria-label="Đính kèm file" onClick={() => fileRef.current?.click()} disabled={disabled || !!upload}>
            <Icon name="inbox" size={18} />
          </button>
          <input ref={fileRef} type="file" accept={ACCEPT} hidden id="chat-file-input"
                 onChange={(e) => { sendFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className="tool-btn" onClick={startRecording} disabled={disabled || !recordSupported || !!upload}
                  aria-label="Ghi âm"
                  title={recordSupported ? 'Ghi âm (tối đa 2 phút)' : 'Ghi âm cần mở trang bằng HTTPS hoặc localhost'}>
            <span aria-hidden="true">🎤</span>
          </button>
          {allowProductPicker && (
            <button type="button" className={`tool-btn ${popover === 'product' ? 'active' : ''}`} title="Gửi thông tin sản phẩm"
                    aria-label="Gửi sản phẩm" onClick={() => setPopover((p) => (p === 'product' ? null : 'product'))} disabled={disabled}>
              <Icon name="tag" size={18} />
            </button>
          )}
        </div>
        <label htmlFor="chat-input" className="sr-only">Nhập tin nhắn</label>
        <textarea id="chat-input" ref={textareaRef} rows={1} className="composer-input" maxLength={2000}
                  placeholder={disabled ? 'Đang kết nối...' : 'Nhập tin nhắn...'} title="Enter để gửi, Shift + Enter để xuống dòng"
                  value={text} onChange={handleChange} onKeyDown={handleKeyDown} onPaste={handlePaste}
                  onFocus={() => setPopover((p) => (p === 'emoji' ? p : null))} disabled={disabled} />
        <button type="button" className="send-btn" onClick={submit} aria-label="Gửi"
                disabled={disabled || sending || (!text.trim() && !attachedProduct)}>
          <Icon name="send" size={18} />
        </button>
      </div>
    </div>
  );
}
