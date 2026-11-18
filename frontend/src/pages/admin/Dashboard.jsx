import { useState } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import OrdersChart from '../../components/admin/OrdersChart';
import Icon from '../../components/common/Icon';
import { ErrorState, Spinner } from '../../components/common/StateViews';
import { formatCurrency } from '../../utils/format';
import { ORDER_STATUS, StatusChip, formatDateTime } from '../../utils/orderStatus';

export default function Dashboard() {
  const toast = useToast();
  const { data: d, loading, error, reload } = useFetch(() => adminApi.dashboard(), []);
  const [testing, setTesting] = useState(false);

  if (loading && !d) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const pending = d.ordersByStatus.PENDING || 0;
  const todo = [
    pending > 0 && { to: '/admin/orders?status=PENDING', icon: 'bag', text: `${pending} đơn hàng chờ xác nhận` },
    d.unreadChats > 0 && { to: '/admin/inbox', icon: 'headset', text: `${d.unreadChats} tin nhắn tư vấn chưa đọc` },
    d.newContacts > 0 && { to: '/admin/contacts', icon: 'mail', text: `${d.newContacts} yêu cầu liên hệ chưa xử lý` },
    d.lowStock.length > 0 && { to: '/admin/products?stock=low', icon: 'tag', text: `${d.lowStock.length} sản phẩm sắp hết hàng` },
  ].filter(Boolean);

  const maxStatus = Math.max(1, ...Object.keys(ORDER_STATUS).map((k) => d.ordersByStatus[k] || 0));

  const testEmail = async () => {
    setTesting(true);
    try {
      const r = await adminApi.testEmail();
      toast.success(`Đã gửi email thử tới ${r.sentTo}. Hãy kiểm tra hộp thư (cả mục Spam).`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tổng quan</h1>
          <p className="muted">Số liệu cập nhật lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={reload}>Làm mới</button>
      </div>

      <div className="stat-grid dash-stats">
        <div className="stat-card"><span>Doanh thu tháng này</span><b>{formatCurrency(d.revenueThisMonth)}</b><small className="muted">đơn đã hoàn thành</small></div>
        <div className="stat-card"><span>Tổng doanh thu</span><b>{formatCurrency(d.revenueCompleted)}</b><small className="muted">tất cả đơn hoàn thành</small></div>
        <Link to="/admin/orders" className="stat-card stat-link"><span>Đơn hôm nay</span><b>{d.ordersToday}</b><small className="muted">{d.ordersByStatus.ALL} đơn tất cả</small></Link>
        <Link to="/admin/orders?status=PENDING" className={`stat-card stat-link ${pending ? 'stat-alert' : ''}`}>
          <span>Chờ xác nhận</span><b>{pending}</b><small className="muted">{pending ? 'cần gọi xác nhận' : 'không có đơn chờ'}</small>
        </Link>
        <Link to="/admin/users" className="stat-card stat-link"><span>Khách hàng</span><b>{d.customers}</b><small className="muted">tài khoản đã đăng ký</small></Link>
        <Link to="/admin/products" className="stat-card stat-link"><span>Sản phẩm đang bán</span><b>{d.productsActive}</b><small className="muted">{d.productsHidden} đang ẩn</small></Link>
      </div>

      {todo.length > 0 && (
        <div className="panel todo-panel">
          <h2>Việc cần làm</h2>
          <ul className="todo-list">
            {todo.map((t) => (
              <li key={t.to}><Link to={t.to}><Icon name={t.icon} size={18} /> {t.text} <Icon name="arrowRight" size={16} /></Link></li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <h2>Giá trị đơn hàng 14 ngày qua</h2>
        <OrdersChart daily={d.daily} />
      </div>

      <div className="dash-grid">
        <div className="panel">
          <div className="section-row">
            <h2>Đơn hàng mới nhất</h2>
            <Link to="/admin/orders" className="small">Xem tất cả →</Link>
          </div>
          <ul className="recent-orders">
            {d.recentOrders.map((o) => (
              <li key={o.id}>
                <Link to={`/admin/orders/${o.id}`}>
                  <span className="cell-stack"><b>{o.orderCode}</b><small className="muted">{o.receiverName} · {formatDateTime(o.createdAt)}</small></span>
                  <span className="cell-stack ro-right"><b>{formatCurrency(o.total)}</b><StatusChip status={o.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="dash-side">
          <div className="panel">
            <h2>Đơn theo trạng thái</h2>
            <ul className="status-bars">
              {Object.keys(ORDER_STATUS).map((k) => {
                const n = d.ordersByStatus[k] || 0;
                return (
                  <li key={k}>
                    <Link to={`/admin/orders?status=${k}`}>
                      <StatusChip status={k} />
                      <span className="sb-track" aria-hidden="true"><span style={{ width: n ? `${Math.max((n / maxStatus) * 100, 3)}%` : 0 }} /></span>
                      <b>{n}</b>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="panel">
            <h2>Sắp hết hàng <small className="muted">(≤ 5)</small></h2>
            {d.lowStock.length === 0 ? <p className="muted small">Không có sản phẩm nào sắp hết.</p> : (
              <ul className="low-stock">
                {d.lowStock.map((p) => (
                  <li key={p.id}>
                    <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                    <span className={`chip ${p.stock === 0 ? 'chip-red' : 'chip-orange'}`}>còn {p.stock}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`panel mail-panel ${d.mail.configured ? '' : 'mail-off'}`}>
            <h2>Email đơn hàng</h2>
            {d.mail.configured ? (
              <>
                <p className="small">Gửi từ <b className="cell-break">{d.mail.sender}</b>. Thông báo đơn mới gửi tới <b className="cell-break">{d.mail.notifyTo}</b>.</p>
                <button type="button" className="btn btn-outline btn-sm" onClick={testEmail} disabled={testing}>
                  {testing ? 'Đang gửi...' : 'Gửi email thử'}
                </button>
              </>
            ) : (
              <>
                <p className="small"><b>Chưa cấu hình Gmail</b>: đơn vẫn đặt được nhưng chưa gửi email. Cách bật:</p>
                <ol className="small setup-steps">
                  <li>Bật xác minh 2 bước cho Gmail, tạo <b>App Password</b> tại myaccount.google.com/apppasswords.</li>
                  <li>Trong thư mục <code>backend</code>, copy <code>secrets.properties.example</code> thành <code>secrets.properties</code>, điền Gmail và App Password.</li>
                  <li>Đóng cửa sổ backend, nhấp đúp <code>start-backend.bat</code>, rồi bấm "Gửi email thử" ở đây.</li>
                </ol>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
