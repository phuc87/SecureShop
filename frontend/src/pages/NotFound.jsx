import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/StateViews';

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState title="Không tìm thấy trang">
        <span>Đường dẫn có thể đã bị đổi hoặc không tồn tại.</span>
        <Link to="/" className="btn btn-primary">Về trang chủ</Link>
      </EmptyState>
    </div>
  );
}
