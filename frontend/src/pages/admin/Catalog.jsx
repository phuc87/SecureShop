import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DeviceIcon from '../../components/common/DeviceIcon';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';

/** Giống SlugUtil của backend: "Khóa cửa thông minh" -> "khoa-cua-thong-minh" (chỉ để xem trước). */
const slugify = (text) => (text || '').trim().replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');

const KINDS = {
  category: {
    label: 'danh mục',
    list: adminApi.categories,
    create: adminApi.createCategory,
    update: adminApi.updateCategory,
    remove: adminApi.deleteCategory,
    empty: { name: '', slug: '', description: '', imageUrl: '', sortOrder: 0 },
    imageField: 'imageUrl',
    imageLabel: 'Ảnh minh hoạ',
  },
  brand: {
    label: 'thương hiệu',
    list: adminApi.brands,
    create: adminApi.createBrand,
    update: adminApi.updateBrand,
    remove: adminApi.deleteBrand,
    empty: { name: '', slug: '', country: '', logoUrl: '' },
    imageField: 'logoUrl',
    imageLabel: 'Logo',
  },
};

export default function Catalog() {
  const toast = useToast();
  const [kind, setKind] = useState('category');
  const cfg = KINDS[kind];
  const { data: rows, loading, error, reload } = useFetch(() => cfg.list(), [kind]);

  const [editing, setEditing] = useState(null);   // { id?, ...form } đang mở hộp thoại
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null); // dòng đang hỏi xoá
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const openCreate = () => {
    const nextOrder = kind === 'category' && rows?.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;
    setEditing({ ...cfg.empty, ...(kind === 'category' ? { sortOrder: nextOrder } : {}) });
    setErrors({});
  };
  const openEdit = (row) => {
    const form = { id: row.id };
    Object.keys(cfg.empty).forEach((k) => { form[k] = row[k] ?? ''; });
    setEditing(form);
    setErrors({});
  };
  const set = (name, value) => {
    setEditing((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined, _: undefined }));
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await adminApi.uploadProductImage(file);
      set(cfg.imageField, url);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    const name = editing.name.trim();
    if (!name) { setErrors({ name: `Vui lòng nhập tên ${cfg.label}` }); return; }
    if (editing.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(editing.slug)) {
      setErrors({ slug: 'Chỉ gồm chữ thường không dấu, số và dấu gạch ngang' });
      return;
    }
    const { id, ...payload } = editing;
    if (kind === 'category') payload.sortOrder = Number(payload.sortOrder) || 0;
    setSaving(true);
    try {
      if (id) await cfg.update(id, payload);
      else await cfg.create(payload);
      toast.success(id ? `Đã lưu ${cfg.label} "${name}"` : `Đã thêm ${cfg.label} "${name}"`);
      setEditing(null);
      reload();
    } catch (err) {
      setErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (row) => {
    if (row.productCount > 0) {
      toast.error(`"${row.name}" đang có ${row.productCount} sản phẩm, chưa xoá được. Hãy chuyển các sản phẩm sang ${cfg.label} khác trước.`);
      return;
    }
    setDeleting(row);
  };
  const confirmDelete = async () => {
    setBusy(true);
    try {
      await cfg.remove(deleting.id);
      toast.success(`Đã xoá ${cfg.label} "${deleting.name}"`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const field = (name, label, props = {}) => (
    <label className="field" htmlFor={`cat-${name}`}>
      <span>{label}</span>
      <input id={`cat-${name}`} className={`input ${errors[name] ? 'input-error' : ''}`}
             value={editing[name]} onChange={(e) => set(name, e.target.value)} {...props} />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </label>
  );

  const imageUrl = editing?.[cfg.imageField];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Danh mục &amp; thương hiệu</h1>
          <p className="muted">Nhóm sản phẩm hiện trên menu cửa hàng và bộ lọc. Chỉ xoá được khi không còn sản phẩm nào.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>+ Thêm {cfg.label}</button>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Chọn loại">
          <button type="button" role="tab" aria-selected={kind === 'category'} className={kind === 'category' ? 'active' : ''}
                  onClick={() => setKind('category')}>Danh mục</button>
          <button type="button" role="tab" aria-selected={kind === 'brand'} className={kind === 'brand' ? 'active' : ''}
                  onClick={() => setKind('brand')}>Thương hiệu</button>
        </div>
      </div>

      {loading && !rows && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {rows && rows.length === 0 && <EmptyState title={`Chưa có ${cfg.label} nào`} />}
      {rows && rows.length > 0 && (
        <div className="table-wrap table-stack-wrap">
          <table className="data-table table-stack catalog-table">
            <thead>
              {kind === 'category' ? (
                <tr><th>Thứ tự</th><th>Danh mục</th><th>Mô tả</th><th>Sản phẩm</th><th><span className="sr-only">Thao tác</span></th></tr>
              ) : (
                <tr><th>#</th><th>Thương hiệu</th><th>Quốc gia</th><th>Sản phẩm</th><th><span className="sr-only">Thao tác</span></th></tr>
              )}
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="cell-id">{kind === 'category' ? r.sortOrder : r.id}</td>
                  <td className="cell-title">
                    <div className="catalog-name">
                      <span className="catalog-thumb">
                        {r[cfg.imageField]
                          ? <img src={r[cfg.imageField]} alt="" loading="lazy" />
                          : kind === 'category' ? <DeviceIcon categoryName={r.name} size={22} /> : r.name.charAt(0)}
                      </span>
                      <span>
                        {r.name}
                        <small className="muted catalog-slug">/{r.slug}</small>
                      </span>
                    </div>
                  </td>
                  {kind === 'category'
                    ? <td data-label="Mô tả" className="catalog-desc">{r.description || '-'}</td>
                    : <td data-label="Quốc gia">{r.country || '-'}</td>}
                  <td data-label="Sản phẩm">
                    {r.productCount > 0
                      ? <Link to={`/products?${kind}=${r.slug}`} target="_blank" rel="noreferrer">{r.productCount} sản phẩm</Link>
                      : <span className="muted">0</span>}
                  </td>
                  <td className="cell-actions">
                    <div className="row-actions">
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => openEdit(r)}>Sửa</button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => askDelete(r)}
                              title={r.productCount > 0 ? 'Còn sản phẩm, chưa xoá được' : undefined}>Xoá</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Hộp thoại thêm / sửa */}
      <ConfirmDialog open={!!editing} title={editing?.id ? `Sửa ${cfg.label}` : `Thêm ${cfg.label}`}
                     confirmLabel={editing?.id ? 'Lưu' : 'Thêm'} busy={saving || uploading}
                     onConfirm={save} onCancel={() => setEditing(null)}>
        {editing && (
          <form className="catalog-form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
            {errors._ && <div className="alert alert-error" role="alert">{errors._}</div>}
            {field('name', `Tên ${cfg.label} *`, { maxLength: 100, autoFocus: true })}
            {field('slug', 'Đường dẫn (slug)', {
              maxLength: 120,
              placeholder: slugify(editing.name) || 'tự tạo từ tên',
              'aria-describedby': 'cat-slug-hint',
            })}
            <small id="cat-slug-hint" className="muted catalog-hint">
              Để trống sẽ tự tạo: <code>/{editing.slug || slugify(editing.name) || '...'}</code>
            </small>
            {kind === 'category' ? (
              <>
                {field('sortOrder', 'Thứ tự hiển thị (số nhỏ đứng trước)', { type: 'number', min: 0, max: 9999, inputMode: 'numeric' })}
                <label className="field" htmlFor="cat-description">
                  <span>Mô tả ngắn</span>
                  <textarea id="cat-description" className="input catalog-textarea" maxLength={500} rows={3}
                            value={editing.description} onChange={(e) => set('description', e.target.value)} />
                </label>
              </>
            ) : field('country', 'Quốc gia', { maxLength: 60, placeholder: 'VD: Việt Nam' })}

            <div className="field">
              <span>{cfg.imageLabel} (không bắt buộc)</span>
              <div className="catalog-image-row">
                <span className="catalog-thumb catalog-thumb-lg">
                  {imageUrl ? <img src={imageUrl} alt="" /> : <span className="muted">Chưa có</span>}
                </span>
                <div className="catalog-image-actions">
                  <button type="button" className="btn btn-sm btn-outline" disabled={uploading}
                          onClick={() => fileRef.current?.click()}>
                    {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
                  </button>
                  {imageUrl && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => set(cfg.imageField, '')}>
                      Bỏ ảnh
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
                         onChange={(e) => upload(e.target.files?.[0])} />
                </div>
              </div>
            </div>
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
        )}
      </ConfirmDialog>

      <ConfirmDialog open={!!deleting} title={`Xoá ${cfg.label}?`}
                     message={deleting ? `"${deleting.name}" sẽ bị xoá vĩnh viễn và không hiện trên cửa hàng nữa.` : ''}
                     confirmLabel="Xoá" danger busy={busy}
                     onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </>
  );
}
