import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import orderApi from '../api/orderApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import useCartSync from '../hooks/useCartSync';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/common/ProductImage';
import CartNotices from '../components/common/CartNotices';
import VoucherBox from '../components/order/VoucherBox';
import AddressMap from '../components/order/AddressMap';
import Icon from '../components/common/Icon';
import { EmptyState } from '../components/common/StateViews';
import { formatCurrency } from '../utils/format';
import { FREE_SHIPPING_FROM, shippingFeeFor } from '../utils/constants';

const PAYMENTS = [
  { value: 'COD', icon: 'truck', title: 'Thanh toán khi nhận hàng (COD)', desc: 'Trả tiền mặt cho nhân viên giao hàng.' },
  { value: 'BANK_TRANSFER', icon: 'tag', title: 'Chuyển khoản ngân hàng', desc: 'Thông tin chuyển khoản hiện ngay sau khi đặt hàng và gửi trong email.' },
];

/** Kiểm tra giống luật ở backend để báo lỗi ngay, không cần gửi request. */
function validate(f) {
  const e = {};
  if (!f.receiverName.trim()) e.receiverName = 'Vui lòng nhập tên người nhận';
  if (!/^0\d{9}$/.test(f.receiverPhone)) e.receiverPhone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
  if (!/^\S+@\S+\.\S+$/.test(f.receiverEmail)) e.receiverEmail = 'Email không hợp lệ';
  if (!f.province.trim()) e.province = 'Vui lòng nhập Tỉnh / Thành phố';
  if (!f.ward.trim()) e.ward = 'Vui lòng nhập Phường / Xã';
  if (!f.street.trim()) e.street = 'Vui lòng nhập số nhà, tên đường';
  return e;
}

