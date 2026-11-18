import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import ThemeToggle from '../common/ThemeToggle';
import productApi from '../../api/productApi';
import useFetch from '../../hooks/useFetch';
import DeviceIcon from '../common/DeviceIcon';
import Icon from '../common/Icon';
import { SHOP } from '../../utils/shopInfo';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="SecureShop - Trang chủ">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2z" fill="currentColor" />
        <circle cx="16" cy="15" r="5" fill="none" stroke="#fff" strokeWidth="2.4" />
        <circle cx="16" cy="15" r="1.8" fill="#fff" />
      </svg>
      <span>Secure<b>Shop</b></span>
    </Link>
  );
}

/** Bỏ focus sau khi bấm link trong menu xổ xuống, để menu đóng lại (menu mở bằng :hover / :focus-within). */
const closeMenu = () => document.activeElement?.blur();

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const { count: favCount } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: categories } = useFetch(() => productApi.categories(), []);

  useEffect(() => {
    setKeyword(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const onProducts = location.pathname.startsWith('/products');

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="container topbar-inner">
          <span className="topbar-item"><Icon name="phone" size={14} /> Hotline: <b>{SHOP.hotline}</b></span>
          <span className="topbar-item hide-sm"><Icon name="truck" size={14} /> Miễn phí giao hàng đơn từ 2 triệu</span>
          <span className="topbar-item hide-sm"><Icon name="shieldCheck" size={14} /> Hàng chính hãng, bảo hành 24 tháng</span>
        </div>
      </div>

      <div className="container header-main">
        <Logo />

        <form className="search-box" role="search" onSubmit={handleSearch}>
          <label htmlFor="header-search" className="sr-only">Tìm sản phẩm</label>
          <input id="header-search" type="search" placeholder="Tìm camera, khoá vân tay, đầu ghi..."
                 value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <button type="submit" className="btn btn-primary" aria-label="Tìm kiếm"><Icon name="search" size={18} /></button>
        </form>

        <div className="header-actions">
          <ThemeToggle />
          {user && !isAdmin && (
            <Link to="/account/favorites" className="cart-link fav-link" aria-label={`Sản phẩm yêu thích, ${favCount} sản phẩm`}>
              <Icon name="heart" size={22} />
              <span className="hide-md">Yêu thích</span>
              {favCount > 0 && <span className="badge">{favCount}</span>}
            </Link>
          )}
          {isAdmin ? (
            <Link to="/admin" className="btn btn-primary btn-sm">Trang quản trị</Link>
          ) : (
            <Link to="/cart" className="cart-link" aria-label={`Giỏ hàng, ${count} sản phẩm`}>
              <Icon name="bag" size={22} />
              <span className="hide-tab">Giỏ hàng</span>
              {count > 0 && <span className="badge">{count}</span>}
            </Link>
          )}

          {user ? (
            <div className="user-menu">
              <button type="button" className="user-btn" aria-expanded={menuOpen}
                      onClick={() => setMenuOpen((o) => !o)}>
                <span className="avatar" aria-hidden="true">{user.fullName.charAt(0)}</span>
                <span className="hide-tab">{user.fullName}</span>
              </button>
              {menuOpen && (
                <div className="dropdown">
                  <span className="dropdown-role">{isAdmin ? 'Quản trị viên' : 'Khách hàng'}</span>
                  {isAdmin && <Link to="/admin">Trang quản trị</Link>}
                  {!isAdmin && <Link to="/account/orders">Đơn hàng của tôi</Link>}
                  {!isAdmin && <Link to="/account/favorites">Sản phẩm yêu thích</Link>}
                  <Link to="/account">Tài khoản của tôi</Link>
                  <button type="button" onClick={handleLogout}>Đăng xuất</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" state={{ from: location }} className="btn btn-outline btn-sm login-btn" aria-label="Đăng nhập">
              <Icon name="user" size={18} className="login-icon" /><span className="login-text">Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>

      <nav className="main-nav" aria-label="Menu chính">
        <div className="container main-nav-inner">
          <ul className="main-menu">
            <li><NavLink to="/" end>Trang chủ</NavLink></li>
            <li className="has-mega">
              <Link to="/products" className={onProducts ? 'active' : ''} aria-haspopup="true"
                    aria-current={onProducts ? 'page' : undefined}>
                Sản phẩm <Icon name="chevronDown" size={16} />
              </Link>
              <div className="mega-menu">
                <div className="mega-grid">
                  {(categories || []).map((c) => (
                    <Link key={c.id} to={`/products?category=${c.slug}`} className="mega-item" onClick={closeMenu}>
                      <span className="mega-icon"><DeviceIcon categoryName={c.name} size={30} /></span>
                      <span>
                        <b>{c.name}</b>
                        <small>{c.description}</small>
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="mega-footer">
                  <Link to="/products?featured=true" onClick={closeMenu}>Sản phẩm nổi bật</Link>
                  <Link to="/products?onSale=true" onClick={closeMenu}>Đang giảm giá</Link>
                  <Link to="/products" onClick={closeMenu} className="mega-all">
                    Xem tất cả sản phẩm <Icon name="arrowRight" size={16} />
                  </Link>
                </div>
              </div>
            </li>
            <li><NavLink to="/about">Giới thiệu</NavLink></li>
            <li><NavLink to="/contact">Liên hệ</NavLink></li>
          </ul>
          <a href={SHOP.hotlineHref} className="nav-hotline hide-sm">
            <Icon name="headset" size={18} /> Tư vấn miễn phí <b>{SHOP.hotline}</b>
          </a>
        </div>
      </nav>
    </header>
  );
}
