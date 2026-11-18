import { useEffect, useRef, useState } from 'react';
import authApi from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useTheme from '../../hooks/useTheme';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise = null;
let configPromise = null;

/** Nạp thư viện "Google Identity Services" 1 lần cho cả trang. */
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => { scriptPromise = null; reject(new Error('Không tải được Google (kiểm tra kết nối Internet)')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/**
 * Nút "Đăng nhập với Google" (nút chính thức do Google vẽ).
 * Chỉ hiện khi backend đã cấu hình GOOGLE_CLIENT_ID. text: 'signin_with' | 'signup_with'.
 */
export default function GoogleButton({ text = 'signin_with', onError }) {
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const { isDark } = useTheme();
  const boxRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!configPromise) configPromise = authApi.googleConfig().catch(() => ({ enabled: false }));
    let alive = true;
    configPromise.then((c) => alive && setConfig(c));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!config?.enabled) return undefined;
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !boxRef.current) return;
      window.google.accounts.id.initialize({
        client_id: config.clientId,
        ux_mode: 'popup',
        callback: async ({ credential }) => {
          setBusy(true);
          try {
            const user = await loginWithGoogle(credential);
            toast.success(`Xin chào, ${user.fullName}!`);
            // GuestOnlyRoute thấy đã có user sẽ tự chuyển về trang trước đó
          } catch (err) {
            setBusy(false);
            if (onError) onError(err.message); else toast.error(err.message);
          }
        },
      });
      const width = Math.min(400, Math.max(200, boxRef.current.offsetWidth || 320));
      boxRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(boxRef.current, {
        type: 'standard', theme: isDark ? 'filled_black' : 'outline', size: 'large',
        text, shape: 'pill', logo_alignment: 'center', locale: 'vi', width,
      });
    }).catch((err) => !cancelled && setLoadError(err.message));
    return () => { cancelled = true; };
  }, [config, isDark, text, loginWithGoogle, toast, onError]);

  // Google chỉ cho dùng trên localhost hoặc tên miền thật, KHÔNG cho địa chỉ IP (vd. laptop 2 vào https://192.168.1.8:5173)
  if (!config?.enabled || /^\d{1,3}(\.\d{1,3}){3}$/.test(window.location.hostname)) return null;
  return (
    <div className="google-login">
      <div className="auth-divider"><span>hoặc</span></div>
      <div ref={boxRef} className={`google-btn-box ${busy ? 'is-busy' : ''}`} aria-busy={busy} />
      {busy && <p className="muted small center">Đang đăng nhập bằng Google...</p>}
      {loadError && <p className="field-error small center">{loadError}</p>}
    </div>
  );
}
