const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

/** 520000 -> "520.000 ₫" */
export const formatCurrency = (value) => vnd.format(Number(value || 0));

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');

/** Phần trăm giảm giá, làm tròn. Trả về 0 nếu không giảm. */
export const discountPercent = (price, salePrice) => {
  if (!salePrice || Number(salePrice) >= Number(price)) return 0;
  return Math.round((1 - Number(salePrice) / Number(price)) * 100);
};
