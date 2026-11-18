import axiosClient from './axiosClient';

/** Sản phẩm yêu thích (chỉ khách hàng đã đăng nhập). */
const favoriteApi = {
  /** [{ product, available, addedAt }], mới thêm nằm trên */
  list: () => axiosClient.get('/favorites'),
  /** [productId...] để tô trái tim */
  ids: () => axiosClient.get('/favorites/ids'),
  add: (productId) => axiosClient.put(`/favorites/${productId}`),
  remove: (productId) => axiosClient.delete(`/favorites/${productId}`),
};

export default favoriteApi;
