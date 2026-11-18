import { useEffect, useRef, useState } from 'react';
import orderApi from '../../api/orderApi';
import Icon from '../common/Icon';
import { formatCurrency } from '../../utils/format';

/**
 * Ô nhập mã giảm giá ở trang thanh toán. Mã do admin tạo, KHÔNG liệt kê công khai:
 * khách "săn" được mã ở đâu thì tự nhập vào đây.
 * Số tiền giảm luôn do SERVER tính (từ giá trong DB). onChange(quote | null).
 */
export default function VoucherBox({ items, applied, onChange }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const appliedRef = useRef(applied);
  appliedRef.current = applied;

  const payloadItems = items.map((i) => ({ productId: i.id, quantity: i.qty }));
  const cartKey = payloadItems.map((i) => `${i.productId}x${i.quantity}`).join(',');

  // Giỏ hàng đổi (số lượng, giá) -> tính lại mã đang áp; không còn hợp lệ thì gỡ và báo lý do
  useEffect(() => {
    const current = appliedRef.current;
    if (!current || !payloadItems.length) return;
    orderApi.voucherQuote(current.code, payloadItems)
      .then((q) => onChange(q))
      .catch((err) => { onChange(null); setError(err.message); });
  }, [cartKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = async () => {
    const value = code.trim().toUpperCase();
    if (!value) { setError('Vui lòng nhập mã giảm giá'); return; }
    setBusy(true);
    setError('');
    try {
      const quote = await orderApi.voucherQuote(value, payloadItems);
      onChange(quote);
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => { onChange(null); setError(''); };

  return (
    <div className="voucher-box">
      <label className="voucher-head" htmlFor="voucher-code"><Icon name="tag" size={18} /> <b>Mã giảm giá</b></label>

      {applied ? (
        <div className="voucher-applied" role="status">
          <Icon name="checkCircle" size={20} />
          <span>
            <b>{applied.code}</b>
            <small>{applied.description}</small>
          </span>
          <b className="voucher-minus">-{formatCurrency(applied.discount)}</b>
          <button type="button" className="link-btn" onClick={remove}>Bỏ mã</button>
        </div>
      ) : (
        // Không dùng <form>: ô này nằm trong form thanh toán (HTML không cho form lồng nhau)
        <div className="voucher-form">
          <input id="voucher-code" className={`input ${error ? 'input-error' : ''}`} placeholder="Nhập mã của bạn"
                 value={code} maxLength={30} autoComplete="off"
                 onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }} />
          <button type="button" className="btn btn-outline" disabled={busy || !code.trim()} onClick={() => apply()}>
            {busy ? 'Đang kiểm tra...' : 'Áp dụng'}
          </button>
        </div>
      )}
      {error && <p className="field-error voucher-error" role="alert">{error}</p>}
      {!applied && !error && <small className="voucher-hint">Có mã khuyến mãi? Nhập vào đây để được giảm giá.</small>}

    </div>
  );
}
