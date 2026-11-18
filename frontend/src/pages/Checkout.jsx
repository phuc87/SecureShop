import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import orderApi from '../api/orderApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import useCartSync from '../hooks/useCartSync';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/common/ProductImage';
import CartNotices from '../components/common/CartNotices';
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
  if (!f.district.trim()) e.district = 'Vui lòng nhập Quận / Huyện';
  if (!f.ward.trim()) e.ward = 'Vui lòng nhập Phường / Xã';
  if (!f.street.trim()) e.street = 'Vui lòng nhập số nhà, tên đường';
  return e;
}

export default function Checkout() {
  const { user } = useAuth();
  const { available: items, hasUnavailable, subtotal, removeItems } = useCart();
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

  // Điền sẵn địa chỉ đã lưu lần trước
  useEffect(() => {
    orderApi.defaultAddress()
      .then((res) => { if (res.address) setForm((f) => ({ ...f, ...res.address })); })
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState title="Giỏ hàng đang trống">
          <span>{hasUnavailable ? 'Các sản phẩm trong giỏ đã hết hàng hoặc ngừng bán.' : 'Hãy chọn sản phẩm trước khi thanh toán.'}</span>
          <Link to="/products" className="btn btn-primary">Xem sản phẩm</Link>
        </EmptyState>
      </div>
    );
  }

  const shipping = shippingFeeFor(subtotal);
  const total = subtotal + shipping;

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
      const order = await orderApi.checkout({ ...form, items: items.map((i) => ({ productId: i.id, quantity: i.qty })) });
      removeItems(items.map((i) => i.id)); // giữ lại món hết hàng/ngừng bán để khách tự xem
      toast.success(`Đặt hàng thành công! Mã đơn ${order.orderCode}`);
      navigate(`/account/orders/${order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (err) {
      setServerError(err.message);
      setErrors(err.errors || {});
      setSubmitting(false);
      if (err.status === 400 || err.status === 409) resync(); // có thể vừa hết hàng / đổi giá -> cập nhật giỏ
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const field = (name, label, props = {}) => (
    <label className="field" htmlFor={`co-${name}`}>
      <span>{label}</span>
      <input id={`co-${name}`} name={name} className={`input ${errors[name] ? 'input-error' : ''}`}
             value={form[name]} onChange={onChange} aria-invalid={!!errors[name]} {...props} />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </label>
  );

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/cart">Giỏ hàng</Link><span>/</span><span aria-current="page">Thanh toán</span>
      </nav>
      <h1>Thanh toán</h1>
      <CartNotices notices={notices} onDismiss={dismiss} />
      {hasUnavailable && (
        <div className="alert alert-info">Một số sản phẩm trong giỏ đã hết hàng hoặc ngừng bán nên không có trong đơn này. <Link to="/cart">Xem giỏ hàng</Link></div>
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
            <h2 id="co-step2"><span className="step-badge">2</span> Địa chỉ giao hàng</h2>
            <div className="form-grid cols-3">
              {field('province', 'Tỉnh / Thành phố *', { autoComplete: 'address-level1', placeholder: 'TP. Hồ Chí Minh' })}
              {field('district', 'Quận / Huyện *', { autoComplete: 'address-level2', placeholder: 'Quận 10' })}
              {field('ward', 'Phường / Xã *', { autoComplete: 'address-level3', placeholder: 'Phường 12' })}
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
          <h2>Đơn hàng ({items.reduce((n, i) => n + i.qty, 0)} sản phẩm)</h2>
          <ul className="summary-items">
            {items.map((i) => (
              <li key={i.id}>
                <span className="summary-thumb">
                  <ProductImage src={i.thumbnailUrl} alt="" categoryName={i.categoryName} iconSize={22} />
                  <span className="summary-qty">{i.qty}</span>
                </span>
                <span className="summary-name">{i.name}</span>
                <b>{formatCurrency(Number(i.effectivePrice) * i.qty)}</b>
              </li>
            ))}
          </ul>
          <dl className="summary-totals">
            <div><dt>Tạm tính</dt><dd>{formatCurrency(subtotal)}</dd></div>
            <div><dt>Phí giao hàng</dt><dd>{shipping === 0 ? 'Miễn phí' : formatCurrency(shipping)}</dd></div>
            <div className="summary-total"><dt>Tổng cộng</dt><dd>{formatCurrency(total)}</dd></div>
          </dl>
          {shipping > 0 && <p className="muted small">Mua thêm {formatCurrency(FREE_SHIPPING_FROM - subtotal)} để được miễn phí giao hàng.</p>}
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting || syncing}>
            {submitting ? 'Đang đặt hàng...' : syncing ? 'Đang cập nhật giá...' : `Đặt hàng · ${formatCurrency(total)}`}
          </button>
          <p className="muted small center">Email xác nhận sẽ được gửi tới <b>{form.receiverEmail || 'email của bạn'}</b>.</p>
        </aside>
      </form>
    </div>
  );
}
