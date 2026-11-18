import axiosClient from './axiosClient';

const productApi = {
  /** params: { q, category, brand, minPrice, maxPrice, placement, sort, page, size } */
  search: (params) => axiosClient.get('/products', { params }),
  getBySlug: (slug) => axiosClient.get(`/products/${encodeURIComponent(slug)}`),
  categories: () => axiosClient.get('/categories'),
  brands: () => axiosClient.get('/brands'),
  /** Giá/tồn kho mới nhất cho giỏ hàng. Sản phẩm ngừng bán sẽ không có trong kết quả. */
  byIds: (ids) => axiosClient.get('/products/by-ids', { params: { ids: ids.join(',') } }),
  reviews: (slug, page = 0, size = 5) => axiosClient.get(`/products/${encodeURIComponent(slug)}/reviews`, { params: { page, size } }),
};

export default productApi;
