import { useState } from 'react';
import { Link } from 'react-router-dom';
import orderApi from '../../api/orderApi';
import useFetch from '../../hooks/useFetch';
import ProductImage from '../../components/common/ProductImage';
import Pagination from '../../components/common/Pagination';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';
import { formatCurrency } from '../../utils/format';
import { StatusChip, formatDateTime } from '../../utils/orderStatus';

export default function MyOrders() {
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useFetch(() => orderApi.myOrders(page, 8), [page]);

  return (
    <div className="panel">
      <h1 className="panel-title">Đơn hàng của tôi</h1>
      {loading && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.content.length === 0 && (
        <EmptyState title="Bạn chưa có đơn hàng nào">
          <Link to="/products" className="btn btn-primary">Mua sắm ngay</Link>
        </EmptyState>
      )}
      {data && data.content.length > 0 && (
        <>
          <ul className="my-orders">
            {data.content.map((o) => (
              <li key={o.id}>
                <Link to={`/account/orders/${o.id}`} className="my-order">
                  <span className="mo-thumb"><ProductImage src={o.firstItemThumbnail} alt="" iconSize={26} /></span>
                  <span className="mo-info">
                    <span className="mo-top">
                      <b>{o.orderCode}</b>
                      <StatusChip status={o.status} />
                    </span>
                    <span className="mo-items">{o.firstItemName}{o.itemCount > 1 && ` và ${o.itemCount - 1} sản phẩm khác`}</span>
                    <small className="muted">{formatDateTime(o.createdAt)}</small>
                  </span>
                  <b className="mo-total">{formatCurrency(o.total)}</b>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
