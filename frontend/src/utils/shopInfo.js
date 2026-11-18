/**
 * Thông tin cửa hàng dùng chung cho Header, Footer, trang Giới thiệu, Liên hệ.
 * ĐÂY LÀ THÔNG TIN MẪU: sửa tại đây là toàn bộ website cập nhật theo.
 */
export const SHOP = {
  name: 'SecureShop',
  slogan: 'Thiết bị an ninh chính hãng, tư vấn tận tâm',
  hotline: '1900 1234',
  hotlineHref: 'tel:19001234',
  email: 'hotro@secureshop.vn',
  address: '123 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh',
  hours: '8:00 - 21:00, thứ 2 đến chủ nhật',
  /** Điểm hiển thị trên bản đồ. Khi có địa chỉ thật, đặt mapQuery = address là được. */
  mapQuery: 'Nguyễn Văn Linh, Tân Phong, Quận 7, Hồ Chí Minh',
  foundedYear: 2020,
  /** Tài khoản nhận chuyển khoản: DỮ LIỆU MẪU, phải khớp app.shop.bank-* trong backend/application.yml */
  bank: { name: 'Vietcombank', account: '0000 1234 5678', holder: 'CONG TY SECURESHOP' },
};

/** Link bản đồ Google Maps nhúng (không cần API key). */
export const mapEmbedUrl = (query = SHOP.mapQuery) =>
  `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

export const CONTACT_SUBJECTS = [
  { value: 'TU_VAN', label: 'Tư vấn chọn thiết bị' },
  { value: 'LAP_DAT', label: 'Khảo sát, lắp đặt' },
  { value: 'BAO_HANH', label: 'Bảo hành, sửa chữa' },
  { value: 'HOP_TAC', label: 'Hợp tác, đại lý' },
  { value: 'KHAC', label: 'Khác' },
];

export const subjectLabel = (value) => CONTACT_SUBJECTS.find((s) => s.value === value)?.label || value;
