/** Các trạng thái hiển thị dùng chung: đang tải, rỗng, lỗi. */

export function Spinner({ label = 'Đang tải...' }) {
  return (
    <div className="state-view" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="state-view">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-view state-error" role="alert">
      <strong>Không tải được dữ liệu</strong>
      <span>{message}</span>
      {onRetry && <button type="button" className="btn btn-outline" onClick={onRetry}>Thử lại</button>}
    </div>
  );
}
