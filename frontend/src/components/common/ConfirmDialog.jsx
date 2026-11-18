import { useEffect, useRef } from 'react';

/**
 * Hộp thoại xác nhận dùng thẻ <dialog> có sẵn của trình duyệt (bấm Esc để huỷ).
 * children: nội dung thêm giữa lời nhắn và các nút (vd. ô nhập lý do huỷ đơn).
 * confirmDisabled: tắt nút xác nhận (vd. chưa nhập lý do bắt buộc).
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Xác nhận', cancelLabel = 'Huỷ',
                                        danger = false, busy = false, confirmDisabled = false,
                                        onConfirm, onCancel, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="confirm-dialog" onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {children}
      <div className="confirm-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}
                disabled={busy || confirmDisabled}>
          {busy ? 'Đang xử lý...' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
