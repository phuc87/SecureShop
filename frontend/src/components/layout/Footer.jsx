import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { SHOP } from '../../utils/shopInfo';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>{SHOP.name}</h3>
          <p>{SHOP.slogan}. Có trợ lý AI và tư vấn viên giúp bạn chọn đúng thiết bị cho nhà ở, cửa hàng và văn phòng.</p>
          <ul className="footer-contact">
            <li><Icon name="mapPin" size={16} /> {SHOP.address}</li>
            <li><Icon name="phone" size={16} /> {SHOP.hotline}</li>
            <li><Icon name="mail" size={16} /> {SHOP.email}</li>
          </ul>
        </div>
        <div>
          <h3>Về chúng tôi</h3>
          <ul>
            <li><Link to="/">Trang chủ</Link></li>
            <li><Link to="/products">Sản phẩm</Link></li>
            <li><Link to="/about">Giới thiệu</Link></li>
            <li><Link to="/contact">Liên hệ</Link></li>
          </ul>
        </div>
        <div>
          <h3>Danh mục</h3>
          <ul>
            <li><Link to="/products?category=camera-wifi-trong-nha">Camera trong nhà</Link></li>
            <li><Link to="/products?category=camera-ngoai-troi">Camera ngoài trời</Link></li>
            <li><Link to="/products?category=khoa-cua-thong-minh">Khoá cửa thông minh</Link></li>
            <li><Link to="/products?category=dau-ghi-hinh">Đầu ghi hình</Link></li>
          </ul>
        </div>
        <div>
          <h3>Hỗ trợ khách hàng</h3>
          <ul>
            <li>Giờ làm việc: {SHOP.hours}</li>
            <li>Bảo hành chính hãng 24 tháng</li>
            <li>Đổi mới trong 7 ngày nếu lỗi</li>
            <li><Link to="/contact">Gửi yêu cầu hỗ trợ</Link></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} {SHOP.name} · An toàn trong từng lựa chọn, vững tâm trong từng kết nối!</div>
    </footer>
  );
}
