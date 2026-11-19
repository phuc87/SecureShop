import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import orderApi from '../../api/orderApi';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Icon from '../../components/common/Icon';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';
import { OrderHistory, OrderItems, OrderProgress } from '../../components/order/OrderParts';
import { PAYMENT_METHOD, PaymentChip, StatusChip, formatDateTime } from '../../utils/orderStatus';
import { formatCurrency } from '../../utils/format';
import { SHOP } from '../../utils/shopInfo';

export default function MyOrderDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const { loading, error, reload } = useFetch(() => orderApi.myOrder(id).then((o) => { setOrder(o); return o; }), [id]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(null); // [productId] đã đánh giá (chỉ khi đơn hoàn thành)

  const completed = order?.status === 'COMPLETED';
  useEffect(() => {
    if (!completed) return;
    let alive = true;
    orderApi.reviewedProducts(id).then((ids) => alive && setReviewed(ids)).catch(() => alive && setReviewed([]));
    return () => { alive = false; };
  }, [id, completed]);

  const reviewAction = (it) => {
    if (!completed || !reviewed || !it.productSlug) return null;
    return reviewed.includes(it.productId)
      ? <Link to={`/products/${it.productSlug}#reviews`} className="oi-review done"><Icon name="checkCircle" size={14} /> Đã đánh giá · Sửa</Link>
      : <Link to={`/products/${it.productSlug}#reviews`} className="oi-review"><Icon name="star" size={14} /> Viết đánh giá</Link>;
  };

  if (loading && !order) return <Spinner />;
  if (error) {
    return error.includes('Không tìm thấy')
      ? <EmptyState title="Không tìm thấy đơn hàng"><Link to="/account/orders" className="btn btn-primary">Đơn hàng của tôi</Link></EmptyState>
      : <ErrorState message={error} onRetry={reload} />;
  }
  if (!order) return null;

  const doCancel = async () => {
    setBusy(true);
    try {
      setOrder(await orderApi.cancel(order.id, reason.trim() || null));
      toast.success('Đã huỷ đơn hàng');
      setCancelOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const needTransfer = order.paymentMethod === 'BANK_TRANSFER' && order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED';

  return (
    <div className="order-detail">
      <Link to="/account/orders" className="back-link"><Icon name="arrowLeft" size={16} /> Đơn hàng của tôi</Link>

      {state?.justPlaced && (
        <div className="order-success" role="status">
          <Icon name="checkCircle" size={36} />
          <div>
            <b>Đặt hàng thành công!</b>
            <span>Mã đơn <b>{order.orderCode}</b>. Email xác nhận đã được gửi tới <b>{order.receiverEmail}</b>.
              Tư vấn viên sẽ gọi xác nhận trong giờ làm việc.</span>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="od-head">
          <div>
            <h1 className="panel-title">Đơn {order.orderCode}</h1>
            <span className="muted small">Đặt lúc {formatDateTime(order.createdAt)}</span>
          </div>
          <StatusChip status={order.status} />
        </div>
        <OrderProgress order={order} />
      </div>

      {needTransfer && (
        <div className="panel transfer-box">
          <h2>Thông tin chuyển khoản</h2>
          <dl>
            <div><dt>Ngân hàng</dt><dd>{SHOP.bank.name}</dd></div>
            <div><dt>Số tài khoản</dt><dd><b>{SHOP.bank.account}</b></dd></div>
            <div><dt>Chủ tài khoản</dt><dd>{SHOP.bank.holder}</dd></div>
            <div><dt>Số tiền</dt><dd><b className="text-sale">{formatCurrency(order.total)}</b></dd></div>
            <div><dt>Nội dung</dt><dd><b>{order.orderCode}</b></dd></div>
          </dl>
          <p className="muted small">Đơn được xác nhận sau khi shop nhận được tiền. Vui lòng ghi đúng nội dung chuyển khoản.</p>
        </div>
      )}

      <div className="od-grid">
        <div className="panel">
          <h2>Sản phẩm</h2>
          <OrderItems order={order} renderAction={reviewAction} />
          {completed && reviewed && order.items.some((it) => it.productSlug && !reviewed.includes(it.productId)) && (
            <p className="muted small od-review-hint">Đơn đã giao thành công. Hãy đánh giá sản phẩm để giúp khách khác chọn mua nhé!</p>
          )}
        </div>
        <div className="od-side">
          <div className="panel">
            <h2>Giao hàng & thanh toán</h2>
            <dl className="info-dl">
              <div><dt>Người nhận</dt><dd>{order.receiverName} · {order.receiverPhone}</dd></div>
              <div><dt>Địa chỉ</dt><dd>{order.shippingAddress}</dd></div>
              {order.note && <div><dt>Ghi chú</dt><dd>{order.note}</dd></div>}
              <div><dt>Thanh toán</dt><dd>{PAYMENT_METHOD[order.paymentMethod]}</dd></div>
              <div><dt>Trạng thái</dt><dd><PaymentChip status={order.paymentStatus} /></dd></div>
            </dl>
          </div>
          <div className="panel">
            <h2>Lịch sử đơn hàng</h2>
            <OrderHistory history={order.history} />
          </div>
          {order.status === 'PENDING' && (
            <button type="button" className="btn btn-outline-danger btn-block" onClick={() => setCancelOpen(true)}>Huỷ đơn hàng</button>
          )}
        </div>
      </div>

      <ConfirmDialog open={cancelOpen} title={`Huỷ đơn ${order.orderCode}?`} danger busy={busy}
                     message="Sản phẩm sẽ được trả lại kho. Bạn sẽ nhận email xác nhận huỷ đơn."
                     confirmLabel="Huỷ đơn hàng" cancelLabel="Không huỷ" onConfirm={doCancel} onCancel={() => setCancelOpen(false)}>
        <label className="field" htmlFor="cancel-reason">
          <span>Lý do huỷ (không bắt buộc)</span>
          <textarea id="cancel-reason" className="input" rows="3" maxLength={500} value={reason}
                    onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: đặt nhầm sản phẩm" />
        </label>
      </ConfirmDialog>
    </div>
  );
}
