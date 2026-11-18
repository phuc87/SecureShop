import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import productApi from '../../api/productApi';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import ProductImage from '../../components/common/ProductImage';
import Icon from '../../components/common/Icon';
import { ErrorState, Spinner } from '../../components/common/StateViews';
import { formatCurrency } from '../../utils/format';

const EMPTY = {
  name: '', sku: '', slug: '', categoryId: '', brandId: '', placement: '', warrantyMonths: 24, status: 'ACTIVE', featured: false,
  price: '', salePrice: '', stock: 0, shortDescription: '', description: '', images: [], specs: [],
};

/** Gợi ý thông số theo loại thiết bị, bấm 1 lần để thêm các dòng còn thiếu. */
const SPEC_PRESETS = {
  camera: [['resolution_mp', 'Độ phân giải (MP)'], ['resolution', 'Độ phân giải'], ['night_distance_m', 'Tầm nhìn đêm (m)'],
    ['ip_rating', 'Chống nước bụi'], ['connectivity', 'Kết nối'], ['storage', 'Lưu trữ'], ['pan_tilt', 'Xoay quét']],
  recorder: [['channels', 'Số kênh'], ['poe_ports', 'Cổng PoE'], ['max_hdd', 'Ổ cứng hỗ trợ'], ['connectivity', 'Kết nối']],
  lock: [['unlock_methods', 'Cách mở khoá'], ['connectivity', 'Kết nối'], ['battery', 'Pin'], ['fingerprint_capacity', 'Số vân tay']],
  other: [['connectivity', 'Kết nối'], ['power', 'Nguồn'], ['capacity', 'Dung lượng']],
};
const presetFor = (categoryName = '') => {
  const n = categoryName.toLowerCase();
  if (n.includes('camera') || n.includes('chuông')) return SPEC_PRESETS.camera;
  if (n.includes('đầu ghi')) return SPEC_PRESETS.recorder;
  if (n.includes('khóa') || n.includes('khoá')) return SPEC_PRESETS.lock;
  return SPEC_PRESETS.other;
};

