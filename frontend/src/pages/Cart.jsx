import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import useCartSync from '../hooks/useCartSync';
import ProductImage from '../components/common/ProductImage';
import CartNotices from '../components/common/CartNotices';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Icon from '../components/common/Icon';
import { EmptyState } from '../components/common/StateViews';
import { formatCurrency } from '../utils/format';
import { FREE_SHIPPING_FROM, shippingFeeFor } from '../utils/constants';

const UNAVAILABLE_LABEL = { out: 'Hết hàng', stopped: 'Ngừng kinh doanh' };

/** Ô "Chọn tất cả": có trạng thái nửa chừng (—) khi mới chọn một vài món. */
function SelectAllBox({ checked, indeterminate, disabled, onChange, children }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <label className="cart-check">
      <input ref={ref} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export default function Cart() {
  const {
    items, available, selected, selectedCount, selectedSubtotal, updateQty, removeItem, removeItems, toggleSelect, selectAll,
  } = useCart();
  const { user } = useAuth();
  const { notices, syncing, dismiss } = useCartSync();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState title="Giỏ hàng đang trống">
          <span>Hãy chọn vài thiết bị để bảo vệ ngôi nhà của bạn.</span>
          <Link to="/products" className="btn btn-primary">Xem sản phẩm</Link>
        </EmptyState>
      </div>
    );
  }

  const subtotal = selectedSubtotal;
  const shipping = selected.length ? shippingFeeFor(subtotal) : 0;
  const unavailableCount = items.length - available.length;
  const allSelected = available.length > 0 && selected.length === available.length;
  const someSelected = selected.length > 0 && !allSelected;

  return (
    <div className="container page">
      <h1>Giỏ hàng</h1>
      <CartNotices notices={notices} onDismiss={dismiss} />
      <div className="cart-layout">
        <div className="cart-main">
          <div className="cart-toolbar">
            <SelectAllBox checked={allSelected} indeterminate={someSelected} disabled={!available.length} onChange={selectAll}>
              Chọn tất cả <span className="muted">({available.length})</span>
            </SelectAllBox>
            {selected.length > 0 && (
              <button type="button" className="trash-btn" onClick={() => setConfirmDelete(true)}
                      aria-label={`Xoá ${selected.length} sản phẩm đã chọn`} title="Xoá các sản phẩm đã chọn">
                <Icon name="trash" size={20} />
              </button>
            )}
          </div>

          <ul className="cart-list">
            {items.map((item) => {
              const isChecked = !item.unavailable && !item.unchecked;
              return (
                <li key={item.id} className={`cart-item ${item.unavailable ? 'cart-item-off' : ''} ${isChecked ? 'is-checked' : ''}`}>
                  <label className="cart-check cart-item-check">
                    <input type="checkbox" checked={isChecked} disabled={!!item.unavailable}
                           onChange={(e) => toggleSelect(item.id, e.target.checked)}
                           aria-label={`Chọn ${item.name} để thanh toán`} />
                  </label>
                  <Link to={`/products/${item.slug}`} className="cart-thumb">
                    <ProductImage src={item.thumbnailUrl} alt={item.name} categoryName={item.categoryName} iconSize={40} />
                  </Link>
                  <div className="cart-item-info">
                    <Link to={`/products/${item.slug}`} className="cart-item-name">{item.name}</Link>
                    {item.unavailable ? (
                      <span className="chip chip-red">{UNAVAILABLE_LABEL[item.unavailable]}</span>
                    ) : (
                      <span className="muted">
                        {formatCurrency(item.effectivePrice)}
                        {item.stock <= 5 && <span className="cart-stock-low"> · còn {item.stock}</span>}
                      </span>
                    )}
                  </div>
                  {item.unavailable ? (
                    <span className="muted small cart-off-note">Không tính vào đơn</span>
                  ) : (
                    <div className="qty-stepper qty-sm" role="group" aria-label={`Số lượng ${item.name}`}>
                      <button type="button" onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Giảm"
                              disabled={item.qty <= 1}>−</button>
                      <input id={`cart-qty-${item.id}`} type="number" min="1" max={item.stock} value={item.qty} aria-label="Số lượng"
                             onChange={(e) => updateQty(item.id, Number(e.target.value) || 1)} />
                      <button type="button" onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Tăng"
                              disabled={item.qty >= item.stock}>+</button>
                    </div>
                  )}
                  <b className="cart-line-total">
                    {item.unavailable ? '—' : formatCurrency(Number(item.effectivePrice) * item.qty)}
                  </b>
                  <button type="button" className="trash-btn" onClick={() => removeItem(item.id)}
                          aria-label={`Xoá ${item.name} khỏi giỏ hàng`} title="Xoá khỏi giỏ hàng">
                    <Icon name="trash" size={20} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="cart-summary">
          <h2>Tóm tắt đơn hàng</h2>
          <dl>
            <div><dt>Tạm tính ({selectedCount} sản phẩm)</dt><dd>{formatCurrency(subtotal)}</dd></div>
            <div><dt>Phí giao hàng</dt><dd>{!selected.length ? '—' : shipping === 0 ? 'Miễn phí' : formatCurrency(shipping)}</dd></div>
            <div className="summary-total"><dt>Tổng cộng</dt><dd>{formatCurrency(subtotal + shipping)}</dd></div>
          </dl>
          {shipping > 0 && (
            <p className="muted small">Mua thêm {formatCurrency(FREE_SHIPPING_FROM - subtotal)} để được miễn phí giao hàng.</p>
          )}
          {selected.length > 0 && selected.length < available.length && (
            <p className="muted small">Chỉ thanh toán {selected.length} sản phẩm đã chọn, các sản phẩm còn lại vẫn được giữ trong giỏ.</p>
          )}
          {unavailableCount > 0 && (
            <p className="muted small">{unavailableCount} sản phẩm không còn bán sẽ không được đặt.</p>
          )}
          {available.length === 0 ? (
            <button type="button" className="btn btn-primary btn-block" disabled>Không có sản phẩm để đặt</button>
          ) : selected.length === 0 ? (
            <button type="button" className="btn btn-primary btn-block btn-lg" disabled>Chọn sản phẩm để thanh toán</button>
          ) : user ? (
            <Link to="/checkout" className={`btn btn-primary btn-block btn-lg ${syncing ? 'is-busy' : ''}`}
                  aria-disabled={syncing} onClick={(e) => syncing && e.preventDefault()}>
              {syncing ? 'Đang cập nhật giá...' : `Thanh toán (${selectedCount})`}
            </Link>
          ) : (
            <Link to="/login" state={{ from: { pathname: '/checkout' } }} className="btn btn-primary btn-block">
              Đăng nhập để đặt hàng
            </Link>
          )}
        </aside>
      </div>

      <ConfirmDialog open={confirmDelete} danger title={`Xoá ${selected.length} sản phẩm đã chọn?`}
                     message="Các sản phẩm này sẽ bị xoá khỏi giỏ hàng." confirmLabel="Xoá" cancelLabel="Giữ lại"
                     onConfirm={() => { removeItems(selected.map((i) => i.id)); setConfirmDelete(false); }}
                     onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}
