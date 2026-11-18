import axios from 'axios';

const TOKEN_KEY = 'secureshop_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Tự gắn JWT vào mọi request
axiosClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Trả thẳng data; chuẩn hoá lỗi thành { status, message, errors }
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && tokenStorage.get()) {
      // Token hết hạn hoặc tài khoản bị khoá -> đăng xuất
      tokenStorage.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    if (status === 403 && tokenStorage.get()) {
      // Có thể vai trò vừa bị admin khác đổi -> tải lại thông tin người dùng
      window.dispatchEvent(new Event('auth:forbidden'));
    }
    let message = error.response?.data?.message;
    if (!message) {
      // ERR_NETWORK: gọi thẳng backend bị từ chối; 502/503/504: proxy của Vite không tới được backend
      const serverDown = error.code === 'ERR_NETWORK' || [502, 503, 504].includes(status);
      message = serverDown
        ? 'Không kết nối được máy chủ. Hãy kiểm tra backend (Spring Boot) đã chạy ở cổng 8081 chưa.'
        : 'Đã có lỗi xảy ra, vui lòng thử lại.';
    }
    return Promise.reject({ status, message, errors: error.response?.data?.errors || {} });
  },
);

export default axiosClient;
