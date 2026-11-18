import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import productApi from '../api/productApi';
import useFetch from '../hooks/useFetch';
import ProductImage from '../components/common/ProductImage';
import PriceTag from '../components/common/PriceTag';
import ProductGrid from '../components/product/ProductGrid';
import ProductReviews from '../components/product/ProductReviews';
import Stars from '../components/common/Stars';
import FavoriteButton from '../components/common/FavoriteButton';
import { EmptyState, ErrorState, Spinner } from '../components/common/StateViews';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/common/Icon';
import { FREE_SHIPPING_FROM, PLACEMENT_LABELS } from '../utils/constants';
import { discountPercent, formatCurrency } from '../utils/format';

function RelatedProducts({ product }) {
  const { data } = useFetch(
    () => productApi.search({ category: product.category.slug, size: 5, sort: 'best_selling' }),
    [product.id],
  );
  const related = data?.content.filter((p) => p.id !== product.id).slice(0, 4) || [];
  if (related.length === 0) return null;
  return (
    <section className="home-section">
      <div className="section-head"><h2>Sản phẩm cùng loại</h2></div>
      <ProductGrid products={related} />
    </section>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const { data: product, loading, error, reload } = useFetch(() => productApi.getBySlug(slug), [slug]);
  const { addItem, selectOnly } = useCart();
  const { canShop } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  const { data: reviewData, loading: reviewLoading, reload: reloadReviews } = useFetch(
    () => productApi.reviews(slug, reviewPage),
    [slug, reviewPage],
  );

  useEffect(() => {
    setQty(1);
    setActiveImage(0);
    setReviewPage(0);
  }, [slug]);

  useEffect(() => {
    if (product) document.title = `${product.name} - SecureShop`;
    return () => { document.title = 'SecureShop - Thiết bị an ninh'; };
  }, [product]);

  if (loading) return <Spinner />;
  if (error) {
    return (
      <div className="container page">
        {error.includes('Không tìm thấy')
          ? <EmptyState title="Không tìm thấy sản phẩm"><Link to="/products" className="btn btn-primary">Xem sản phẩm khác</Link></EmptyState>
          : <ErrorState message={error} onRetry={reload} />}
      </div>
    );
  }

  const images = product.images.length ? product.images : [product.thumbnailUrl];
  const outOfStock = product.stock <= 0;

  const off = discountPercent(product.price, product.salePrice);

  const handleAdd = () => {
    const finalQty = addItem(product, qty);
    if (finalQty < qty) toast.error(`Chỉ còn ${product.stock} sản phẩm trong kho`);
    else toast.success(`Đã thêm ${qty} "${product.name}" vào giỏ`);
  };

  /**
   * Mua ngay: thêm vào giỏ, chỉ chọn riêng món này rồi sang thẳng trang thanh toán
   * (các món khác vẫn nằm trong giỏ, chưa đăng nhập thì được mời đăng nhập trước).
   */
  const handleBuyNow = () => {
    addItem(product, qty);
    selectOnly(product.id);
    navigate('/checkout');
  };

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link><span>/</span>
        <Link to={`/products?category=${product.category.slug}`}>{product.category.name}</Link><span>/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="detail-layout">
        <div className="detail-gallery">
          <div className="detail-photo">
            {off > 0 && <span className="detail-photo-badge">-{off}%</span>}
            <ProductImage key={images[activeImage]} src={images[activeImage]} alt={product.name}
                          categoryName={product.category.name} iconSize={140} className="detail-main-image" />
          </div>
          {images.length > 1 && (
            <div className="thumb-row">
              {images.map((src, i) => (
                <button type="button" key={src} className={i === activeImage ? 'active' : ''}
                        onClick={() => setActiveImage(i)} aria-label={`Ảnh ${i + 1}`}>
                  <ProductImage src={src} alt="" categoryName={product.category.name} iconSize={28} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <div className="detail-tags">
            {product.brand && (
              <Link to={`/products?brand=${product.brand.slug}`} className="detail-brand">{product.brand.name}</Link>
            )}
            {product.featured && <span className="chip chip-blue">Nổi bật</span>}
          </div>
          <h1 className="detail-title">{product.name}</h1>
          <div className="detail-meta">
            {reviewData?.count > 0 && (
              <a href="#reviews" className="detail-rating"
                 onClick={(e) => { e.preventDefault(); document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <b>{reviewData.average.toFixed(1)}</b> <Stars value={reviewData.average} size={14} />
                <span>{reviewData.count} đánh giá</span>
              </a>
            )}
            <span>Đã bán <b>{product.soldCount}</b></span>
            <span>Mã: {product.sku}</span>
          </div>

          <div className="detail-price-box">
            <PriceTag price={product.price} salePrice={product.salePrice} size="lg" />
            {off > 0 && <span className="detail-save">Tiết kiệm {formatCurrency(product.price - product.salePrice)}</span>}
          </div>

          {product.shortDescription && <p className="detail-short">{product.shortDescription}</p>}

          <ul className="detail-facts">
            <li>
              <Icon name={outOfStock ? 'close' : 'checkCircle'} size={20} />
              <span>Tình trạng</span>
              <b className={outOfStock ? 'text-danger' : 'text-success'}>{outOfStock ? 'Hết hàng' : `Còn ${product.stock}`}</b>
            </li>
            <li><Icon name="shieldCheck" size={20} /><span>Bảo hành</span><b>{product.warrantyMonths} tháng</b></li>
            {product.placement && <li><Icon name="mapPin" size={20} /><span>Lắp đặt</span><b>{PLACEMENT_LABELS[product.placement]}</b></li>}
          </ul>

          {!canShop && (
            <div className="alert alert-info">Bạn đang đăng nhập bằng tài khoản quản trị nên không thể mua hàng.</div>
          )}
          {canShop && (
            <div className="detail-buy">
              {!outOfStock && (
                <div className="detail-qty">
                  <span>Số lượng</span>
                  <div className="qty-stepper" role="group" aria-label="Số lượng">
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm" disabled={qty <= 1}>−</button>
                    <input id="detail-qty" type="number" min="1" max={product.stock} value={qty} aria-label="Số lượng"
                           onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))} />
                    <button type="button" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Tăng" disabled={qty >= product.stock}>+</button>
                  </div>
                  {product.stock <= 10 && <small className="detail-low">Chỉ còn {product.stock} sản phẩm</small>}
                </div>
              )}
              <div className="detail-cta">
                <button type="button" className="btn btn-outline btn-lg detail-add" onClick={handleAdd} disabled={outOfStock}>
                  <Icon name="bag" size={20} /> {outOfStock ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
                </button>
                {!outOfStock && (
                  <button type="button" className="btn btn-primary btn-lg detail-buynow" onClick={handleBuyNow}>
                    Mua ngay
                  </button>
                )}
              </div>
              <div className="detail-secondary">
                <FavoriteButton product={product} variant="full" />
                <button type="button" className="btn btn-outline ask-btn"
                        onClick={() => window.dispatchEvent(new CustomEvent('chat:open', { detail: { product } }))}>
                  <Icon name="headset" size={18} /> Hỏi tư vấn viên
                </button>
              </div>
            </div>
          )}

          <Link to={`/compare?a=${encodeURIComponent(product.slug)}`} className="detail-compare">
            <Icon name="compare" size={18} /> So sánh với sản phẩm khác
          </Link>

          <ul className="detail-trust">
            <li><Icon name="truck" size={18} /><span>Miễn phí giao hàng đơn từ {formatCurrency(FREE_SHIPPING_FROM)}</span></li>
            <li><Icon name="award" size={18} /><span>Hàng chính hãng 100%</span></li>
            <li><Icon name="refresh" size={18} /><span>Đổi mới trong 7 ngày nếu lỗi</span></li>
            <li><Icon name="tool" size={18} /><span>Hỗ trợ cài đặt, lắp đặt</span></li>
          </ul>
        </div>
      </div>

      <section className="detail-specs">
        <h2>Thông số kỹ thuật</h2>
        {product.specs.length === 0 ? <p className="muted">Đang cập nhật.</p> : (
          <table className="spec-table">
            <tbody>
              {product.specs.map((s) => (
                <tr key={s.key}><th scope="row">{s.label}</th><td>{s.value}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {product.description && (
          <>
            <h2>Mô tả sản phẩm</h2>
            <p className="detail-description">{product.description}</p>
          </>
        )}
      </section>

      <ProductReviews product={product} data={reviewData} loading={reviewLoading}
                      page={reviewPage} onPageChange={setReviewPage} onChanged={reloadReviews} />

      <RelatedProducts product={product} />
    </div>
  );
}
