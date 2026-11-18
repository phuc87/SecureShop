import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { PLACEMENT_LABELS } from '../utils/constants';

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
  const { addItem } = useCart();
  const { canShop } = useAuth();
  const toast = useToast();
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

  const handleAdd = () => {
    const finalQty = addItem(product, qty);
    if (finalQty < qty) toast.error(`Chỉ còn ${product.stock} sản phẩm trong kho`);
    else toast.success(`Đã thêm ${qty} "${product.name}" vào giỏ`);
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
          <ProductImage key={images[activeImage]} src={images[activeImage]} alt={product.name}
                        categoryName={product.category.name} iconSize={140} className="detail-main-image" />
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
          {product.brand && <span className="product-brand">{product.brand.name}</span>}
          <h1>{product.name}</h1>
          <p className="muted detail-meta">
            {reviewData?.count > 0 && (
              <a href="#reviews" className="detail-rating"
                 onClick={(e) => { e.preventDefault(); document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <b>{reviewData.average.toFixed(1)}</b> <Stars value={reviewData.average} size={14} /> ({reviewData.count} đánh giá)
              </a>
            )}
            <span>Mã SP: {product.sku} · Đã bán {product.soldCount}</span>
          </p>
          <PriceTag price={product.price} salePrice={product.salePrice} size="lg" />
          {product.shortDescription && <p className="detail-short">{product.shortDescription}</p>}

          <ul className="detail-facts">
            <li><span>Tình trạng</span><b className={outOfStock ? 'text-danger' : 'text-success'}>
              {outOfStock ? 'Hết hàng' : `Còn ${product.stock} sản phẩm`}</b></li>
            <li><span>Bảo hành</span><b>{product.warrantyMonths} tháng</b></li>
            {product.placement && <li><span>Lắp đặt</span><b>{PLACEMENT_LABELS[product.placement]}</b></li>}
          </ul>

          {!canShop && (
            <div className="alert alert-info">Bạn đang đăng nhập bằng tài khoản quản trị nên không thể mua hàng.</div>
          )}
          {canShop && !outOfStock && (
            <div className="buy-row">
              <div className="qty-stepper" role="group" aria-label="Số lượng">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm">−</button>
                <input id="detail-qty" type="number" min="1" max={product.stock} value={qty} aria-label="Số lượng"
                       onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))} />
                <button type="button" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Tăng">+</button>
              </div>
              <button type="button" className="btn btn-primary btn-lg" onClick={handleAdd}>Thêm vào giỏ hàng</button>
            </div>
          )}
          {canShop && (
            <div className="detail-secondary">
              <FavoriteButton product={product} variant="full" />
              <button type="button" className="btn btn-outline ask-btn"
                      onClick={() => window.dispatchEvent(new CustomEvent('chat:open', { detail: { product } }))}>
                <Icon name="headset" size={18} /> Hỏi tư vấn viên về sản phẩm này
              </button>
            </div>
          )}
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
