import { useCallback, useEffect, useState } from 'react';

const KEY = 'secureshop_theme';
const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');

/** Giao diện đang dùng: đọc từ <html data-theme> (đã được script trong index.html đặt sẵn). */
const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

function apply(theme, animate) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-switching');
    setTimeout(() => root.classList.remove('theme-switching'), 300);
  }
  root.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent('theme:change', { detail: theme }));
}

/**
 * Sáng / tối.
 *  - Bấm nút: lưu lựa chọn vào localStorage (lần sau mở web vẫn giữ).
 *  - Chưa từng bấm: tự theo cài đặt sáng/tối của máy (kể cả khi máy tự đổi theo giờ).
 */
export default function useTheme() {
  const [theme, setTheme] = useState(current);

  useEffect(() => {
    const sync = (e) => setTheme(e.detail);
    window.addEventListener('theme:change', sync); // nhiều nút trên cùng trang luôn đồng bộ
    const mq = media();
    const onSystem = (e) => {
      if (!localStorage.getItem(KEY)) apply(e.matches ? 'dark' : 'light', true);
    };
    mq?.addEventListener?.('change', onSystem);
    return () => {
      window.removeEventListener('theme:change', sync);
      mq?.removeEventListener?.('change', onSystem);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch { /* chế độ ẩn danh chặn lưu: vẫn đổi được */ }
    apply(next, true);
  }, []);

  return { theme, isDark: theme === 'dark', toggle };
}
