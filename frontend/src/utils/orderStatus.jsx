/** Tên tiếng Việt + màu cho trạng thái đơn hàng, phương thức và trạng thái thanh toán. */

export const ORDER_STATUS = {
  PENDING: { label: 'Chờ xác nhận', chip: 'chip-orange' },
  CONFIRMED: { label: 'Đã xác nhận', chip: 'chip-blue' },
  SHIPPING: { label: 'Đang giao', chip: 'chip-purple' },
  COMPLETED: { label: 'Hoàn thành', chip: 'chip-green' },
  CANCELLED: { label: 'Đã huỷ', chip: 'chip-red' },
};

/** Các bước hiển thị trên thanh tiến trình (đơn huỷ hiển thị riêng). */
export const ORDER_STEPS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED'];

/** Nút hành động của admin cho từng trạng thái tiếp theo. */
export const NEXT_ACTION = {
  CONFIRMED: { label: 'Xác nhận đơn', className: 'btn-primary' },
  SHIPPING: { label: 'Bắt đầu giao hàng', className: 'btn-primary' },
  COMPLETED: { label: 'Đã giao thành công', className: 'btn-success' },
  CANCELLED: { label: 'Huỷ đơn', className: 'btn-outline-danger' },
};

export const PAYMENT_METHOD = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  VNPAY: 'VNPay',
};

export const PAYMENT_STATUS = {
  UNPAID: { label: 'Chưa thanh toán', chip: 'chip-orange' },
  PAID: { label: 'Đã thanh toán', chip: 'chip-green' },
  REFUNDED: { label: 'Đã hoàn tiền', chip: '' },
};

export const statusLabel = (s) => ORDER_STATUS[s]?.label || s;

export function StatusChip({ status }) {
  const s = ORDER_STATUS[status];
  return <span className={`chip ${s?.chip || ''}`}>{s?.label || status}</span>;
}

export function PaymentChip({ status }) {
  const s = PAYMENT_STATUS[status];
  return <span className={`chip ${s?.chip || ''}`}>{s?.label || status}</span>;
}

export const formatDateTime = (iso) => (iso
  ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
  : '');
