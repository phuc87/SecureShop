import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import useCartSync from '../hooks/useCartSync';
import ProductImage from '../components/common/ProductImage';
import CartNotices from '../components/common/CartNotices';
import { EmptyState } from '../components/common/StateViews';
import { formatCurrency } from '../utils/format';
import { FREE_SHIPPING_FROM, shippingFeeFor } from '../utils/constants';

const UNAVAILABLE_LABEL = { out: 'Hết hàng', stopped: 'Ngừng kinh doanh' };

export default function Cart() {
  const { items, available, subtotal, updateQty, removeItem } = useCart();
  const { user } = useAuth();
  const { notices, syncing, dismiss } = useCartSync();

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

  const shipping = shippingFeeFor(subtotal);
  const unavailableCount = items.length - available.length;

  return (
    <div className="container page">
      <h1>Giỏ hàng</h1>
      <CartNotices notices={notices} onDismiss={dismiss} />
      <div className="cart-layout">
        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.id} className={`cart-item ${item.unavailable ? 'cart-item-off' : ''}`}>
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
                  <button type="button" onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Giảm">−</button>
                  <input id={`cart-qty-${item.id}`} type="number" min="1" max={item.stock} value={item.qty} aria-label="Số lượng"
                         onChange={(e) => updateQty(item.id, Number(e.target.value) || 1)} />
                  <button type="button" onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Tăng"
                          disabled={item.qty >= item.stock}>+</button>
                </div>
              )}
              <b className="cart-line-total">
                {item.unavailable ? '—' : formatCurrency(Number(item.effectivePrice) * item.qty)}
              </b>
              <button type="button" className="link-btn text-danger" onClick={() => removeItem(item.id)}>Xoá</button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2>Tóm tắt đơn hàng</h2>
          <dl>
            <div><dt>Tạm tính</dt><dd>{formatCurrency(subtotal)}</dd></div>
            <div><dt>Phí giao hàng</dt><dd>{shipping === 0 ? 'Miễn phí' : formatCurrency(shipping)}</dd></div>
            <div className="summary-total"><dt>Tổng cộng</dt><dd>{formatCurrency(subtotal + shipping)}</dd></div>
          </dl>
          {shipping > 0 && available.length > 0 && (
            <p className="muted small">Mua thêm {formatCurrency(FREE_SHIPPING_FROM - subtotal)} để được miễn phí giao hàng.</p>
          )}
          {unavailableCount > 0 && (
            <p className="muted small">{unavailableCount} sản phẩm không còn bán sẽ không được đặt.</p>
          )}
          {available.length === 0 ? (
            <button type="button" className="btn btn-primary btn-block" disabled>Không có sản phẩm để đặt</button>
          ) : user ? (
            <Link to="/checkout" className={`btn btn-primary btn-block btn-lg ${syncing ? 'is-busy' : ''}`}
                  aria-disabled={syncing} onClick={(e) => syncing && e.preventDefault()}>
              {syncing ? 'Đang cập nhật giá...' : 'Tiến hành thanh toán'}
            </Link>
          ) : (
            <Link to="/login" state={{ from: { pathname: '/checkout' } }} className="btn btn-primary btn-block">
              Đăng nhập để đặt hàng
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
