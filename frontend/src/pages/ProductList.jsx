import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import productApi from '../api/productApi';
import useFetch from '../hooks/useFetch';
import ProductFilter from '../components/product/ProductFilter';
import ProductGrid from '../components/product/ProductGrid';
import Pagination from '../components/common/Pagination';
import Icon from '../components/common/Icon';
import { EmptyState, ErrorState, Spinner } from '../components/common/StateViews';
import { PAGE_SIZE, PRICE_RANGES, SORT_OPTIONS } from '../utils/constants';

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false); // ngăn kéo bộ lọc trên điện thoại / máy tính bảng
  const closeFilter = useCallback(() => setFilterOpen(false), []);

  // Toàn bộ trạng thái lọc đọc từ URL
  const filters = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    price: searchParams.get('price') || '',
    placement: searchParams.get('placement') || '',
    featured: searchParams.get('featured') === 'true',
    onSale: searchParams.get('onSale') === 'true',
    sort: searchParams.get('sort') || 'newest',
    page: Number(searchParams.get('page') || 0),
  };

  const apiParams = useMemo(() => {
    const range = PRICE_RANGES.find((r) => r.id === filters.price);
    const p = { sort: filters.sort, page: filters.page, size: PAGE_SIZE };
    if (filters.q) p.q = filters.q;
    if (filters.category) p.category = filters.category;
    if (filters.brand) p.brand = filters.brand;
    if (filters.placement) p.placement = filters.placement;
    if (filters.featured) p.featured = true;
    if (filters.onSale) p.onSale = true;
    if (range?.min) p.minPrice = range.min;
    if (range?.max) p.maxPrice = range.max;
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: categories } = useFetch(() => productApi.categories(), []);
  const { data: brands } = useFetch(() => productApi.brands(), []);
  const { data, loading, error, reload } = useFetch(() => productApi.search(apiParams), [apiParams]);

  /** Đổi 1 điều kiện lọc thì quay về trang đầu. */
  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value == null) next.delete(key); else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const resetFilters = () => {
    const next = new URLSearchParams();
    if (filters.q) next.set('q', filters.q);
    setSearchParams(next);
  };

  const currentCategory = categories?.find((c) => c.slug === filters.category);
  let title = currentCategory?.name || 'Tất cả sản phẩm';
  if (filters.featured) title = 'Sản phẩm nổi bật';
  if (filters.onSale) title = 'Đang giảm giá';
  if (filters.q) title = `Kết quả cho "${filters.q}"`;

  const activeFilters = [filters.category, filters.brand, filters.price, filters.placement, filters.featured, filters.onSale]
    .filter(Boolean).length;

  return (
    <div className="container page">
      <div className="list-layout">
        <ProductFilter categories={categories || []} brands={brands || []} values={filters}
                       onChange={updateParam} onReset={resetFilters}
                       open={filterOpen} onClose={closeFilter} resultCount={data?.totalElements} />

        <section className="list-main" aria-labelledby="list-title">
          <div className="list-toolbar">
            <div>
              <h1 id="list-title">{title}</h1>
              {data && <p className="muted">{data.totalElements} sản phẩm</p>}
            </div>
            <div className="list-actions">
              <button type="button" className="btn btn-outline filter-toggle" onClick={() => setFilterOpen(true)}
                      aria-expanded={filterOpen} aria-controls="product-filter">
                <Icon name="sliders" size={18} /> Bộ lọc
                {activeFilters > 0 && <span className="count-badge">{activeFilters}</span>}
              </button>
              <label className="sort-select">
                <span>Sắp xếp</span>
                <select id="sort" className="input" value={filters.sort} onChange={(e) => updateParam('sort', e.target.value)}>
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data && (
            data.content.length === 0 ? (
              <EmptyState title="Không có sản phẩm phù hợp">
                <span>Thử bỏ bớt điều kiện lọc hoặc tìm bằng từ khoá khác.</span>
                <button type="button" className="btn btn-outline" onClick={resetFilters}>Xoá bộ lọc</button>
              </EmptyState>
            ) : (
              <>
                <ProductGrid products={data.content} />
                <Pagination page={data.page} totalPages={data.totalPages}
                            onChange={(p) => { updateParam('page', p || ''); window.scrollTo(0, 0); }} />
              </>
            )
          )}
        </section>
      </div>
    </div>
  );
}
