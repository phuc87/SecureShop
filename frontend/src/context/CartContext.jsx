import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import productApi from '../api/productApi';
import { formatCurrency } from '../utils/format';

/**
 * Giỏ hàng lưu trong localStorage (dùng được cả khi chưa đăng nhập).
 * Vì lưu ở trình duyệt nên giá/tồn kho có thể đã cũ -> trang Giỏ hàng và Thanh toán gọi syncWithServer()
 * để lấy số liệu mới nhất. Sản phẩm ngừng bán/hết hàng được đánh dấu unavailable và không tính tiền.
 * Khách tick chọn món nào thì chỉ món đó sang trang thanh toán: món bỏ chọn có cờ unchecked = true
 * (không có cờ = đang chọn, nên giỏ cũ và món mới thêm vào mặc định được chọn).
 */
const CART_KEY = 'secureshop_cart';
const CartContext = createContext(null);

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Áp số liệu mới từ server vào 1 dòng giỏ hàng (hàm thuần, không có tác dụng phụ). */
function applyFresh(item, p) {
  if (!p) return { ...item, unavailable: 'stopped' };
  const next = {
    ...item,
    slug: p.slug,
    name: p.name,
    thumbnailUrl: p.thumbnailUrl,
    categoryName: p.categoryName,
    price: p.price,
    effectivePrice: p.effectivePrice,
    stock: p.stock,
    unavailable: p.stock <= 0 ? 'out' : undefined,
  };
  if (p.stock > 0 && item.qty > p.stock) next.qty = p.stock;
  return next;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  /** Thêm sản phẩm; số lượng không vượt quá tồn kho. Trả về số lượng thực tế trong giỏ. */
  const addItem = useCallback((product, qty = 1) => {
    const existing = items.find((i) => i.id === product.id);
    const baseQty = existing && !existing.unavailable ? existing.qty : 0;
    const finalQty = Math.min(baseQty + qty, product.stock);
    setItems((prev) => {
      if (prev.some((i) => i.id === product.id)) {
        return prev.map((i) => (i.id === product.id
          ? { ...i, qty: finalQty, stock: product.stock, price: product.price, effectivePrice: product.effectivePrice, unavailable: undefined, unchecked: undefined }
          : i));
      }
      return [...prev, {
        id: product.id,
        slug: product.slug,
        name: product.name,
        thumbnailUrl: product.thumbnailUrl,
        categoryName: product.categoryName || product.category?.name,
        price: product.price,
        effectivePrice: product.effectivePrice,
        stock: product.stock,
        qty: finalQty,
      }];
    });
    return finalQty;
  }, [items]);

  const updateQty = useCallback((id, qty) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) } : i)));
  }, []);

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  /** Xoá nhiều sản phẩm (vd. các món vừa đặt hàng xong), giữ lại món chưa mua được. */
  const removeItems = useCallback((ids) => setItems((prev) => prev.filter((i) => !ids.includes(i.id))), []);
  const clear = useCallback(() => setItems([]), []);

  /** Tick / bỏ tick 1 món. */
  const toggleSelect = useCallback((id, on) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unchecked: on ? undefined : true } : i)));
  }, []);
  /** Chọn tất cả / bỏ chọn tất cả. */
  const selectAll = useCallback((on) => {
    setItems((prev) => prev.map((i) => ({ ...i, unchecked: on ? undefined : true })));
  }, []);
  /** Chỉ chọn đúng 1 món (nút "Mua ngay": thanh toán riêng món đó, các món khác vẫn nằm trong giỏ). */
  const selectOnly = useCallback((id) => {
    setItems((prev) => prev.map((i) => ({ ...i, unchecked: i.id === id ? undefined : true })));
  }, []);

  /**
   * Lấy giá, tồn kho, tên, ảnh mới nhất từ server.
   * Trả về danh sách câu thông báo những gì đã thay đổi (để hiện cho khách).
   */
  const syncWithServer = useCallback(async () => {
    const snapshot = itemsRef.current;
    if (snapshot.length === 0) return [];
    const fresh = await productApi.byIds(snapshot.map((i) => i.id));
    const byId = new Map(fresh.map((p) => [p.id, p]));

    const notices = [];
    snapshot.forEach((old) => {
      const p = byId.get(old.id);
      if (!p) {
        if (old.unavailable !== 'stopped') notices.push(`"${old.name}" đã ngừng kinh doanh.`);
        return;
      }
      if (p.stock <= 0) {
        if (old.unavailable !== 'out') notices.push(`"${p.name}" vừa hết hàng.`);
        return;
      }
      if (Number(p.effectivePrice) !== Number(old.effectivePrice)) {
        notices.push(`Giá "${p.name}" đã thay đổi: ${formatCurrency(old.effectivePrice)} → ${formatCurrency(p.effectivePrice)}.`);
      }
      if (old.qty > p.stock) {
        notices.push(`"${p.name}" chỉ còn ${p.stock} sản phẩm, số lượng trong giỏ đã giảm còn ${p.stock}.`);
      }
    });

    setItems((prev) => prev.map((i) => applyFresh(i, byId.get(i.id))));
    return notices;
  }, []);

  const value = useMemo(() => {
    const available = items.filter((i) => !i.unavailable);
    const selected = available.filter((i) => !i.unchecked); // món sẽ được thanh toán
    return {
      items,
      available,
      selected,
      hasUnavailable: available.length !== items.length,
      count: available.reduce((sum, i) => sum + i.qty, 0),
      subtotal: available.reduce((sum, i) => sum + Number(i.effectivePrice) * i.qty, 0),
      selectedCount: selected.reduce((sum, i) => sum + i.qty, 0),
      selectedSubtotal: selected.reduce((sum, i) => sum + Number(i.effectivePrice) * i.qty, 0),
      addItem,
      updateQty,
      removeItem,
      removeItems,
      clear,
      toggleSelect,
      selectAll,
      selectOnly,
      syncWithServer,
    };
  }, [items, addItem, updateQty, removeItem, removeItems, clear, toggleSelect, selectAll, selectOnly, syncWithServer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải dùng bên trong <CartProvider>');
  return ctx;
}
