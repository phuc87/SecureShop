import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import orderApi from '../../api/orderApi';
import adminApi from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import Stars from '../common/Stars';
import Pagination from '../common/Pagination';
import ConfirmDialog from '../common/ConfirmDialog';
import { Spinner } from '../common/StateViews';
import { formatDate } from '../../utils/format';

const RATING_TEXT = ['', 'Rất tệ', 'Chưa hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];

/** Form viết đánh giá: chỉ hiện khi khách đã mua và đơn đã hoàn thành. */
function ReviewForm({ productId, eligibility, onCreated }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Vui lòng chọn số sao'); return; }
    setSaving(true);
    setError('');
    try {
      await orderApi.createReview({ productId, orderId: eligibility.orderId, rating, comment: comment.trim() || null });
      toast.success('Cảm ơn bạn đã đánh giá!');
      onCreated();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const shown = hover || rating;
  return (
    <form className="review-form" onSubmit={submit} noValidate>
      <h3>Viết đánh giá của bạn</h3>
      <p className="muted small">Bạn đã mua sản phẩm này trong đơn <b>{eligibility.orderCode}</b>.</p>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <fieldset className="star-picker" onMouseLeave={() => setHover(0)}>
        <legend>Chấm điểm *</legend>
        <div className="star-picker-row">
          {[1, 2, 3, 4, 5].map((i) => (
            <label key={i} className={i <= shown ? 'on' : ''} onMouseEnter={() => setHover(i)}>
              <input type="radio" name="rating" value={i} className="sr-only" checked={rating === i}
                     onChange={() => { setRating(i); setError(''); }} />
              <Icon name="star" size={30} filled={i <= shown} />
              <span className="sr-only">{i} sao - {RATING_TEXT[i]}</span>
            </label>
          ))}
          <span className="star-picker-text" aria-hidden="true">{RATING_TEXT[shown] || 'Chọn số sao'}</span>
        </div>
      </fieldset>
      <label className="field" htmlFor="review-comment">
        <span>Nhận xét (không bắt buộc)</span>
        <textarea id="review-comment" className="input review-textarea" rows={4} maxLength={1000}
                  placeholder="Chất lượng hình ảnh, độ dễ lắp đặt, ứng dụng điện thoại..."
                  value={comment} onChange={(e) => setComment(e.target.value)} />
        <small className="muted review-count">{comment.length}/1000</small>
      </label>
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
    </form>
  );
}

/**
 * Khối "Đánh giá sản phẩm" ở trang chi tiết.
 * data: kết quả GET /api/products/{slug}/reviews (do trang cha tải để dùng chung với dòng sao ở đầu trang).
 */
export default function ProductReviews({ product, data, loading, page, onPageChange, onChanged }) {
  const { user, isAdmin, canShop } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [eligibility, setEligibility] = useState(null);
  const [eligKey, setEligKey] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  // Khách đã đăng nhập: hỏi xem có được viết đánh giá không
  useEffect(() => {
    if (!user || !canShop) { setEligibility(null); return; }
    let alive = true;
    orderApi.reviewEligibility(product.id)
      .then((res) => alive && setEligibility(res))
      .catch(() => alive && setEligibility(null));
    return () => { alive = false; };
  }, [user, canShop, product.id, eligKey]);

  // Mở từ link ".../products/abc#reviews" (vd. nút "Đánh giá" ở chi tiết đơn hàng) -> cuộn tới đây
  useEffect(() => {
    if (location.hash === '#reviews' && data) {
      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, data]);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await adminApi.deleteReview(deleting.id);
      toast.success('Đã xoá đánh giá');
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const reviews = data?.reviews;
  const count = data?.count || 0;

  return (
    <section className="detail-specs product-reviews" id="reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Đánh giá sản phẩm</h2>

      {!data && loading && <Spinner />}
      {data && (
        <div className="review-top">
          <div className="review-summary">
            <div className="review-avg">
              <b>{count ? data.average.toFixed(1) : '–'}</b><span>/5</span>
            </div>
            <Stars value={data.average} size={20} />
            <span className="muted small">{count} đánh giá</span>
          </div>
          <ul className="review-bars" aria-label="Phân bố số sao">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = data.distribution[star] || 0;
              const pct = count ? Math.round((n * 100) / count) : 0;
              return (
                <li key={star}>
                  <span className="review-bar-label">{star} <Icon name="star" size={13} filled /></span>
                  <span className="review-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                  <span className="review-bar-count">{n}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Khu vực viết đánh giá */}
      {!user && (
        <p className="review-note">
          <Link to="/login" state={{ from: { pathname: location.pathname, hash: '#reviews' } }}>Đăng nhập</Link>
          {' '}để viết đánh giá (dành cho khách đã mua sản phẩm).
        </p>
      )}
      {user && canShop && eligibility && !eligibility.canReview && (
        <p className="review-note">{eligibility.reason}</p>
      )}
      {user && canShop && eligibility?.canReview && (
        <ReviewForm key={eligibility.orderId} productId={product.id} eligibility={eligibility}
                    onCreated={() => { setEligKey((k) => k + 1); onPageChange(0); onChanged(); }} />
      )}

      {reviews && reviews.content.length === 0 && (
        <p className="muted">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận sau khi mua!</p>
      )}
      {reviews && reviews.content.length > 0 && (
        <>
          <ul className="review-list">
            {reviews.content.map((r) => (
              <li key={r.id} className="review-item">
                <div className="review-head">
                  <span className="review-avatar" aria-hidden="true">{r.customerName.charAt(0)}</span>
                  <div className="review-who">
                    <b>{r.customerName}</b>
                    <span className="muted small">{formatDate(r.createdAt)} · <span className="text-success">Đã mua hàng</span></span>
                  </div>
                  {isAdmin && (
                    <button type="button" className="btn btn-sm btn-outline-danger review-delete"
                            onClick={() => setDeleting(r)} aria-label={`Xoá đánh giá của ${r.customerName}`}>
                      Xoá
                    </button>
                  )}
                </div>
                <Stars value={r.rating} size={15} />
                {r.comment && <p className="review-comment">{r.comment}</p>}
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={reviews.totalPages} onChange={onPageChange} />
        </>
      )}

      <ConfirmDialog open={!!deleting} title="Xoá đánh giá?" danger busy={busy} confirmLabel="Xoá đánh giá"
                     message={deleting ? `Đánh giá ${deleting.rating} sao của ${deleting.customerName} sẽ bị xoá vĩnh viễn.` : ''}
                     onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </section>
  );
}
