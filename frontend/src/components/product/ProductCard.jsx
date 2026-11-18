import { Link } from 'react-router-dom';
import ProductImage from '../common/ProductImage';
import PriceTag from '../common/PriceTag';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import FavoriteButton from '../common/FavoriteButton';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { canShop } = useAuth();
  const toast = useToast();
  const outOfStock = product.stock <= 0;

  const handleAdd = () => {
    addItem(product, 1);
    toast.success(`Đã thêm "${product.name}" vào giỏ`);
  };

  return (
    <article className="product-card">
      <FavoriteButton product={product} />
      <Link to={`/products/${product.slug}`} className="product-card-link">
        <ProductImage src={product.thumbnailUrl} alt={product.name} categoryName={product.categoryName} />
        <div className="product-card-body">
          {product.brandName && <span className="product-brand">{product.brandName}</span>}
          <h3 className="product-name">{product.name}</h3>
          <PriceTag price={product.price} salePrice={product.salePrice} />
        </div>
      </Link>
      <div className="product-card-footer">
        <span className="product-sold">Đã bán {product.soldCount}</span>
        {canShop ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd} disabled={outOfStock}>
            {outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
          </button>
        ) : (
          <span className={`chip ${product.stock <= 10 ? 'chip-red' : ''}`}>Tồn kho: {product.stock}</span>
        )}
      </div>
    </article>
  );
}
