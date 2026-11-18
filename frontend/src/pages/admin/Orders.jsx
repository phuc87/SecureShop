import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import useFetch from '../../hooks/useFetch';
import Pagination from '../../components/common/Pagination';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';
import { formatCurrency } from '../../utils/format';
import { ORDER_STATUS, PaymentChip, StatusChip, formatDateTime } from '../../utils/orderStatus';

const TABS = [['', 'Tất cả', 'ALL'], ...Object.entries(ORDER_STATUS).map(([k, v]) => [k, v.label, k])];

export default function Orders() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Number(params.get('page') || 0);
  const [keywordInput, setKeywordInput] = useState(params.get('q') || '');
  const q = params.get('q') || '';

  // Gõ xong 300ms mới tìm
  useEffect(() => {
    const t = setTimeout(() => {
      if (keywordInput.trim() === q) return;
      const next = new URLSearchParams(params);
      if (keywordInput.trim()) next.set('q', keywordInput.trim()); else next.delete('q');
      next.delete('page');
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [keywordInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, reload } = useFetch(
    () => adminApi.orders({ status: status || undefined, q: q || undefined, page, size: 15 }), [status, q, page]);
  const { data: counts } = useFetch(() => adminApi.orderCounts(), [status, q, page]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === '' || value == null) next.delete(key); else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Đơn hàng</h1>
          <p className="muted">Gọi xác nhận với khách rồi cập nhật trạng thái. Mỗi lần đổi trạng thái, khách nhận được email.</p>
        </div>
      </div>

      <div className="tabs tabs-scroll" role="tablist" aria-label="Lọc theo trạng thái">
        {TABS.map(([value, label, countKey]) => (
          <button key={value} type="button" role="tab" aria-selected={status === value}
                  className={status === value ? 'active' : ''} onClick={() => setParam('status', value)}>
            {label}{counts && <span className="tab-count">{counts[countKey] ?? 0}</span>}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label htmlFor="order-search" className="sr-only">Tìm đơn hàng</label>
        <input id="order-search" type="search" className="input toolbar-search" placeholder="Tìm mã đơn, tên, SĐT, email khách"
               value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} />
      </div>

      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.content.length === 0 && <EmptyState title="Không có đơn hàng phù hợp" />}
      {data && data.content.length > 0 && (
        <div className="table-wrap table-stack-wrap">
          <table className="data-table table-stack clickable-rows">
            <thead>
              <tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {data.content.map((o) => (
                <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)}>
                  <td className="cell-title"><Link to={`/admin/orders/${o.id}`} onClick={(e) => e.stopPropagation()}>{o.orderCode}</Link></td>
                  <td data-label="Khách hàng"><span className="cell-stack"><b>{o.receiverName}</b><small className="muted">{o.receiverPhone}</small></span></td>
                  <td data-label="Ngày đặt">{formatDateTime(o.createdAt)}</td>
                  <td data-label="Tổng tiền"><b>{formatCurrency(o.total)}</b></td>
                  <td data-label="Thanh toán"><span className="cell-stack"><small>{o.paymentMethod === 'COD' ? 'COD' : 'Chuyển khoản'}</small><PaymentChip status={o.paymentStatus} /></span></td>
                  <td data-label="Trạng thái"><StatusChip status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setParam('page', p || '')} />}
    </>
  );
}
