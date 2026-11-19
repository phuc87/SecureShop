import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import { useChatSocket } from '../../context/ChatSocketContext';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import ProductImage from '../../components/common/ProductImage';
import Stars from '../../components/common/Stars';
import Icon from '../../components/common/Icon';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';

const FILTERS = [
  { value: 'unseen', label: 'Chưa xem' },
  { value: 'low', label: 'Tiêu cực (1–2★)' },
  { value: 'all', label: 'Tất cả' },
];

const timeText = (iso) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

/** Quản lý đánh giá: đánh giá mới hiện ở mục "Chưa xem", tự cập nhật khi khách vừa gửi đánh giá. */
export default function Reviews() {
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') || 'unseen';
  const rating = params.get('rating') || '';
  const page = Number(params.get('page') || 0);
  const { addListener } = useChatSocket();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v === '' || v == null) next.delete(k); else next.set(k, v);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };
  const reload = () => setReloadKey((k) => k + 1);
  const changed = () => window.dispatchEvent(new Event('reviews:changed')); // cập nhật số đỏ trên menu

  useEffect(() => {
    let cancelled = false;
    setError('');
    adminApi.reviews({ filter, rating: rating || undefined, page, size: 10 })
      .then((r) => { if (!cancelled) setData(r); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [filter, rating, page, reloadKey]);

  // Khách vừa gửi đánh giá -> tải lại danh sách
  useEffect(() => addListener((ev) => { if (ev.type === 'REVIEW') reload(); }), [addListener]);

  const markSeen = async (r) => {
    try {
      await adminApi.markReviewSeen(r.id);
      changed();
      if (filter === 'unseen') reload();
      else setData((d) => ({ ...d, content: d.content.map((x) => (x.id === r.id ? { ...x, adminSeen: true } : x)) }));
    } catch (err) { toast.error(err.message); }
  };

  const markAll = async () => {
    try {
      const { updated } = await adminApi.markAllReviewsSeen();
      toast.success(updated ? `Đã đánh dấu ${updated} đánh giá là đã xem` : 'Không còn đánh giá nào chưa xem');
      changed();
      reload();
    } catch (err) { toast.error(err.message); }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await adminApi.deleteReview(toDelete.id);
      toast.success('Đã xoá đánh giá');
      setToDelete(null);
      changed();
      reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const hasUnseen = data?.content.some((r) => !r.adminSeen);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Đánh giá sản phẩm</h1>
          <p className="muted">Đánh giá mới của khách sẽ báo ngay ở menu bên trái. Đánh giá xấu (1–2★) được tô đỏ để xử lý trước.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={markAll} disabled={filter === 'unseen' && !hasUnseen}>
          <Icon name="checkCircle" size={16} /> Đánh dấu tất cả đã xem
        </button>
      </div>

      <div className="rv-toolbar">
        <div className="tabs" role="tablist" aria-label="Lọc đánh giá">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" role="tab" aria-selected={filter === f.value}
                    className={filter === f.value ? 'active' : ''} onClick={() => setParam('filter', f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="rv-rating">
          <span className="sr-only">Lọc theo số sao</span>
          <select className="input" value={rating} onChange={(e) => setParam('rating', e.target.value)}>
            <option value="">Mọi số sao</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
          </select>
        </label>
      </div>

      {!data && !error && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.content.length === 0 && (
        <EmptyState title={filter === 'unseen' ? 'Không có đánh giá mới' : 'Chưa có đánh giá nào'}>
          {filter === 'unseen' && <span>Bạn đã xem hết đánh giá của khách.</span>}
        </EmptyState>
      )}

      {data && data.content.length > 0 && (
        <ul className="rv-list">
          {data.content.map((r) => (
            <li key={r.id} className={`rv-item ${r.adminSeen ? '' : 'is-new'} ${r.rating <= 2 ? 'is-low' : ''}`}>
              <Link to={`/products/${r.productSlug}`} className="rv-thumb" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
                <ProductImage src={r.productThumbnail} alt="" iconSize={24} />
              </Link>
              <div className="rv-body">
                <div className="rv-top">
                  <Stars value={r.rating} size={16} />
                  {!r.adminSeen && <span className="rv-new">Mới</span>}
                  {r.rating <= 2 && <span className="rv-low">Cần xử lý</span>}
                  {r.updatedAt && <span className="rv-edited">Khách đã sửa</span>}
                  <time className="muted small">{timeText(r.createdAt)}</time>
                </div>
                <Link to={`/products/${r.productSlug}`} className="rv-product" target="_blank" rel="noreferrer">{r.productName}</Link>
                {r.comment ? <p className="rv-comment">“{r.comment}”</p> : <p className="rv-comment muted">(Khách không viết nhận xét)</p>}
                <small className="muted">
                  {r.customerName} · {r.customerEmail}{r.orderId && <> · <Link to={`/admin/orders/${r.orderId}`}>Đơn #{r.orderId}</Link></>}
                </small>
              </div>
              <div className="rv-actions">
                {!r.adminSeen && (
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => markSeen(r)}>
                    <Icon name="checkCircle" size={15} /> Đã xem
                  </button>
                )}
                <button type="button" className="trash-btn" onClick={() => setToDelete(r)}
                        aria-label={`Xoá đánh giá của ${r.customerName}`} title="Xoá đánh giá">
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setParam('page', p || '')} />}

      <ConfirmDialog open={!!toDelete} danger busy={busy} title="Xoá đánh giá này?"
                     message="Đánh giá sẽ bị xoá vĩnh viễn và không còn hiện ở trang sản phẩm. Chỉ nên xoá đánh giá spam hoặc ngôn từ không phù hợp."
                     confirmLabel="Xoá" cancelLabel="Giữ lại" onConfirm={doDelete} onCancel={() => setToDelete(null)} />
    </>
  );
}
