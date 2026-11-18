/** Icon minh hoạ theo loại thiết bị, dùng khi sản phẩm chưa có ảnh thật. */
function kindOf(categoryName = '') {
  const n = categoryName.toLowerCase();
  if (n.includes('camera')) return 'camera';
  if (n.includes('đầu ghi')) return 'recorder';
  if (n.includes('khóa') || n.includes('khoá')) return 'lock';
  if (n.includes('chuông')) return 'bell';
  if (n.includes('cảm biến') || n.includes('báo động')) return 'sensor';
  return 'box';
}

const paths = {
  camera: (
    <>
      <rect x="10" y="20" width="36" height="22" rx="5" />
      <circle cx="26" cy="31" r="7" />
      <circle cx="26" cy="31" r="2.5" fill="currentColor" />
      <path d="M46 26l8-4v18l-8-4" />
      <path d="M20 42v8h12" />
    </>
  ),
  recorder: (
    <>
      <rect x="6" y="22" width="52" height="20" rx="3" />
      <circle cx="16" cy="32" r="2.5" fill="currentColor" />
      <path d="M26 32h22M26 28h22M26 36h14" />
      <path d="M12 42v4M52 42v4" />
    </>
  ),
  lock: (
    <>
      <rect x="18" y="8" width="28" height="48" rx="5" />
      <rect x="23" y="14" width="18" height="12" rx="2" />
      <circle cx="32" cy="38" r="5" />
      <path d="M30 46h4" />
    </>
  ),
  bell: (
    <>
      <rect x="20" y="8" width="24" height="48" rx="8" />
      <circle cx="32" cy="22" r="5" />
      <circle cx="32" cy="22" r="1.8" fill="currentColor" />
      <circle cx="32" cy="42" r="5" />
    </>
  ),
  sensor: (
    <>
      <rect x="16" y="12" width="32" height="40" rx="6" />
      <circle cx="32" cy="28" r="7" />
      <path d="M24 44h16" />
      <path d="M8 22a28 28 0 0 0 0 20M56 22a28 28 0 0 1 0 20" />
    </>
  ),
  box: (
    <>
      <path d="M10 22l22-10 22 10v22L32 54 10 44z" />
      <path d="M10 22l22 10 22-10M32 32v22" />
    </>
  ),
};

export default function DeviceIcon({ categoryName, size = 64 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[kindOf(categoryName)]}
    </svg>
  );
}
