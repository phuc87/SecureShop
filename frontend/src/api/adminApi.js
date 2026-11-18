import axiosClient from './axiosClient';

const adminApi = {
  // ===== Người dùng =====
  /** params: { q, role } */
  users: (params) => axiosClient.get('/admin/users', { params }),
  updateUserStatus: (id, enabled) => axiosClient.patch(`/admin/users/${id}/status`, { enabled }),
  updateUserRole: (id, role) => axiosClient.patch(`/admin/users/${id}/role`, { role }),

  // ===== Liên hệ =====
  /** status: NEW | HANDLED | undefined (tất cả) */
  contacts: (status) => axiosClient.get('/admin/contacts', { params: { status } }),
  countNewContacts: () => axiosClient.get('/admin/contacts/count-new'),
  updateContactStatus: (id, status) => axiosClient.patch(`/admin/contacts/${id}/status`, { status }),

  // ===== Tổng quan =====
  dashboard: () => axiosClient.get('/admin/dashboard'),
  testEmail: () => axiosClient.post('/admin/system/test-email'),

  // ===== Đơn hàng =====
  /** params: { status, q, page, size } */
  orders: (params) => axiosClient.get('/admin/orders', { params }),
  orderCounts: () => axiosClient.get('/admin/orders/counts'),
  order: (id) => axiosClient.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, status, note) => axiosClient.patch(`/admin/orders/${id}/status`, { status, note }),
  markOrderPaid: (id) => axiosClient.post(`/admin/orders/${id}/mark-paid`),
  /** type: 'confirmation' (email xác nhận đơn) | 'status' (email trạng thái hiện tại) */
  resendOrderEmail: (id, type) => axiosClient.post(`/admin/orders/${id}/resend-email`, null, { params: { type }, timeout: 60000 }),

  // ===== Danh mục & thương hiệu =====
  categories: () => axiosClient.get('/admin/categories'),
  createCategory: (data) => axiosClient.post('/admin/categories', data),
  updateCategory: (id, data) => axiosClient.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => axiosClient.delete(`/admin/categories/${id}`),
  brands: () => axiosClient.get('/admin/brands'),
  createBrand: (data) => axiosClient.post('/admin/brands', data),
  updateBrand: (id, data) => axiosClient.put(`/admin/brands/${id}`, data),
  deleteBrand: (id) => axiosClient.delete(`/admin/brands/${id}`),

  // ===== Mã giảm giá =====
  vouchers: () => axiosClient.get('/admin/vouchers'),
  createVoucher: (data) => axiosClient.post('/admin/vouchers', data),
  updateVoucher: (id, data) => axiosClient.put(`/admin/vouchers/${id}`, data),
  setVoucherActive: (id, active) => axiosClient.patch(`/admin/vouchers/${id}/active`, { active }),
  deleteVoucher: (id) => axiosClient.delete(`/admin/vouchers/${id}`),

  // ===== Đánh giá =====
  deleteReview: (id) => axiosClient.delete(`/admin/reviews/${id}`),

  // ===== Sản phẩm =====
  /** params: { q, categoryId, status, stock: 'low' | 'out', page, size } */
  products: (params) => axiosClient.get('/admin/products', { params }),
  product: (id) => axiosClient.get(`/admin/products/${id}`),
  createProduct: (data) => axiosClient.post('/admin/products', data),
  updateProduct: (id, data) => axiosClient.put(`/admin/products/${id}`, data),
  setProductStatus: (id, status) => axiosClient.patch(`/admin/products/${id}/status`, { status }),
  deleteProduct: (id) => axiosClient.delete(`/admin/products/${id}`),
  uploadProductImage: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post('/admin/products/images', form, {
      timeout: 60000,
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    });
  },
};

export default adminApi;
