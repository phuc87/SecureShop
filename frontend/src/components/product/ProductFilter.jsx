import { useEffect } from 'react';
import Icon from '../common/Icon';
import { PLACEMENT_LABELS, PRICE_RANGES } from '../../utils/constants';

/**
 * Bộ lọc sản phẩm. Giá trị lọc nằm trên URL (?category=...&price=...) để copy link / bấm Back vẫn giữ.
 * - Máy tính: cột bên trái, luôn hiện.
 * - Điện thoại / máy tính bảng (<= 960px): ngăn kéo trượt từ trái, mở bằng nút "Bộ lọc" (open = true).
 *   Lọc áp dụng ngay, nút cuối ngăn kéo cho biết số kết quả.
 */
export default function ProductFilter({ categories, brands, values, onChange, onReset, open = false, onClose, resultCount }) {
  // Ngăn kéo đang mở: khoá cuộn trang phía sau, Esc để đóng
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const radio = (name, value, label, checked) => (
    <label className="filter-option" key={`${name}-${value}`}>
      <input type="radio" name={name} checked={checked} onChange={() => onChange(name, value)} />
      <span>{label}</span>
    </label>
  );

  const hasFilter = values.category || values.brand || values.price || values.placement
    || values.featured || values.onSale;

  return (
    <>
      {open && <div className="filter-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside id="product-filter" className={`filter-panel ${open ? 'open' : ''}`} aria-label="Bộ lọc sản phẩm">
        <div className="filter-head">
          <h2>Bộ lọc</h2>
          {hasFilter && <button type="button" className="link-btn" onClick={onReset}>Xoá lọc</button>}
          <button type="button" className="filter-close" onClick={onClose} aria-label="Đóng bộ lọc">
            <Icon name="close" size={20} />
          </button>
        </div>

        <fieldset>
          <legend>Danh mục</legend>
          {radio('category', '', 'Tất cả', !values.category)}
          {categories.map((c) => radio('category', c.slug, c.name, values.category === c.slug))}
        </fieldset>

        <fieldset>
          <legend>Khoảng giá</legend>
          {radio('price', '', 'Tất cả', !values.price)}
          {PRICE_RANGES.map((r) => radio('price', r.id, r.label, values.price === r.id))}
        </fieldset>

        <fieldset>
          <legend>Vị trí lắp đặt</legend>
          {radio('placement', '', 'Tất cả', !values.placement)}
          {radio('placement', 'INDOOR', PLACEMENT_LABELS.INDOOR, values.placement === 'INDOOR')}
          {radio('placement', 'OUTDOOR', PLACEMENT_LABELS.OUTDOOR, values.placement === 'OUTDOOR')}
        </fieldset>

        <fieldset>
          <legend>Thương hiệu</legend>
          <select id="filter-brand" className="input" value={values.brand}
                  onChange={(e) => onChange('brand', e.target.value)} aria-label="Thương hiệu">
            <option value="">Tất cả thương hiệu</option>
            {brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
          </select>
        </fieldset>

        <div className="filter-apply">
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            {resultCount == null ? 'Xem kết quả' : `Xem ${resultCount} sản phẩm`}
          </button>
        </div>
      </aside>
    </>
  );
}
