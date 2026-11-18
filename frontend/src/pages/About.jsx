import { Link } from 'react-router-dom';
import productApi from '../api/productApi';
import useFetch from '../hooks/useFetch';
import Icon from '../components/common/Icon';
import { SHOP } from '../utils/shopInfo';

const VALUES = [
  { icon: 'target', title: 'Sứ mệnh', text: 'Giúp mọi gia đình và cửa hàng nhỏ tiếp cận hệ thống an ninh chất lượng với chi phí hợp lý, không cần hiểu biết kỹ thuật.' },
  { icon: 'eye', title: 'Tầm nhìn', text: 'Trở thành cửa hàng thiết bị an ninh trực tuyến được tin dùng nhất, nơi khách hàng được tư vấn đúng nhu cầu thay vì được bán thật nhiều.' },
  { icon: 'heart', title: 'Giá trị cốt lõi', text: 'Trung thực trong tư vấn, minh bạch về giá, trách nhiệm đến cùng với sản phẩm đã bán.' },
];

const COMMITMENTS = [
  'Chỉ bán hàng chính hãng, có tem chống hàng giả và hoá đơn đầy đủ.',
  'Tư vấn đúng nhu cầu: không cần 8 camera thì không bán 8 camera.',
  'Giá trên website là giá cuối cùng, không phát sinh khi lắp đặt.',
  'Đổi mới trong 7 ngày, bảo hành 24 tháng, hỗ trợ cài đặt trọn đời.',
  'Bảo mật thông tin khách hàng và hình ảnh camera tuyệt đối.',
];

export default function About() {
  const { data: brands } = useFetch(() => productApi.brands(), []);
  const { data: categories } = useFetch(() => productApi.categories(), []);
  const { data: products } = useFetch(() => productApi.search({ size: 1 }), []);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">Giới thiệu</p>
          <h1>Về {SHOP.name}</h1>
          <p>{SHOP.slogan}. Thành lập từ năm {SHOP.foundedYear}, chúng tôi đồng hành cùng các gia đình,
            cửa hàng và văn phòng trong việc bảo vệ tài sản và người thân.</p>
        </div>
      </section>

      <div className="container page">
        <section className="about-story">
          <div>
            <h2>Câu chuyện của chúng tôi</h2>
            <p>{SHOP.name} bắt đầu từ một nhóm kỹ thuật viên lắp đặt camera. Sau hàng trăm công trình,
              chúng tôi nhận ra điều khách hàng cần nhất không phải là thiết bị đắt tiền, mà là
              <b> một người tư vấn đúng</b>: lắp mấy camera, đặt ở đâu, cần đầu ghi hay chỉ cần thẻ nhớ.</p>
            <p>Vì vậy website này được xây dựng với <b>trợ lý AI tư vấn</b> trả lời ngay lập tức,
              và <b>tư vấn viên sẵn sàng chat hoặc gọi video</b> để bạn xem thiết bị thật trước khi mua.</p>
          </div>
          <div className="about-numbers">
            <div><b>{products?.totalElements ?? '…'}</b><span>sản phẩm đang bán</span></div>
            <div><b>{categories?.length ?? '…'}</b><span>nhóm thiết bị</span></div>
            <div><b>{brands?.length ?? '…'}</b><span>thương hiệu chính hãng</span></div>
            <div><b>24</b><span>tháng bảo hành</span></div>
          </div>
        </section>

        <section className="home-section">
          <div className="why-grid three">
            {VALUES.map((v) => (
              <article key={v.title} className="why-card">
                <span className="why-icon"><Icon name={v.icon} size={26} /></span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section about-commit">
          <h2>Cam kết với khách hàng</h2>
          <ul className="check-list">
            {COMMITMENTS.map((c) => (
              <li key={c}><Icon name="checkCircle" size={20} /> {c}</li>
            ))}
          </ul>
        </section>

        {brands && (
          <section className="home-section">
            <h2>Đối tác thương hiệu</h2>
            <div className="brand-row">
              {brands.map((b) => (
                <Link key={b.id} to={`/products?brand=${b.slug}`} className="brand-chip">{b.name}</Link>
              ))}
            </div>
          </section>
        )}

        <section className="cta-band">
          <div>
            <h2>Cần tư vấn cho công trình của bạn?</h2>
            <p>Gửi yêu cầu, chúng tôi sẽ liên hệ lại trong giờ làm việc.</p>
          </div>
          <div className="cta-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">Liên hệ ngay</Link>
          </div>
        </section>
      </div>
    </>
  );
}
