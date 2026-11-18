export const PLACEMENT_LABELS = {
  INDOOR: 'Trong nhà',
  OUTDOOR: 'Ngoài trời',
  BOTH: 'Trong nhà & ngoài trời',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best_selling', label: 'Bán chạy' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
];

export const PRICE_RANGES = [
  { id: 'u500', label: 'Dưới 500.000 ₫', max: 500000 },
  { id: '500-1m', label: '500.000 ₫ - 1 triệu', min: 500000, max: 1000000 },
  { id: '1m-2m', label: '1 - 2 triệu', min: 1000000, max: 2000000 },
  { id: '2m-5m', label: '2 - 5 triệu', min: 2000000, max: 5000000 },
  { id: 'o5m', label: 'Trên 5 triệu', min: 5000000 },
];

export const PAGE_SIZE = 12;

/** Phí giao hàng: phải khớp app.order.* trong backend/application.yml (server mới là nơi tính tiền thật). */
export const FREE_SHIPPING_FROM = 2000000;
export const SHIPPING_FEE = 30000;
export const shippingFeeFor = (subtotal) => (subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);
