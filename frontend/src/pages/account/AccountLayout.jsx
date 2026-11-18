import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/common/Icon';

/** Khung trang Tài khoản: menu bên trái (máy tính) / thanh tab vuốt ngang (điện thoại). */
export default function AccountLayout() {
  const { user, isAdmin } = useAuth();
  return (
    <div className="container page">
      <div className="account-layout">
        <aside className="account-nav" aria-label="Tài khoản">
          <div className="account-hello">
            <span className="avatar" aria-hidden="true">{user.fullName.charAt(0)}</span>
            <span><small className="muted">Xin chào</small><b>{user.fullName}</b></span>
          </div>
          <nav>
            <NavLink to="/account" end><Icon name="user" size={18} /> Thông tin<span className="hide-sm">&nbsp;tài khoản</span></NavLink>
            {!isAdmin && <NavLink to="/account/orders"><Icon name="bag" size={18} /> Đơn hàng<span className="hide-sm">&nbsp;của tôi</span></NavLink>}
            {!isAdmin && <NavLink to="/account/favorites"><Icon name="heart" size={18} /> Yêu thích</NavLink>}
            <NavLink to="/account/password"><Icon name="shield" size={18} /> <span className="hide-sm">Đổi mật khẩu</span><span className="show-sm">Mật khẩu</span></NavLink>
          </nav>
        </aside>
        <section className="account-main">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
