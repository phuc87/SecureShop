import { discountPercent, formatCurrency } from '../../utils/format';

export default function PriceTag({ price, salePrice, size = 'md' }) {
  const off = discountPercent(price, salePrice);
  return (
    <div className={`price-tag price-${size}`}>
      <span className="price-now">{formatCurrency(off ? salePrice : price)}</span>
      {off > 0 && (
        <>
          <span className="price-old">{formatCurrency(price)}</span>
          <span className="price-off">-{off}%</span>
        </>
      )}
    </div>
  );
}
