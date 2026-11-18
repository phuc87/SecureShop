import { Link } from 'react-router-dom';
import favoriteApi from '../../api/favoriteApi';
import useFetch from '../../hooks/useFetch';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useToast } from '../../context/ToastContext';
import ProductImage from '../../components/common/ProductImage';
import PriceTag from '../../components/common/PriceTag';
import Icon from '../../components/common/Icon';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';
import { formatDate } from '../../utils/format';

/** Tài khoản > Sản phẩm yêu thích */
export default function Favorites() {
  const { data, loading, error, reload } = useFetch(() => favoriteApi.list(), []);
  const { isFavorite, toggle, loaded } = useFavorites();
  const { addItem } = useCart();
  const toast = useToast();

  // Bỏ thích xong thì dòng biến mất ngay (lọc theo tập id trong context)
  const items = (data || []).filter((f) => !loaded || isFavorite(f.product.id));
  const buyable = items.filter((f) => f.available && f.product.stock > 0);

  const addToCart = (p) => {
    const qty = addItem(p, 1);
    if (qty === 0) toast.error(`"${p.name}" đã hết hàng`);
    else toast.success(`Đã thêm "${p.name}" vào giỏ`);
  };
  const addAll = () => {
    buyable.forEach((f) => addItem(f.product, 1));
    toast.success(`Đã thêm ${buyable.length} sản phẩm vào giỏ hàng`);
  };

  return (
    <div className="panel">
      <div className="fav-head">
        <div>
          <h1 className="panel-title">Sản phẩm yêu thích</h1>
          <p className="muted small">Bấm trái tim ở sản phẩm bất kỳ để lưu lại đây, so sánh và mua sau.</p>
        </div>
        {buyable.length > 1 && (
          <button type="button" className="btn btn-primary btn-sm" onClick={addAll}>
            Thêm tất cả vào giỏ ({buyable.length})
          </button>
        )}
      </div>

      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && items.length === 0 && (
        <EmptyState title="Chưa có sản phẩm yêu thích">
          <span>Bấm biểu tượng <Icon name="heart" size={15} /> trên sản phẩm để lưu lại.</span>
          <Link to="/products" className="btn btn-primary">Xem sản phẩm</Link>
        </EmptyState>
      )}

      {items.length > 0 && (
        <ul className="fav-list">
          {items.map(({ product: p, available, addedAt }) => {
            const out = available && p.stock <= 0;
            return (
              <li key={p.id} className={`fav-item ${available ? '' : 'fav-off'}`}>
                {available ? (
                  <Link to={`/products/${p.slug}`} className="fav-thumb">
                    <ProductImage src={p.thumbnailUrl} alt={p.name} categoryName={p.categoryName} iconSize={36} />
                  </Link>
                ) : (
                  <span className="fav-thumb"><ProductImage src={p.thumbnailUrl} alt="" categoryName={p.categoryName} iconSize={36} /></span>
                )}
                <div className="fav-info">
                  {p.brandName && <span className="product-brand">{p.brandName}</span>}
                  {available ? <Link to={`/products/${p.slug}`} className="fav-name">{p.name}</Link> : <b className="fav-name">{p.name}</b>}
                  {available ? <PriceTag price={p.price} salePrice={p.salePrice} /> : <span className="chip chip-red">Ngừng kinh doanh</span>}
                  <small className="muted">Đã lưu {formatDate(addedAt)}{out && ' · '}{out && <span className="text-danger">Tạm hết hàng</span>}</small>
                </div>
                <div className="fav-actions">
                  {available && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={out} onClick={() => addToCart(p)}>
                      {out ? 'Hết hàng' : 'Thêm vào giỏ'}
                    </button>
                  )}
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => toggle(p)}
                          aria-label={`Bỏ yêu thích ${p.name}`}>
                    <Icon name="heart" size={15} filled /> Bỏ thích
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
