import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import productApi from '../../api/productApi';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import ProductImage from '../../components/common/ProductImage';
import Icon from '../../components/common/Icon';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';
import { formatCurrency } from '../../utils/format';

export default function Products() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const page = Number(get('page') || 0);
  const [keywordInput, setKeywordInput] = useState(get('q'));
  const [pending, setPending] = useState(null); // { kind: 'delete' | 'toggle', product }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (keywordInput.trim() === get('q')) return;
      setParam('q', keywordInput.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [keywordInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: categories } = useFetch(() => productApi.categories(), []);
  const { data, loading, error, reload } = useFetch(() => adminApi.products({
    q: get('q') || undefined, categoryId: get('categoryId') || undefined, status: get('status') || undefined,
    stock: get('stock') || undefined, page, size: 15,
  }), [params.toString()]);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value === '' || value == null) next.delete(key); else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  const confirm = async () => {
    const { kind, product } = pending;
    setBusy(true);
    try {
      if (kind === 'delete') {
        await adminApi.deleteProduct(product.id);
        toast.success(`Đã xoá "${product.name}"`);
      } else {
        const next = product.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
        await adminApi.setProductStatus(product.id, next);
        toast.success(next === 'HIDDEN' ? `Đã ẩn "${product.name}" khỏi cửa hàng` : `Đã mở bán lại "${product.name}"`);
      }
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sản phẩm</h1>
          <p className="muted">{data ? `${data.totalElements} sản phẩm` : ' '} · Sản phẩm ẩn không hiện ở cửa hàng nhưng vẫn giữ trong các đơn cũ.</p>
        </div>
        <Link to="/admin/products/new" className="btn btn-primary">＋ Thêm sản phẩm</Link>
      </div>

      <div className="toolbar filters-row">
        <label htmlFor="ap-search" className="sr-only">Tìm sản phẩm</label>
        <input id="ap-search" type="search" className="input toolbar-search" placeholder="Tìm theo tên hoặc SKU"
               value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} />
        <select id="ap-category" className="input" aria-label="Danh mục" value={get('categoryId')} onChange={(e) => setParam('categoryId', e.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select id="ap-status" className="input" aria-label="Trạng thái" value={get('status')} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">Đang bán</option>
          <option value="HIDDEN">Đang ẩn</option>
        </select>
        <select id="ap-stock" className="input" aria-label="Tồn kho" value={get('stock')} onChange={(e) => setParam('stock', e.target.value)}>
          <option value="">Mọi mức tồn kho</option>
          <option value="low">Sắp hết (≤ 5)</option>
          <option value="out">Hết hàng</option>
        </select>
      </div>

      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.content.length === 0 && <EmptyState title="Không có sản phẩm phù hợp" />}
      {data && data.content.length > 0 && (
        <div className="table-wrap table-stack-wrap">
          <table className="data-table table-stack product-table">
            <thead>
              <tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th>Đã bán</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr>
            </thead>
            <tbody>
              {data.content.map((p) => (
                <tr key={p.id} className={p.status === 'ACTIVE' ? '' : 'row-muted'}>
                  <td className="cell-title">
                    <span className="pt-product">
                      <span className="pt-thumb"><ProductImage src={p.thumbnailUrl} alt="" categoryName={p.categoryName} iconSize={22} /></span>
                      <span className="cell-stack">
                        <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                        <small className="muted">{p.sku}{p.featured && ' · ⭐ Nổi bật'}</small>
                      </span>
                    </span>
                  </td>
                  <td data-label="Danh mục">{p.categoryName}</td>
                  <td data-label="Giá bán">
                    <span className="cell-stack">
                      <b>{formatCurrency(p.salePrice ?? p.price)}</b>
                      {p.salePrice != null && <small className="muted strike">{formatCurrency(p.price)}</small>}
                    </span>
                  </td>
                  <td data-label="Tồn kho"><span className={`chip ${p.stock === 0 ? 'chip-red' : p.stock <= 5 ? 'chip-orange' : ''}`}>{p.stock}</span></td>
                  <td data-label="Đã bán">{p.soldCount}</td>
                  <td data-label="Trạng thái">
                    <span className={`chip ${p.status === 'ACTIVE' ? 'chip-green' : ''}`}>{p.status === 'ACTIVE' ? 'Đang bán' : 'Đang ẩn'}</span>
                  </td>
                  <td className="cell-actions">
                    <span className="row-actions">
                      <Link to={`/admin/products/${p.id}`} className="btn btn-outline btn-sm">Sửa</Link>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setPending({ kind: 'toggle', product: p })}>
                        {p.status === 'ACTIVE' ? 'Ẩn' : 'Mở bán'}
                      </button>
                      <button type="button" className="btn btn-outline-danger btn-sm" aria-label={`Xoá ${p.name}`}
                              onClick={() => setPending({ kind: 'delete', product: p })}>
                        <Icon name="close" size={14} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setParam('page', p || '')} />}

      <ConfirmDialog
        open={!!pending} busy={busy} danger={pending?.kind === 'delete'}
        title={pending?.kind === 'delete' ? 'Xoá sản phẩm?' : pending?.product.status === 'ACTIVE' ? 'Ẩn sản phẩm?' : 'Mở bán lại?'}
        message={pending?.kind === 'delete'
          ? `Xoá vĩnh viễn "${pending.product.name}". Sản phẩm đã có trong đơn hàng thì không xoá được, hãy chọn Ẩn.`
          : pending?.product.status === 'ACTIVE'
            ? `"${pending?.product.name}" sẽ không hiện ở cửa hàng nữa. Các đơn cũ vẫn giữ nguyên.`
            : `"${pending?.product.name}" sẽ hiện lại ở cửa hàng.`}
        confirmLabel={pending?.kind === 'delete' ? 'Xoá' : pending?.product.status === 'ACTIVE' ? 'Ẩn' : 'Mở bán'}
        cancelLabel="Đóng" onConfirm={confirm} onCancel={() => setPending(null)} />
    </>
  );
}
