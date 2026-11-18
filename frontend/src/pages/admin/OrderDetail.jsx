import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Icon from '../../components/common/Icon';
import { ErrorState, Spinner } from '../../components/common/StateViews';
import { OrderHistory, OrderItems, OrderProgress } from '../../components/order/OrderParts';
import { NEXT_ACTION, PAYMENT_METHOD, PaymentChip, StatusChip, formatDateTime, statusLabel } from '../../utils/orderStatus';
import { formatCurrency } from '../../utils/format';

const TEMPLATE_LABEL = {
  'order-confirmation': 'Xác nhận đơn (gửi khách)',
  'new-order-admin': 'Báo đơn mới (gửi shop)',
  'order-status-changed': 'Cập nhật trạng thái (gửi khách)',
};

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const { loading, error, reload } = useFetch(() => adminApi.order(id).then((o) => { setOrder(o); return o; }), [id]);
  const [action, setAction] = useState(null); // { kind: 'status', status } | { kind: 'paid' }
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(null); // 'confirmation' | 'status' đang gửi lại

  /** Gửi lại email cho khách (khi lần trước lỗi, hoặc khách báo không nhận được). */
  const resend = async (type) => {
    setResending(type);
    try {
      const res = await adminApi.resendOrderEmail(order.id, type);
      setOrder(res);
      const latest = res.emails?.[res.emails.length - 1]; // nhật ký xếp cũ -> mới
      if (latest?.status === 'SENT') toast.success(`Đã gửi lại email tới ${latest.toEmail}`);
      else toast.error(`Gửi lại chưa được: ${latest?.errorMessage || 'lỗi không rõ'}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(null);
    }
  };
  const RESEND_TYPE = { 'order-confirmation': 'confirmation', 'order-status-changed': 'status' };

  if (loading && !order) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!order) return null;

  const open = (a) => { setNote(''); setAction(a); };
  const run = async () => {
    setBusy(true);
    try {
      const res = action.kind === 'paid'
        ? await adminApi.markOrderPaid(order.id)
        : await adminApi.updateOrderStatus(order.id, action.status, note.trim() || null);
      setOrder(res);
      toast.success(action.kind === 'paid' ? 'Đã xác nhận nhận tiền' : `Đơn chuyển sang "${statusLabel(action.status)}". Đã gửi email cho khách.`);
      setAction(null);
      window.dispatchEvent(new Event('orders:changed')); // cập nhật số đơn chờ trên menu
      setTimeout(() => adminApi.order(order.id).then(setOrder).catch(() => {}), 2500); // tải lại nhật ký email
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isCancel = action?.kind === 'status' && action.status === 'CANCELLED';
  const canMarkPaid = order.paymentStatus === 'UNPAID' && order.paymentMethod !== 'COD' && order.status !== 'CANCELLED';

  return (
    <div className="order-detail">
      <Link to="/admin/orders" className="back-link"><Icon name="arrowLeft" size={16} /> Danh sách đơn hàng</Link>

      <div className="panel">
        <div className="od-head">
          <div>
            <h1 className="panel-title">Đơn {order.orderCode}</h1>
            <span className="muted small">Đặt lúc {formatDateTime(order.createdAt)}{order.customerName && ` · Tài khoản: ${order.customerName}`}</span>
          </div>
          <StatusChip status={order.status} />
        </div>
        <OrderProgress order={order} />
        {(order.nextStatuses.length > 0 || canMarkPaid) && (
          <div className="od-actions">
            {['CONFIRMED', 'SHIPPING', 'COMPLETED'].filter((s) => order.nextStatuses.includes(s)).map((s) => (
              <button key={s} type="button" className={`btn ${NEXT_ACTION[s].className}`} onClick={() => open({ kind: 'status', status: s })}>
                {NEXT_ACTION[s].label}
              </button>
            ))}
            {canMarkPaid && <button type="button" className="btn btn-outline" onClick={() => open({ kind: 'paid' })}>Xác nhận đã nhận tiền</button>}
            {order.nextStatuses.includes('CANCELLED') && (
              <button type="button" className="btn btn-outline-danger" onClick={() => open({ kind: 'status', status: 'CANCELLED' })}>Huỷ đơn</button>
            )}
          </div>
        )}
      </div>

      <div className="od-grid">
        <div className="od-main">
          <div className="panel">
            <h2>Sản phẩm</h2>
            <OrderItems order={order} />
          </div>
          <div className="panel">
            <h2>Lịch sử xử lý</h2>
            <OrderHistory history={order.history} showActor />
          </div>
        </div>
        <div className="od-side">
          <div className="panel">
            <h2>Khách hàng</h2>
            <dl className="info-dl">
              <div><dt>Người nhận</dt><dd><b>{order.receiverName}</b></dd></div>
              <div><dt>Điện thoại</dt><dd><a href={`tel:${order.receiverPhone}`}>{order.receiverPhone}</a></dd></div>
              <div><dt>Email</dt><dd className="cell-break"><a href={`mailto:${order.receiverEmail}`}>{order.receiverEmail}</a></dd></div>
              <div><dt>Địa chỉ</dt><dd>{order.shippingAddress}</dd></div>
              {order.note && <div><dt>Ghi chú</dt><dd className="note-hl">{order.note}</dd></div>}
            </dl>
          </div>
          <div className="panel">
            <h2>Thanh toán</h2>
            <dl className="info-dl">
              <div><dt>Hình thức</dt><dd>{PAYMENT_METHOD[order.paymentMethod]}</dd></div>
              <div><dt>Trạng thái</dt><dd><PaymentChip status={order.paymentStatus} /></dd></div>
              <div><dt>Số tiền</dt><dd><b className="text-sale">{formatCurrency(order.total)}</b></dd></div>
            </dl>
          </div>
          <div className="panel">
            <h2>Email đã gửi</h2>
            {(!order.emails || order.emails.length === 0) && <p className="muted small">Chưa có email nào.</p>}
            <ul className="email-log">
              {order.emails?.map((e) => (
                <li key={e.id}>
                  <span className={`chip ${e.status === 'SENT' ? 'chip-green' : e.status === 'FAILED' ? 'chip-red' : ''}`}>
                    {e.status === 'SENT' ? 'Đã gửi' : e.status === 'FAILED' ? 'Lỗi' : 'Đang gửi'}
                  </span>
                  <span>
                    <b>{TEMPLATE_LABEL[e.template] || e.template}</b>
                    <small className="muted cell-break">{e.toEmail} · {formatDateTime(e.sentAt || e.createdAt)}</small>
                    {e.errorMessage && <small className="text-danger">{e.errorMessage}</small>}
                    {e.status === 'FAILED' && RESEND_TYPE[e.template] && (
                      <button type="button" className="link-btn email-resend" disabled={!!resending}
                              onClick={() => resend(RESEND_TYPE[e.template])}>
                        {resending === RESEND_TYPE[e.template] ? 'Đang gửi lại...' : '↻ Gửi lại email này'}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="email-actions">
              <button type="button" className="btn btn-sm btn-outline" disabled={!!resending} onClick={() => resend('confirmation')}>
                {resending === 'confirmation' ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
              </button>
              {order.status !== 'PENDING' && (
                <button type="button" className="btn btn-sm btn-outline" disabled={!!resending} onClick={() => resend('status')}>
                  {resending === 'status' ? 'Đang gửi...' : 'Gửi lại email trạng thái'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!action}
        title={action?.kind === 'paid' ? 'Xác nhận đã nhận tiền?' : isCancel ? `Huỷ đơn ${order.orderCode}?` : `Chuyển sang "${statusLabel(action?.status)}"?`}
        message={action?.kind === 'paid'
          ? `Xác nhận đã nhận ${formatCurrency(order.total)} với nội dung chuyển khoản ${order.orderCode}.`
          : isCancel ? 'Sản phẩm sẽ được trả lại kho, khách nhận email kèm lý do huỷ.'
            : 'Khách sẽ nhận email thông báo trạng thái mới.'}
        confirmLabel={action?.kind === 'paid' ? 'Đã nhận tiền' : isCancel ? 'Huỷ đơn' : NEXT_ACTION[action?.status]?.label}
        cancelLabel="Đóng" danger={isCancel} busy={busy} confirmDisabled={isCancel && !note.trim()}
        onConfirm={run} onCancel={() => setAction(null)}>
        {action?.kind === 'status' && (
          <label className="field" htmlFor="status-note">
            <span>{isCancel ? 'Lý do huỷ (bắt buộc, khách sẽ đọc được)' : 'Ghi chú (không bắt buộc)'}</span>
            <textarea id="status-note" className="input" rows="3" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder={isCancel ? 'Ví dụ: khách yêu cầu huỷ qua điện thoại' : action.status === 'SHIPPING' ? 'Ví dụ: GHN - mã vận đơn 12345' : ''} />
          </label>
        )}
      </ConfirmDialog>
    </div>
  );
}
