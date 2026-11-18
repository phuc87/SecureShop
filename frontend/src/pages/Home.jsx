import { Link } from 'react-router-dom';
import productApi from '../api/productApi';
import contentApi from '../api/contentApi';
import useFetch from '../hooks/useFetch';
import ProductGrid from '../components/product/ProductGrid';
import DeviceIcon from '../components/common/DeviceIcon';
import Icon from '../components/common/Icon';
import Stars from '../components/common/Stars';
import { ErrorState, Spinner } from '../components/common/StateViews';
import { SHOP } from '../utils/shopInfo';

/** Lý do chọn shop: nội dung tĩnh, sửa trực tiếp tại đây. */
const REASONS = [
  { icon: 'shieldCheck', title: 'Chính hãng 100%', text: 'Nhập trực tiếp từ nhà phân phối Ezviz, Imou, Hikvision, Dahua, Philips. Có tem và hoá đơn VAT.' },
  { icon: 'award', title: 'Bảo hành 24 tháng', text: 'Đổi mới trong 7 ngày đầu nếu lỗi do nhà sản xuất. Bảo hành tận nơi tại TP.HCM và Hà Nội.' },
  { icon: 'tool', title: 'Lắp đặt tận nơi', text: 'Kỹ thuật viên khảo sát, đi dây gọn gàng và cài ứng dụng xem trên điện thoại cho bạn.' },
  { icon: 'cpu', title: 'Trợ lý AI tư vấn', text: 'Mô tả nhu cầu như diện tích, ngân sách, trong nhà hay ngoài trời; AI gợi ý thiết bị phù hợp ngay.' },
  { icon: 'video', title: 'Tư vấn qua video call', text: 'Gọi video với tư vấn viên để xem thiết bị thật và hình ảnh ban đêm trước khi quyết định mua.' },
  { icon: 'tag', title: 'Giá minh bạch', text: 'Giá niêm yết rõ ràng trên website, không phát sinh chi phí ẩn khi lắp đặt.' },
];

const STEPS = [
  { icon: 'search', title: 'Chọn hoặc hỏi tư vấn', text: 'Tự lọc sản phẩm, hỏi trợ lý AI hoặc chat với tư vấn viên.' },
  { icon: 'bag', title: 'Đặt hàng', text: 'Thanh toán khi nhận hàng hoặc chuyển khoản. Email xác nhận gửi ngay.' },
  { icon: 'truck', title: 'Giao hàng & lắp đặt', text: 'Giao trong 24 giờ nội thành, kỹ thuật viên hẹn giờ lắp đặt.' },
  { icon: 'headset', title: 'Hỗ trợ sau bán', text: 'Bảo hành 24 tháng, hỗ trợ cài đặt lại ứng dụng miễn phí.' },
];

function ProductSection({ title, subtitle, params, moreLink, accent }) {
  const { data, loading, error, reload } = useFetch(() => productApi.search(params), [JSON.stringify(params)]);
  if (data && data.content.length === 0) return null;
  return (
    <section className={`home-section ${accent ? 'section-accent' : ''}`}>
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <Link to={moreLink} className="see-all">Xem tất cả <Icon name="arrowRight" size={16} /></Link>
      </div>
      {loading && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && <ProductGrid products={data.content} carousel />}
    </section>
  );
}