/** "Tầm nhìn đêm (m)" -> "tam_nhin_dem_m" (mã thông số tự tạo từ tên). */
const toKey = (label) => label.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'thong_so';

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [loaded, setLoaded] = useState(isNew);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

  const { data: categories } = useFetch(() => productApi.categories(), []);
  const { data: brands } = useFetch(() => productApi.brands(), []);
  const { error: loadError } = useFetch(() => (isNew ? Promise.resolve(null) : adminApi.product(id).then((p) => {
    setForm({
      ...EMPTY, ...p, categoryId: String(p.categoryId), brandId: p.brandId ? String(p.brandId) : '', placement: p.placement || '',
      price: String(Math.round(p.price)), salePrice: p.salePrice != null ? String(Math.round(p.salePrice)) : '',
      shortDescription: p.shortDescription || '', description: p.description || '',
    });
    setLoaded(true);
    return p;
  })), [id]);

  useEffect(() => { document.title = isNew ? 'Thêm sản phẩm - Quản trị' : 'Sửa sản phẩm - Quản trị'; }, [isNew]);

  if (loadError) return <ErrorState message={loadError} />;
  if (!loaded) return <Spinner />;

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };
  const onChange = (e) => set(e.target.name, e.target.type === 'checkbox' ? e.target.checked : e.target.value);

  // ===== Ảnh =====
  const uploadFiles = async (files) => {
    const list = [...files].slice(0, 10 - form.images.length);
    for (const [i, file] of list.entries()) {
      setUploading(`Đang tải ảnh ${i + 1}/${list.length}...`);
      try {
        const { url } = await adminApi.uploadProductImage(file);
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      } catch (err) {
        toast.error(`${file.name}: ${err.message}`);
      }
    }
    setUploading(null);
  };
  const moveImage = (idx, dir) => setForm((f) => {
    const imgs = [...f.images];
    const j = idx + dir;
    if (j < 0 || j >= imgs.length) return f;
    [imgs[idx], imgs[j]] = [imgs[j], imgs[idx]];
    return { ...f, images: imgs };
  });

  // ===== Thông số =====
  const setSpec = (idx, key, value) => setForm((f) => ({
    ...f, specs: f.specs.map((s, i) => (i === idx ? { ...s, [key]: value } : s)),
  }));
  const addSpec = () => setForm((f) => ({ ...f, specs: [...f.specs, { key: '', label: '', value: '' }] }));
  const removeSpec = (idx) => setForm((f) => ({ ...f, specs: f.specs.filter((_, i) => i !== idx) }));
  const categoryName = categories?.find((c) => String(c.id) === form.categoryId)?.name;
  const addPreset = () => setForm((f) => {
    const have = new Set(f.specs.map((s) => s.key));
    const extra = presetFor(categoryName).filter(([k]) => !have.has(k)).map(([key, label]) => ({ key, label, value: '' }));
    return { ...f, specs: [...f.specs, ...extra] };
  });

  // ===== Lưu =====
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên sản phẩm';
    if (!form.sku.trim()) e.sku = 'Vui lòng nhập mã SKU';
    else if (!/^[A-Za-z0-9._/-]+$/.test(form.sku.trim())) e.sku = 'SKU chỉ gồm chữ không dấu, số và . _ / -';
    if (!form.categoryId) e.categoryId = 'Vui lòng chọn danh mục';
    if (form.price === '' || Number(form.price) < 0) e.price = 'Vui lòng nhập giá bán hợp lệ';
    if (form.salePrice !== '' && Number(form.salePrice) >= Number(form.price)) e.salePrice = 'Giá khuyến mãi phải nhỏ hơn giá gốc';
    if (form.stock === '' || Number(form.stock) < 0) e.stock = 'Tồn kho không hợp lệ';
    // Dòng chưa điền giá trị (vd. dòng gợi ý) được bỏ qua khi lưu; chỉ báo lỗi khi có giá trị mà thiếu tên
    form.specs.forEach((s, i) => {
      if (s.value.trim() && !s.label.trim()) e[`specLabel${i}`] = 'Thiếu tên thông số';
    });
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error('Vui lòng kiểm tra lại các ô báo đỏ');
      return;
    }
    // Bỏ dòng thông số trống, tự tạo mã cho dòng mới, tránh trùng mã
    const used = new Set();
    const specs = form.specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => {
      let key = s.key || toKey(s.label);
      let n = 2;
      while (used.has(key)) key = `${(s.key || toKey(s.label)).slice(0, 46)}_${n++}`;
      used.add(key);
      return { key, label: s.label.trim(), value: s.value.trim() };
    });
    const payload = {
      ...form, specs, sku: form.sku.trim(), slug: form.slug.trim(),
      categoryId: Number(form.categoryId), brandId: form.brandId ? Number(form.brandId) : null,
      placement: form.placement || null, price: Number(form.price),
      salePrice: form.salePrice === '' ? null : Number(form.salePrice), stock: Number(form.stock),
      warrantyMonths: Number(form.warrantyMonths),
    };
    setSaving(true);
    try {
      const saved = isNew ? await adminApi.createProduct(payload) : await adminApi.updateProduct(id, payload);
      toast.success(isNew ? `Đã thêm "${saved.name}"` : 'Đã lưu thay đổi');
      navigate(isNew ? `/admin/products/${saved.id}` : '/admin/products', { replace: isNew });
    } catch (err) {
      setServerError(err.message);
      setErrors(err.errors || {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}, hint) => (
    <label className="field" htmlFor={`pf-${name}`}>
      <span>{label}</span>
      <input id={`pf-${name}`} name={name} className={`input ${errors[name] ? 'input-error' : ''}`}
             value={form[name]} onChange={onChange} aria-invalid={!!errors[name]} {...props} />
      {errors[name] ? <small className="field-error">{errors[name]}</small> : hint && <small className="muted">{hint}</small>}
    </label>
  );

  return (
    <form className="product-form" onSubmit={onSubmit} noValidate>
      <Link to="/admin/products" className="back-link"><Icon name="arrowLeft" size={16} /> Danh sách sản phẩm</Link>
      <div className="page-head">
        <div>
          <h1>{isNew ? 'Thêm sản phẩm' : 'Sửa sản phẩm'}</h1>
          {!isNew && form.status === 'ACTIVE' && <a className="small" href={`/products/${form.slug}`} target="_blank" rel="noreferrer">Xem ngoài cửa hàng ↗</a>}
        </div>
      </div>
      {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}

      <div className="pf-grid">
        <div className="pf-main">
          <section className="panel">
            <h2>Thông tin cơ bản</h2>
            {field('name', 'Tên sản phẩm *', { maxLength: 255, placeholder: 'Camera WiFi Ezviz C6N 2MP xoay 360°' })}
            <div className="form-grid">
              {field('sku', 'Mã SKU *', { maxLength: 50, placeholder: 'EZ-C6N-2MP', style: { textTransform: 'uppercase' } })}
              {field('slug', 'Đường dẫn (URL)', { maxLength: 280, placeholder: 'tự tạo từ tên nếu để trống' })}
            </div>
            {field('shortDescription', 'Mô tả ngắn (hiện dưới giá)', { maxLength: 500 })}
            <label className="field" htmlFor="pf-description">
              <span>Mô tả chi tiết</span>
              <textarea id="pf-description" name="description" rows="6" className="input" value={form.description} onChange={onChange}
                        placeholder="Tính năng nổi bật, phụ kiện đi kèm, hướng dẫn lắp đặt..." />
            </label>
          </section>

          <section className="panel">
            <div className="section-row">
              <h2>Hình ảnh <small className="muted">({form.images.length}/10 · ảnh đầu tiên là ảnh đại diện)</small></h2>
            </div>
            <div className="pf-images">
              {form.images.map((url, i) => (
                <figure key={url} className={i === 0 ? 'primary' : ''}>
                  <ProductImage src={url} alt={`Ảnh ${i + 1}`} categoryName={categoryName} iconSize={30} />
                  {i === 0 && <figcaption>Ảnh đại diện</figcaption>}
                  <div className="pf-img-actions">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Đưa lên trước">←</button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} aria-label="Đưa ra sau">→</button>
                    <button type="button" onClick={() => set('images', form.images.filter((u) => u !== url))} aria-label="Xoá ảnh">✕</button>
                  </div>
                </figure>
              ))}
              {form.images.length < 10 && (
                <button type="button" className="pf-add-image" onClick={() => fileRef.current?.click()} disabled={!!uploading}>
                  <Icon name="inbox" size={26} />
                  <span>{uploading || 'Thêm ảnh'}</span>
                  <small>JPG, PNG, WEBP · tối đa 5MB</small>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden id="pf-image-input"
                     onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
            </div>
          </section>

          <section className="panel">
            <div className="section-row">
              <h2>Thông số kỹ thuật</h2>
              <button type="button" className="btn btn-outline btn-sm" onClick={addPreset} disabled={!form.categoryId}
                      title={form.categoryId ? '' : 'Chọn danh mục trước'}>＋ Thêm thông số gợi ý</button>
            </div>
            {form.specs.length === 0
              ? <p className="muted small">Chưa có thông số. Thông số giúp khách so sánh và giúp trợ lý AI tư vấn chính xác.</p>
              : <p className="muted small">Dòng nào để trống giá trị sẽ tự bỏ qua khi lưu.</p>}
            <div className="spec-rows">
              {form.specs.map((s, i) => (
                <div key={i} className="spec-row">
                  <input className={`input ${errors[`specLabel${i}`] ? 'input-error' : ''}`} aria-label={`Tên thông số ${i + 1}`}
                         placeholder="Tên (vd. Độ phân giải)" value={s.label} onChange={(e) => setSpec(i, 'label', e.target.value)} />
                  <input className="input" aria-label={`Giá trị thông số ${i + 1}`}
                         placeholder="Giá trị (vd. 2K 4MP)" value={s.value} onChange={(e) => setSpec(i, 'value', e.target.value)} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => removeSpec(i)} aria-label={`Xoá thông số ${i + 1}`}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="link-btn" onClick={addSpec}>＋ Thêm 1 dòng</button>
          </section>
        </div>

        <aside className="pf-side">
          <section className="panel">
            <h2>Bán hàng</h2>
            <label className="field" htmlFor="pf-status">
              <span>Trạng thái</span>
              <select id="pf-status" name="status" className="input" value={form.status} onChange={onChange}>
                <option value="ACTIVE">Đang bán</option>
                <option value="HIDDEN">Ẩn (không hiện ở cửa hàng)</option>
              </select>
            </label>
            {field('price', 'Giá gốc (₫) *', { type: 'number', min: 0, step: 1000, inputMode: 'numeric' },
              form.price !== '' ? formatCurrency(form.price) : null)}
            {field('salePrice', 'Giá khuyến mãi (₫)', { type: 'number', min: 0, step: 1000, inputMode: 'numeric' },
              form.salePrice !== '' ? `${formatCurrency(form.salePrice)} · giảm ${Math.round((1 - form.salePrice / form.price) * 100) || 0}%` : 'Để trống nếu không giảm giá')}
            {field('stock', 'Tồn kho *', { type: 'number', min: 0, inputMode: 'numeric' })}
            <label className="check-option">
              <input type="checkbox" name="featured" checked={form.featured} onChange={onChange} />
              <span>Sản phẩm nổi bật (hiện ở trang chủ)</span>
            </label>
          </section>

          <section className="panel">
            <h2>Phân loại</h2>
            <label className="field" htmlFor="pf-categoryId">
              <span>Danh mục *</span>
              <select id="pf-categoryId" name="categoryId" className={`input ${errors.categoryId ? 'input-error' : ''}`} value={form.categoryId} onChange={onChange}>
                <option value="">-- Chọn danh mục --</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <small className="field-error">{errors.categoryId}</small>}
            </label>
            <label className="field" htmlFor="pf-brandId">
              <span>Thương hiệu</span>
              <select id="pf-brandId" name="brandId" className="input" value={form.brandId} onChange={onChange}>
                <option value="">-- Không có --</option>
                {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="field" htmlFor="pf-placement">
              <span>Vị trí lắp đặt</span>
              <select id="pf-placement" name="placement" className="input" value={form.placement} onChange={onChange}>
                <option value="">-- Không áp dụng --</option>
                <option value="INDOOR">Trong nhà</option>
                <option value="OUTDOOR">Ngoài trời</option>
                <option value="BOTH">Trong nhà & ngoài trời</option>
              </select>
            </label>
            {field('warrantyMonths', 'Bảo hành (tháng)', { type: 'number', min: 0, max: 120, inputMode: 'numeric' })}
          </section>

          <div className="pf-save">
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={saving || !!uploading}>
              {saving ? 'Đang lưu...' : isNew ? 'Thêm sản phẩm' : 'Lưu thay đổi'}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
