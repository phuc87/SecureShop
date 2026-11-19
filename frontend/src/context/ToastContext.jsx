import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from '../components/common/Icon';

const ICON = { success: 'checkCircle', error: 'close', info: 'inbox' };

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const show = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Thông báo lỗi / thông tin (vd. đánh giá mới) để lâu hơn cho kịp đọc
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), type === 'success' ? 3000 : 6000);
  }, []);

  const close = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const value = useMemo(() => ({
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon" aria-hidden="true"><Icon name={ICON[t.type] || 'inbox'} size={16} /></span>
            <span className="toast-text">{t.message}</span>
            <button type="button" className="toast-close" onClick={() => close(t.id)} aria-label="Đóng thông báo">
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải dùng bên trong <ToastProvider>');
  return ctx;
}
