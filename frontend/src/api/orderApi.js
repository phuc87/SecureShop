import axiosClient from './axiosClient';

/** Đơn hàng phía khách hàng. */
const orderApi = {
  /** payload: { items:[{productId, quantity}], receiverName, receiverPhone, receiverEmail,
   *            province, district, ward, street, note, paymentMethod, saveAddress } */
  checkout: (payload) => axiosClient.post('/orders', payload),
  myOrders: (page = 0, size = 10) => axiosClient.get('/orders', { params: { page, size } }),
  myOrder: (id) => axiosClient.get(`/orders/${id}`),
  cancel: (id, reason) => axiosClient.post(`/orders/${id}/cancel`, { reason }),
  defaultAddress: () => axiosClient.get('/orders/default-address'),
  // ===== Mã giảm giá =====
  voucherQuote: (code, items) => axiosClient.post('/orders/voucher-quote', { code, items }),
  // ===== Đánh giá sản phẩm (chỉ khi đơn đã hoàn thành) =====
  reviewEligibility: (productId) => axiosClient.get('/orders/review-eligibility', { params: { productId } }),
  createReview: (payload) => axiosClient.post('/orders/reviews', payload),
  myReviews: (productId) => axiosClient.get('/orders/reviews/mine', { params: { productId } }),
  updateReview: (id, payload) => axiosClient.put(`/orders/reviews/${id}`, payload),
  reviewedProducts: (orderId) => axiosClient.get(`/orders/${orderId}/reviewed-products`),
};

export default orderApi;
