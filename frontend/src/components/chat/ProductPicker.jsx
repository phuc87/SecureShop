import { useEffect, useState } from 'react';
import productApi from '../../api/productApi';
import ProductImage from '../common/ProductImage';
import { formatCurrency } from '../../utils/format';

/** Tìm và chọn sản phẩm để gửi dạng thẻ trong chat. */
export default function ProductPicker({ onPick }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      productApi.search({ q: q.trim() || undefined, size: 6, sort: 'best_selling' })
        .then((res) => { if (!cancelled) setItems(res.content); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="chat-popover product-picker" role="dialog" aria-label="Chọn sản phẩm để gửi">
      <label htmlFor="chat-product-search" className="sr-only">Tìm sản phẩm</label>
      <input id="chat-product-search" className="input input-sm" placeholder="Tìm sản phẩm để gửi..."
             value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <ul>
        {items.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)}>
              <ProductImage src={p.thumbnailUrl} alt="" categoryName={p.categoryName} iconSize={22} />
              <span>
                <b>{p.name}</b>
                <small>{formatCurrency(p.effectivePrice)} · còn {p.stock}</small>
              </span>
            </button>
          </li>
        ))}
        {!loading && items.length === 0 && <li className="muted small">Không tìm thấy sản phẩm</li>}
      </ul>
    </div>
  );
}
