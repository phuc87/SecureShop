import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authApi from '../api/authApi';
import { tokenStorage } from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true); // đang khôi phục phiên đăng nhập khi tải trang

  // Tải lại trang: có token thì hỏi backend xem token còn hợp lệ không
  useEffect(() => {
    if (!tokenStorage.get()) {
      setInitializing(false);
      return;
    }
    authApi.me()
      .then(setUser)
      // Chỉ xoá token khi server nói token sai (401). Nếu chỉ là backend tạm tắt thì giữ lại,
      // bật backend lên rồi tải lại trang là vẫn còn đăng nhập.
      .catch((err) => { if (err.status === 401) tokenStorage.clear(); })
      .finally(() => setInitializing(false));
  }, []);

  // axiosClient phát các sự kiện này khi gặp lỗi 401 / 403
  useEffect(() => {
    const onExpired = () => setUser(null);
    const onForbidden = () => authApi.me().then(setUser).catch(() => {});
    window.addEventListener('auth:expired', onExpired);
    window.addEventListener('auth:forbidden', onForbidden);
    return () => {
      window.removeEventListener('auth:expired', onExpired);
      window.removeEventListener('auth:forbidden', onForbidden);
    };
  }, []);

  const handleAuth = useCallback((res) => {
    tokenStorage.set(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback((email, password) => authApi.login(email, password).then(handleAuth), [handleAuth]);
  const register = useCallback((data) => authApi.register(data).then(handleAuth), [handleAuth]);
  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAdmin: user?.role === 'ADMIN',
    /** Được mua hàng: khách vãng lai hoặc CUSTOMER. Admin là nhân viên, không mua hàng. */
    canShop: user?.role !== 'ADMIN',
    initializing,
    login,
    register,
    logout,
    /** Cập nhật thông tin hiển thị sau khi sửa hồ sơ (không cần đăng nhập lại). */
    updateUser: setUser,
  }), [user, initializing, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}