export default function Checkout() {
  const { user } = useAuth();
  const { items: cartItems, available, selected: items, selectedSubtotal: subtotal, removeItems, updateQty, toggleSelect } = useCart();
  const { notices, syncing, resync, dismiss } = useCartSync();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    receiverName: user.fullName, receiverPhone: user.phone || '', receiverEmail: user.email,
    province: '', district: '', ward: '', street: '', note: '', paymentMethod: 'COD', saveAddress: true,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [voucher, setVoucher] = useState(null); // kết quả áp mã do server tính: { code, discount, ... }

  // Điền sẵn địa chỉ đã lưu lần trước
  useEffect(() => {
    orderApi.defaultAddress()
      .then((res) => { if (res.address) setForm((f) => ({ ...f, ...res.address })); })
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    return (
      <div className="container page">
        {available.length > 0 ? (
          <EmptyState title="Bạn chưa chọn sản phẩm nào">
            <span>Hãy tick chọn sản phẩm muốn mua trong giỏ hàng rồi bấm thanh toán.</span>
            <Link to="/cart" className="btn btn-primary">Chọn sản phẩm trong giỏ</Link>
          </EmptyState>
        ) : (
          <EmptyState title="Giỏ hàng đang trống">
            <span>{cartItems.length ? 'Các sản phẩm trong giỏ đã hết hàng hoặc ngừng bán.' : 'Hãy chọn sản phẩm trước khi thanh toán.'}</span>
            <Link to="/products" className="btn btn-primary">Xem sản phẩm</Link>
          </EmptyState>
        )}
      </div>
    );
  }

  const shipping = shippingFeeFor(subtotal); // miễn phí ship tính theo tiền hàng trước khi giảm
  const discount = voucher ? Number(voucher.discount) : 0;
  const total = subtotal - discount + shipping;

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`co-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const order = await orderApi.checkout({
        ...form, voucherCode: voucher?.code || null, items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
      });
      removeItems(items.map((i) => i.id)); // giữ lại món hết hàng/ngừng bán để khách tự xem
      toast.success(`Đặt hàng thành công! Mã đơn ${order.orderCode}`);
      navigate(`/account/orders/${order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (err) {
      setServerError(err.message);
      setErrors(err.errors || {});
      setSubmitting(false);
      if (/^Mã |mã /.test(err.message)) setVoucher(null); // mã vừa hết lượt/hết hạn trong lúc đặt
      if (err.status === 400 || err.status === 409) resync(); // có thể vừa hết hàng / đổi giá -> cập nhật giỏ
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Chọn trên bản đồ -> điền các ô địa chỉ (ô nào bản đồ không đọc được thì giữ nguyên để khách tự nhập)
  const fillFromMap = (addr) => {
    setForm((f) => ({
      ...f,
      province: addr.province || f.province,
      district: addr.district || f.district,
      ward: addr.ward || f.ward,
      street: addr.street || f.street,
    }));
    setErrors((er) => ({ ...er, province: undefined, district: undefined, ward: undefined, street: undefined }));
  };

  const field = (name, label, props = {}, hint = '') => (
    <label className="field" htmlFor={`co-${name}`}>
      <span>{label}</span>
      <input id={`co-${name}`} name={name} className={`input ${errors[name] ? 'input-error' : ''}`}
             value={form[name]} onChange={onChange} aria-invalid={!!errors[name]}
             aria-describedby={hint ? `co-${name}-hint` : undefined} {...props} />
      {errors[name] ? <small className="field-error">{errors[name]}</small>
        : hint && <small id={`co-${name}-hint`} className="field-hint">{hint}</small>}
    </label>
  );

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/cart">Giỏ hàng</Link><span>/</span><span aria-current="page">Thanh toán</span>
      </nav>
      <h1>Thanh toán</h1>
      <CartNotices notices={notices} onDismiss={dismiss} />
      {cartItems.length > items.length && (
        <div className="alert alert-info">
          Đơn này gồm {items.length} sản phẩm bạn đã chọn. {cartItems.length - items.length} sản phẩm khác vẫn được giữ trong giỏ hàng. <Link to="/cart">Chọn lại</Link>
        </div>
      )}
      {serverError && <div className="alert alert-error" role="alert">{serverError} {serverError.includes('giỏ hàng') && <Link to="/cart">Về giỏ hàng</Link>}</div>}

      <form className="checkout-layout" onSubmit={onSubmit} noValidate>
        <div className="checkout-main">
          <section className="panel" aria-labelledby="co-step1">
            <h2 id="co-step1"><span className="step-badge">1</span> Người nhận</h2>
            <div className="form-grid">
              {field('receiverName', 'Họ và tên *', { autoComplete: 'name' })}
              {field('receiverPhone', 'Số điện thoại *', { type: 'tel', autoComplete: 'tel', inputMode: 'numeric' })}
              <div className="span-2">{field('receiverEmail', 'Email nhận xác nhận đơn *', { type: 'email', autoComplete: 'email' })}</div>
            </div>
          </section>

          <section className="panel" aria-labelledby="co-step2">
            <div className="step-head">
              <h2 id="co-step2"><span className="step-badge">2</span> Địa chỉ giao hàng</h2>
              <button type="button" className={`btn btn-sm ${showMap ? 'btn-primary' : 'btn-outline'} map-toggle`}
                      onClick={() => setShowMap((s) => !s)} aria-expanded={showMap}>
                <Icon name="mapPin" size={16} /> {showMap ? 'Ẩn bản đồ' : 'Chọn trên bản đồ'}
              </button>
            </div>
            {showMap && <AddressMap onPick={fillFromMap} />}
            <div className="form-grid cols-3">
              {field('province', 'Tỉnh / Thành phố *', { autoComplete: 'address-level1', placeholder: 'TP. Hồ Chí Minh' })}
              {field('district', 'Quận / Huyện (không bắt buộc)', { autoComplete: 'address-level2', placeholder: 'Có thể bỏ trống' })}
              {field('ward', 'Phường / Xã *', { autoComplete: 'address-level3', placeholder: 'Phường Diên Hồng' })}
            </div>
            {field('street', 'Số nhà, tên đường *', { autoComplete: 'street-address', placeholder: '268 Lý Thường Kiệt' })}
            <label className="field" htmlFor="co-note">
              <span>Ghi chú cho shop (không bắt buộc)</span>
              <textarea id="co-note" name="note" rows="3" maxLength={500} className="input" value={form.note} onChange={onChange}
                        placeholder="Ví dụ: gọi trước khi giao, cần lắp đặt tận nơi..." />
            </label>
            <label className="check-option">
              <input type="checkbox" name="saveAddress" checked={form.saveAddress} onChange={onChange} />
              <span>Lưu địa chỉ này cho lần mua sau</span>
            </label>
          </section>

          <section className="panel" aria-labelledby="co-step3">
            <h2 id="co-step3"><span className="step-badge">3</span> Thanh toán</h2>
            <div className="pay-options" role="radiogroup" aria-labelledby="co-step3">
              {PAYMENTS.map((p) => (
                <label key={p.value} className={`pay-option ${form.paymentMethod === p.value ? 'selected' : ''}`}>
                  <input type="radio" name="paymentMethod" value={p.value} checked={form.paymentMethod === p.value} onChange={onChange} />
                  <span className="pay-icon"><Icon name={p.icon} size={22} /></span>
                  <span><b>{p.title}</b><small>{p.desc}</small></span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="checkout-summary panel" aria-label="Tóm tắt đơn hàng">
          <div className="summary-head">
            <h2>Đơn hàng <small>({items.reduce((n, i) => n + i.qty, 0)} sản phẩm)</small></h2>
            <Link to="/cart" className="link-btn">Sửa giỏ hàng</Link>
          </div>
          <ul className="summary-items">
            {items.map((i) => (
              <li key={i.id} className="summary-item">
                <Link to={`/products/${i.slug}`} className="summary-thumb" tabIndex={-1} aria-hidden="true">
                  <ProductImage src={i.thumbnailUrl} alt="" categoryName={i.categoryName} iconSize={22} />
                </Link>
                <div className="summary-info">
                  <Link to={`/products/${i.slug}`} className="summary-name">{i.name}</Link>
                  <small className="muted">{formatCurrency(i.effectivePrice)} / cái</small>
                  <div className="summary-row">
                    <div className="qty-stepper qty-sm" role="group" aria-label={`Số lượng ${i.name}`}>
                      <button type="button" onClick={() => updateQty(i.id, i.qty - 1)} disabled={i.qty <= 1} aria-label="Giảm 1">−</button>
                      <input type="number" min="1" max={i.stock} value={i.qty} aria-label="Số lượng"
                             onChange={(e) => updateQty(i.id, Number(e.target.value) || 1)} />
                      <button type="button" onClick={() => updateQty(i.id, i.qty + 1)} disabled={i.qty >= i.stock} aria-label="Tăng 1">+</button>
                    </div>
                    <b className="summary-line">{formatCurrency(Number(i.effectivePrice) * i.qty)}</b>
                  </div>
                  {i.qty >= i.stock && <small className="summary-stock">Chỉ còn {i.stock} sản phẩm</small>}
                </div>
                <button type="button" className="summary-remove" onClick={() => toggleSelect(i.id, false)}
                        aria-label={`Bỏ ${i.name} khỏi đơn này`} title="Bỏ khỏi đơn này (vẫn giữ trong giỏ hàng)">
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <VoucherBox items={items} applied={voucher} onChange={setVoucher} />
          <dl className="summary-totals">
            <div><dt>Tạm tính</dt><dd>{formatCurrency(subtotal)}</dd></div>
            {discount > 0 && (
              <div className="summary-discount"><dt>Giảm giá ({voucher.code})</dt><dd>-{formatCurrency(discount)}</dd></div>
            )}
            <div><dt>Phí giao hàng</dt><dd>{shipping === 0 ? 'Miễn phí' : formatCurrency(shipping)}</dd></div>
            <div className="summary-total"><dt>Tổng cộng</dt><dd>{formatCurrency(total)}</dd></div>
          </dl>
          {shipping > 0 && (
            <p className="summary-ship"><Icon name="truck" size={16} /><span>Mua thêm <b>{formatCurrency(FREE_SHIPPING_FROM - subtotal)}</b> để được miễn phí giao hàng.</span></p>
          )}
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting || syncing}>
            {submitting ? 'Đang đặt hàng...' : syncing ? 'Đang cập nhật giá...' : `Đặt hàng · ${formatCurrency(total)}`}
          </button>
          <p className="muted small center">Email xác nhận sẽ được gửi tới <b>{form.receiverEmail || 'email của bạn'}</b>.</p>
        </aside>
      </form>
    </div>
  );
}
