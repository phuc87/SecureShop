import { useCallback, useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';

/**
 * Khi mở trang Giỏ hàng / Thanh toán: hỏi server giá & tồn kho mới nhất.
 * notices: các thay đổi cần báo cho khách (giá đổi, hết hàng, ngừng bán...).
 */
export default function useCartSync() {
  const { syncWithServer } = useCart();
  const [notices, setNotices] = useState([]);
  const [syncing, setSyncing] = useState(true);

  const resync = useCallback(async () => {
    setSyncing(true);
    try {
      const changes = await syncWithServer();
      setNotices((prev) => [...new Set([...prev, ...changes])]);
    } catch {
      // Mất mạng: vẫn cho xem giỏ hàng, backend sẽ kiểm tra lại giá & tồn kho lúc đặt hàng
    } finally {
      setSyncing(false);
    }
  }, [syncWithServer]);

  useEffect(() => {
    resync();
  }, [resync]);

  const dismiss = useCallback(() => setNotices([]), []);
  return { notices, syncing, resync, dismiss };
}
