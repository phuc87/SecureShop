import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common/StateViews';

/** Chỉ cho vào khi đã đăng nhập; chưa đăng nhập thì chuyển tới /login rồi quay lại sau. */
export function PrivateRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <Spinner label="Đang kiểm tra đăng nhập..." />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

/** Chỉ ADMIN. Lưu ý: đây chỉ là chặn giao diện, backend vẫn tự kiểm tra quyền ở /api/admin/**. */
export function AdminRoute() {
  const { user, isAdmin, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <Spinner label="Đang kiểm tra đăng nhập..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

/** Trang mua sắm (giỏ hàng, thanh toán): khách vãng lai và CUSTOMER vào được, ADMIN thì về trang quản trị. */
export function ShopperRoute() {
  const { canShop, initializing } = useAuth();
  if (initializing) return <Spinner label="Đang kiểm tra đăng nhập..." />;
  return canShop ? <Outlet /> : <Navigate to="/admin" replace />;
}

/**
 * Trang login/register: đã đăng nhập thì chuyển đi.
 * Đây là NƠI DUY NHẤT điều hướng sau khi đăng nhập/đăng ký thành công
 * (quay lại trang trước đó nếu có, ví dụ /cart), tránh 2 lệnh điều hướng chạy tranh nhau.
 */
export function GuestOnlyRoute() {
  const { user, isAdmin, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <Spinner />;
  if (!user) return <Outlet />;

  const from = location.state?.from;
  const backToFrom = from?.pathname && !['/login', '/register'].includes(from.pathname);
  const target = backToFrom ? from : isAdmin ? '/admin' : '/';
  return <Navigate to={target} replace />;
}
