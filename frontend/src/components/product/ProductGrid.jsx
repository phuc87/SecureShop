import ProductCard from './ProductCard';

/**
 * Lưới sản phẩm.
 * carousel = true: trên điện thoại hiển thị thành 1 dải vuốt ngang (dùng ở trang chủ cho gọn),
 * từ máy tính bảng trở lên vẫn là lưới bình thường.
 */
export default function ProductGrid({ products, carousel = false }) {
  return (
    <div className={`product-grid ${carousel ? 'carousel-sm' : ''}`}>
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
