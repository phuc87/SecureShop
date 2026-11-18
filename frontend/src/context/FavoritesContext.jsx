import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import favoriteApi from '../api/favoriteApi';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

/**
 * Sản phẩm yêu thích: lưu trên server (bảng favorites) nên đăng nhập máy nào cũng thấy.
 * Ở đây chỉ giữ tập id để tô đỏ trái tim trên mọi thẻ sản phẩm.
 * Chỉ khách hàng mới có; khách vãng lai bấm trái tim sẽ được mời đăng nhập, admin không thấy nút.
 */
const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, canShop } = useAuth();
  const toast = useToast();
  const [ids, setIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const pending = useRef(new Set()); // id đang gửi request, chặn bấm liên tục
  const enabled = !!user && canShop;

  useEffect(() => {
    setIds(new Set());
    setLoaded(false);
    if (!enabled) return;
    let alive = true;
    favoriteApi.ids()
      .then((list) => { if (alive) { setIds(new Set(list)); setLoaded(true); } })
      .catch(() => {});
    return () => { alive = false; };
  }, [enabled, user?.id]);

  const isFavorite = useCallback((productId) => ids.has(productId), [ids]);

  /** Bật/tắt yêu thích. Đổi màu ngay (lạc quan), lỗi thì trả lại như cũ. Trả về trạng thái mới. */
  const toggle = useCallback(async (product) => {
    const id = product.id;
    if (pending.current.has(id)) return ids.has(id);
    pending.current.add(id);
    const willLike = !ids.has(id);
    const apply = (like) => setIds((prev) => {
      const next = new Set(prev);
      if (like) next.add(id); else next.delete(id);
      return next;
    });
    apply(willLike);
    try {
      if (willLike) await favoriteApi.add(id); else await favoriteApi.remove(id);
      toast.success(willLike ? `Đã thêm "${product.name}" vào yêu thích` : 'Đã bỏ khỏi danh sách yêu thích');
      return willLike;
    } catch (err) {
      apply(!willLike);
      toast.error(err.message);
      return !willLike;
    } finally {
      pending.current.delete(id);
    }
  }, [ids, toast]);

  const value = useMemo(() => ({
    enabled, loaded, count: ids.size, isFavorite, toggle,
  }), [enabled, loaded, ids, isFavorite, toggle]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites phải dùng bên trong <FavoritesProvider>');
  return ctx;
}
