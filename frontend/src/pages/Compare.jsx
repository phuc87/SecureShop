import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import productApi from '../api/productApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/common/ProductImage';
import Icon from '../components/common/Icon';
import { ErrorState, Spinner } from '../components/common/StateViews';
import { formatCurrency } from '../utils/format';

const SLOTS = ['a', 'b'];

/**
 * Trang so sánh 2 sản phẩm: /compare?a=<slug>&b=<slug>
 * Chọn đủ 2 sản phẩm -> server chấm điểm từng tiêu chí và đề xuất nên chọn cái nào.
 */
export default function Compare() {
  const [params, setParams] = useSearchParams();
  const slugs = SLOTS.map((k) => params.get(k) || '');
  const [details, setDetails] = useState({}); // slug -> chi tiết sản phẩm (false = không tìm thấy)
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const setSlot = (index, slug) => {
    const next = new URLSearchParams(params);
    if (slug) next.set(SLOTS[index], slug); else next.delete(SLOTS[index]);
    setParams(next);
  };

  // Lấy chi tiết từng sản phẩm đã chọn (để hiện thẻ sản phẩm + gợi ý sản phẩm cùng loại)
  useEffect(() => {
    slugs.filter((s) => s && details[s] === undefined).forEach((s) => {
      productApi.getBySlug(s)
        .then((d) => setDetails((prev) => ({ ...prev, [s]: d })))
        .catch(() => setDetails((prev) => ({ ...prev, [s]: false })));
    });
  }, [slugs[0], slugs[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đủ 2 sản phẩm -> so sánh
  useEffect(() => {
    const [a, b] = slugs;
    setResult(null);
    setError('');
    if (!a || !b || a === b) return undefined;
    let cancelled = false;
    setLoading(true);
    productApi.compare([a, b])
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slugs[0], slugs[1], reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = slugs.map((s) => (s ? details[s] : null));

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link><span>/</span><span aria-current="page">So sánh sản phẩm</span>
      </nav>
      <div className="cmp-head">
        <h1>So sánh sản phẩm</h1>
        <p className="muted">Chọn 2 sản phẩm, hệ thống sẽ đối chiếu từng thông số và đề xuất nên chọn cái nào.</p>
      </div>

      <div className="cmp-slots">
        {slugs.map((slug, i) => {
          const other = chosen[1 - i];
          return (
            <section key={SLOTS[i]} className="cmp-slot" aria-label={`Sản phẩm thứ ${i + 1}`}>
              <span className="cmp-slot-no">Sản phẩm {i + 1}</span>
              {!slug && (
                <ProductPicker exclude={slugs[1 - i]} other={other || null} onPick={(s) => setSlot(i, s)} />
              )}
              {slug && chosen[i] === undefined && <Spinner />}
              {slug && chosen[i] === false && (
                <div className="cmp-missing">
                  <p>Không tìm thấy sản phẩm này (có thể đã ngừng bán).</p>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setSlot(i, '')}>Chọn sản phẩm khác</button>
                </div>
              )}
              {slug && chosen[i] && (
                <SlotCard product={chosen[i]} item={result?.products[i]} isWinner={result?.winner === i}
                          onChange={() => setSlot(i, '')} />
              )}
            </section>
          );
        })}
        <span className="cmp-vs" aria-hidden="true">VS</span>
      </div>

      {slugs[0] && slugs[0] === slugs[1] && (
        <div className="alert alert-info">Bạn đang chọn cùng 1 sản phẩm ở cả 2 ô, hãy đổi một bên.</div>
      )}
      {loading && <Spinner label="Đang so sánh..." />}
      {error && <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {result && <CompareResult result={result} />}
    </div>
  );
}

/** Ô tìm & chọn sản phẩm. Chưa gõ gì thì gợi ý sản phẩm cùng loại với bên kia (hoặc sản phẩm bán chạy). */
function ProductPicker({ exclude, other, onPick }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const categorySlug = other?.category?.slug;

  useEffect(() => {
    let cancelled = false;
    const params = q.trim()
      ? { q: q.trim(), size: 8 }
      : categorySlug ? { category: categorySlug, size: 8, sort: 'best_selling' } : { sort: 'best_selling', size: 8 };
    const t = setTimeout(() => {
      productApi.search(params)
        .then((res) => { if (!cancelled) setList(res.content.filter((p) => p.slug !== exclude)); })
        .catch(() => { if (!cancelled) setList([]); });
    }, q ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, categorySlug, exclude]);

  const title = q.trim() ? 'Kết quả tìm kiếm' : categorySlug ? `Gợi ý cùng loại: ${other.category.name}` : 'Sản phẩm bán chạy';

  return (
    <div className="cmp-picker">
      <label className="sr-only" htmlFor={`cmp-search-${exclude || 'x'}`}>Tìm sản phẩm để so sánh</label>
      <div className="cmp-search">
        <Icon name="search" size={18} />
        <input id={`cmp-search-${exclude || 'x'}`} className="input" placeholder="Tìm sản phẩm để so sánh..."
               value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      <small className="muted">{title}</small>
      {list === null ? <Spinner /> : list.length === 0 ? (
        <p className="muted small">Không tìm thấy sản phẩm phù hợp.</p>
      ) : (
        <ul className="cmp-options">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p.slug)}>
                <span className="cmp-opt-thumb"><ProductImage src={p.thumbnailUrl} alt="" categoryName={p.categoryName} iconSize={22} /></span>
                <span className="cmp-opt-name">{p.name}</span>
                <b>{formatCurrency(p.effectivePrice)}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Thẻ sản phẩm đã chọn: ảnh, tên, giá, đánh giá, nút mua / đổi. */
function SlotCard({ product, item, isWinner, onChange }) {
  const { isAdmin } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();
  const onSale = product.salePrice != null && Number(product.salePrice) < Number(product.price);

  const add = () => {
    const qty = addItem({ ...product, categoryName: product.category?.name }, 1);
    if (qty > 0) toast.success(`Đã thêm "${product.name}" vào giỏ`);
  };

  return (
    <div className={`cmp-card ${isWinner ? 'is-winner' : ''}`}>
      {isWinner && <span className="cmp-badge"><Icon name="award" size={16} /> Đề xuất</span>}
      <Link to={`/products/${product.slug}`} className="cmp-card-img">
        <ProductImage src={product.thumbnailUrl} alt={product.name} categoryName={product.category?.name} iconSize={48} />
      </Link>
      <Link to={`/products/${product.slug}`} className="cmp-card-name">{product.name}</Link>
      <div className="cmp-card-price">
        <b>{formatCurrency(product.effectivePrice)}</b>
        {onSale && <s className="muted">{formatCurrency(product.price)}</s>}
      </div>
      {item && (
        <small className="muted">
          {item.ratingAvg != null ? `${item.ratingAvg}★ · ${item.ratingCount} đánh giá · ` : ''}Đã bán {item.soldCount}
        </small>
      )}
      <div className="cmp-card-actions">
        {!isAdmin && (
          <button type="button" className="btn btn-primary btn-sm" onClick={add} disabled={product.stock <= 0}>
            <Icon name="bag" size={16} /> {product.stock > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
          </button>
        )}
        <button type="button" className="btn btn-outline btn-sm" onClick={onChange}>Đổi sản phẩm</button>
      </div>
    </div>
  );
}

/** Kết luận + bảng so sánh từng tiêu chí. */
function CompareResult({ result }) {
  const { products, rows, scores, winner, verdict, reasons, advice } = result;
  const groups = [...new Set(rows.map((r) => r.group))];

  return (
    <>
      <section className={`cmp-verdict ${winner == null ? 'is-tie' : ''}`} aria-labelledby="cmp-verdict-title">
        <div className="cmp-verdict-head">
          <span className="cmp-verdict-icon"><Icon name={winner == null ? 'compare' : 'award'} size={26} /></span>
          <div>
            <small>Đề xuất của SecureShop</small>
            <h2 id="cmp-verdict-title">{verdict}</h2>
          </div>
        </div>

        <div className="cmp-scores">
          {products.map((p, i) => (
            <div key={p.id} className={`cmp-score ${winner === i ? 'is-win' : ''}`}>
              <div className="cmp-score-label"><span>{p.name}</span><b>{scores[i]} điểm</b></div>
              <div className="cmp-bar" role="progressbar" aria-valuenow={scores[i]} aria-valuemin={0} aria-valuemax={100}
                   aria-label={`Điểm của ${p.name}`}>
                <span style={{ width: `${scores[i]}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="cmp-reasons">
          {products.map((p, i) => (
            <div key={p.id}>
              <h3>Điểm mạnh của {p.name}</h3>
              {reasons[i].length ? (
                <ul>{reasons[i].map((r) => <li key={r}><Icon name="checkCircle" size={16} />{r}</li>)}</ul>
              ) : <p className="muted small">Không có điểm nổi trội hơn ở các tiêu chí được chấm.</p>}
            </div>
          ))}
        </div>

        {advice.length > 0 && (
          <ul className="cmp-advice">
            {advice.map((a) => <li key={a}>{a}</li>)}
          </ul>
        )}

        <details className="cmp-method">
          <summary>Hệ thống chấm điểm như thế nào?</summary>
          <p>
            Mỗi tiêu chí có một trọng số (giá bán 3; đánh giá, độ phân giải, tầm nhìn đêm, dung lượng 2; bảo hành, xoay quét, AI 1,5;
            các tiêu chí khác 1). Sản phẩm tốt hơn ở tiêu chí nào được trọn điểm tiêu chí đó, bằng nhau thì mỗi bên một nửa.
            Tiêu chí thiếu số liệu ở một bên chỉ hiển thị, không tính điểm. Chênh lệch dưới 10% được xem là ngang nhau.
          </p>
        </details>
      </section>

      <section className="cmp-table" aria-label="Bảng so sánh chi tiết">
        <div className="cmp-row cmp-row-head">
          <span>Tiêu chí</span>
          {products.map((p) => <b key={p.id}>{p.name}</b>)}
        </div>
        {groups.map((g) => (
          <div key={g} className="cmp-group">
            <h3>{g}</h3>
            {rows.filter((r) => r.group === g).map((r) => (
              <div key={r.label} className="cmp-row">
                <span className="cmp-label">{r.label}</span>
                {r.values.map((v, i) => (
                  <span key={i} className={`cmp-val ${r.winner === i ? 'is-win' : ''}`}>
                    {r.winner === i && <Icon name="checkCircle" size={16} />}
                    {v}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
        <p className="muted small cmp-note"><Icon name="checkCircle" size={14} /> = tốt hơn ở tiêu chí đó</p>
      </section>
    </>
  );
}
