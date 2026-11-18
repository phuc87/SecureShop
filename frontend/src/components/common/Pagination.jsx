/** page bắt đầu từ 0 (giống Spring Data). */
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  // Hiện tối đa 5 số trang quanh trang hiện tại
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <nav className="pagination" aria-label="Phân trang">
      <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)}>‹ Trước</button>
      {pages.map((p) => (
        <button type="button" key={p} className={p === page ? 'active' : ''}
                aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>
          {p + 1}
        </button>
      ))}
      <button type="button" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>Sau ›</button>
    </nav>
  );
}
