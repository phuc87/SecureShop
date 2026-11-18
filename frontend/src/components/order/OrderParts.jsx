import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import ProductImage from '../common/ProductImage';
import { formatCurrency } from '../../utils/format';
import { ORDER_STEPS, formatDateTime, statusLabel } from '../../utils/orderStatus';

const STEP_ICON = { PENDING: 'inbox', CONFIRMED: 'checkCircle', SHIPPING: 'truck', COMPLETED: 'award' };

/** Thanh tiến trình 4 bước. Đơn huỷ hiện khung đỏ kèm lý do. */
export function OrderProgress({ order }) {
  if (order.status === 'CANCELLED') {
    return (
      <div className="order-cancelled" role="status">
        <Icon name="close" size={22} />
        <div>
          <b>Đơn hàng đã bị huỷ</b>
          {order.cancelReason && <span>{order.cancelReason}</span>}
        </div>
      </div>
    );
  }
  const current = ORDER_STEPS.indexOf(order.status);
  const timeOf = (s) => order.history?.filter((h) => h.toStatus === s).at(-1)?.createdAt;
  return (
    <ol className="order-progress" aria-label="Tiến trình đơn hàng">
      {ORDER_STEPS.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="op-dot"><Icon name={STEP_ICON[s]} size={18} /></span>
          <span className="op-label">{statusLabel(s)}</span>
          {i <= current && timeOf(s) && <time className="op-time">{formatDateTime(timeOf(s))}</time>}
        </li>
      ))}
    </ol>
  );
}

/** Danh sách sản phẩm trong đơn + tổng tiền. */
/** renderAction(item): nội dung thêm dưới mỗi sản phẩm (vd. nút "Đánh giá" khi đơn đã hoàn thành). */
export function OrderItems({ order, linkProducts = true, renderAction }) {
  return (
    <>
      <ul className="order-items">
        {order.items.map((it, idx) => (
          <li key={`${it.productSku}-${idx}`}>
            <span className="oi-thumb"><ProductImage src={it.productThumbnail} alt="" iconSize={26} /></span>
            <span className="oi-info">
              {linkProducts && it.productSlug
                ? <Link to={`/products/${it.productSlug}`}>{it.productName}</Link>
                : <b>{it.productName}</b>}
              <small className="muted">Mã: {it.productSku} · {formatCurrency(it.unitPrice)} × {it.quantity}</small>
              {renderAction?.(it)}
            </span>
            <b className="oi-total">{formatCurrency(it.lineTotal)}</b>
          </li>
        ))}
      </ul>
      <dl className="summary-totals">
        <div><dt>Tạm tính</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
        <div><dt>Phí giao hàng</dt><dd>{Number(order.shippingFee) === 0 ? 'Miễn phí' : formatCurrency(order.shippingFee)}</dd></div>
        <div className="summary-total"><dt>Tổng cộng</dt><dd>{formatCurrency(order.total)}</dd></div>
      </dl>
    </>
  );
}

/** Lịch sử trạng thái (mới nhất ở trên). showActor: hiện tên người thao tác (chỉ admin). */
export function OrderHistory({ history, showActor = false }) {
  return (
    <ol className="order-history">
      {[...history].reverse().map((h, i) => (
        <li key={i}>
          <time>{formatDateTime(h.createdAt)}</time>
          <div>
            <b>{h.fromStatus === h.toStatus ? 'Cập nhật thanh toán' : h.toLabel}</b>
            {h.note && <span>{h.note}</span>}
            {showActor && h.changedByName && <small className="muted">bởi {h.changedByName}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}
