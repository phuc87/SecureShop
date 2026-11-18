import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChatSocket } from '../../context/ChatSocketContext';
import adminApi from '../../api/adminApi';
import chatApi from '../../api/chatApi';
import ThemeToggle from '../common/ThemeToggle';
import Icon from '../common/Icon';
import { Logo } from './Header';

/**
 * Khung trang quản trị.
 * Máy tính: thanh menu cố định bên trái.
 * Điện thoại / máy tính bảng (<= 960px): menu ẩn, bấm nút ☰ để trượt ra.
 */
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { addListener } = useChatSocket();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [newContacts, setNewContacts] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const chatTimer = useRef(null);

  // Chuyển trang thì đóng menu trượt
  useEffect(() => setNavOpen(false), [pathname, search]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  // Số tin liên hệ chưa xử lý: tải khi mở trang, mỗi 60 giây, và khi admin vừa xử lý 1 tin
  useEffect(() => {
    const load = () => adminApi.countNewContacts().then((r) => setNewContacts(r.count)).catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener('contacts:changed', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('contacts:changed', load);
    };
  }, []);

  // Số đơn chờ xác nhận: tải khi mở trang, mỗi 60 giây, và khi admin vừa xử lý 1 đơn
  useEffect(() => {
    const load = () => adminApi.orderCounts().then((r) => setPendingOrders(r.PENDING || 0)).catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener('orders:changed', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('orders:changed', load);
    };
  }, [pathname]);

  // Số tin chat chưa đọc: tải lại mỗi khi có sự kiện chat (gộp các sự kiện sát nhau)
  useEffect(() => {
    const load = () => chatApi.adminUnreadCount().then((r) => setUnreadChat(r.count)).catch(() => {});
    load();
    const off = addListener((ev) => {
      if (ev.type === 'MESSAGE' || ev.type === 'CONVERSATION') {
        clearTimeout(chatTimer.current);
        chatTimer.current = setTimeout(load, 400);
      }
    });
    return () => { off(); clearTimeout(chatTimer.current); };
  }, [addListener]);

  // Hiện số tin chưa đọc trên tab trình duyệt
  useEffect(() => {
    document.title = unreadChat > 0 ? `(${unreadChat}) Quản trị - SecureShop` : 'Quản trị - SecureShop';
    return () => { document.title = 'SecureShop - Thiết bị an ninh'; };
  }, [unreadChat]);

  const totalBadge = unreadChat + newContacts + pendingOrders;

  return (
    <div className={`admin-shell ${navOpen ? 'nav-open' : ''}`}>
      {navOpen && <div className="admin-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <aside id="admin-sidebar" className="admin-sidebar">
        <div className="admin-sidebar-head">
          <Logo />
          <button type="button" className="admin-nav-close" onClick={() => setNavOpen(false)} aria-label="Đóng menu">
            <Icon name="close" size={20} />
          </button>
        </div>
        <nav aria-label="Menu quản trị">
          <NavLink to="/admin" end>Tổng quan</NavLink>
          <NavLink to="/admin/orders">
            Đơn hàng {pendingOrders > 0 && <span className="menu-badge" aria-label={`${pendingOrders} đơn chờ xác nhận`}>{pendingOrders}</span>}
          </NavLink>
          <NavLink to="/admin/products">Sản phẩm</NavLink>
          <NavLink to="/admin/catalog">Danh mục &amp; thương hiệu</NavLink>
          <NavLink to="/admin/vouchers">Mã giảm giá</NavLink>
          <NavLink to="/admin/inbox">
            Hộp thư tư vấn {unreadChat > 0 && <span className="menu-badge" aria-label={`${unreadChat} tin chưa đọc`}>{unreadChat}</span>}
          </NavLink>
          <NavLink to="/admin/ai">Trợ lý AI</NavLink>
          <NavLink to="/admin/users">Người dùng</NavLink>
          <NavLink to="/admin/contacts">
            Liên hệ {newContacts > 0 && <span className="menu-badge" aria-label={`${newContacts} tin mới`}>{newContacts}</span>}
          </NavLink>
        </nav>
        <div className="admin-sidebar-foot">
          <Link to="/">← Về cửa hàng</Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-menu-btn" onClick={() => setNavOpen(true)}
                  aria-label="Mở menu quản trị" aria-expanded={navOpen} aria-controls="admin-sidebar">
            <Icon name="menu" size={22} />
            {totalBadge > 0 && <span className="badge">{totalBadge}</span>}
          </button>
          <span className="admin-greeting">Xin chào, <b>{user?.fullName}</b></span>
          <ThemeToggle />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { logout(); navigate('/'); }}>
            Đăng xuất
          </button>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