export default function Home() {
  const { data: categories } = useFetch(() => productApi.categories(), []);
  const { data: brands } = useFetch(() => productApi.brands(), []);
  const { data: allProducts } = useFetch(() => productApi.search({ size: 1 }), []);
  const { data: reviews } = useFetch(() => contentApi.latestReviews(3), []);

  const stats = [
    { value: allProducts ? `${allProducts.totalElements}+` : '…', label: 'Sản phẩm' },
    { value: brands ? brands.length : '…', label: 'Thương hiệu' },
    { value: '24', label: 'Tháng bảo hành' },
    { value: `${new Date().getFullYear() - SHOP.foundedYear}+`, label: 'Năm kinh nghiệm' },
  ];

  return (
    <>
      {/* 1. HERO */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <p className="eyebrow">Thiết bị an ninh chính hãng</p>
            <h1>Bảo vệ ngôi nhà và cửa hàng của bạn, 24/7</h1>
            <p>Camera, khoá vân tay, chuông cửa có hình và hệ thống báo động. Không biết chọn loại nào?
              Trợ lý AI và tư vấn viên sẽ giúp bạn chọn đúng thiết bị theo diện tích và ngân sách.</p>
            <div className="hero-actions">
              <Link to="/products?featured=true" className="btn btn-primary btn-lg">Xem sản phẩm nổi bật</Link>
              <Link to="/contact" className="btn btn-ghost btn-lg">Nhận tư vấn miễn phí</Link>
            </div>
          </div>
          <div className="hero-stats">
            {stats.map((s) => (
              <div key={s.label} className="hero-stat">
                <b>{s.value}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        {/* 2. DANH MỤC */}
        {categories && (
          <section className="home-section">
            <div className="section-head"><h2>Danh mục sản phẩm</h2></div>
            <div className="category-grid scroll-sm">
              {categories.map((c) => (
                <Link key={c.id} to={`/products?category=${c.slug}`} className="category-tile">
                  <DeviceIcon categoryName={c.name} size={44} />
                  <span>{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 3. NỔI BẬT */}
        <ProductSection title="Sản phẩm nổi bật" subtitle="Được tư vấn viên của SecureShop chọn lọc"
                        params={{ featured: true, size: 8, sort: 'best_selling' }} moreLink="/products?featured=true" />

        {/* 4. GIẢM GIÁ */}
        <ProductSection title="Đang giảm giá" subtitle="Ưu đãi có hạn, số lượng giới hạn" accent
                        params={{ onSale: true, size: 4, sort: 'price_asc' }} moreLink="/products?onSale=true" />
      </div>

      {/* 5. TẠI SAO CHỌN */}
      <section className="why-section">
        <div className="container">
          <div className="section-head center">
            <div>
              <p className="eyebrow">Vì sao khách hàng tin chọn</p>
              <h2>Tại sao chọn SecureShop?</h2>
            </div>
          </div>
          <div className="why-grid">
            {REASONS.map((r) => (
              <article key={r.title} className="why-card">
                <span className="why-icon"><Icon name={r.icon} size={26} /></span>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        {/* 6. QUY TRÌNH */}
        <section className="home-section">
          <div className="section-head"><h2>Mua hàng chỉ với 4 bước</h2></div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-num" aria-hidden="true">{i + 1}</span>
                <Icon name={s.icon} size={28} className="step-icon" />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 7. BÁN CHẠY */}
        <ProductSection title="Bán chạy nhất" params={{ sort: 'best_selling', size: 4 }}
                        moreLink="/products?sort=best_selling" />

        {/* 8. ĐÁNH GIÁ */}
        {reviews && reviews.length > 0 && (
          <section className="home-section">
            <div className="section-head"><h2>Khách hàng nói gì về chúng tôi</h2></div>
            <div className="review-grid scroll-sm">
              {reviews.map((r) => (
                <figure key={r.id} className="review-card">
                  <Stars value={r.rating} />
                  <blockquote>“{r.comment}”</blockquote>
                  <figcaption>
                    <span className="avatar" aria-hidden="true">{r.customerName.charAt(0)}</span>
                    <span>
                      <b>{r.customerName}</b>
                      <Link to={`/products/${r.productSlug}`}>Đã mua: {r.productName}</Link>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* 9. THƯƠNG HIỆU */}
        {brands && (
          <section className="home-section">
            <div className="section-head"><h2>Thương hiệu phân phối</h2></div>
            <div className="brand-row">
              {brands.map((b) => (
                <Link key={b.id} to={`/products?brand=${b.slug}`} className="brand-chip">{b.name}</Link>
              ))}
            </div>
          </section>
        )}

        {/* 10. KÊU GỌI HÀNH ĐỘNG */}
        <section className="cta-band">
          <div>
            <h2>Chưa biết chọn thiết bị nào?</h2>
            <p>Để lại thông tin, tư vấn viên sẽ gọi lại trong 15 phút (giờ hành chính) để tư vấn miễn phí.</p>
          </div>
          <div className="cta-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">Gửi yêu cầu tư vấn</Link>
            <a href={SHOP.hotlineHref} className="btn btn-outline btn-lg"><Icon name="phone" size={18} /> {SHOP.hotline}</a>
          </div>
        </section>
      </div>
    </>
  );
}
