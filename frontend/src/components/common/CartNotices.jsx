/** Hộp thông báo thay đổi của giỏ hàng (giá đổi, hết hàng...). */
export default function CartNotices({ notices, onDismiss }) {
  if (!notices.length) return null;
  return (
    <div className="alert alert-warn cart-notices" role="status">
      <div>
        <b>Giỏ hàng vừa được cập nhật theo giá và tồn kho mới nhất:</b>
        <ul>
          {notices.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </div>
      <button type="button" className="link-btn" onClick={onDismiss}>Đã hiểu</button>
    </div>
  );
}
