import axiosClient from './axiosClient';

const authApi = {
  login: (email, password) => axiosClient.post('/auth/login', { email, password }),
  register: (data) => axiosClient.post('/auth/register', data),
  me: () => axiosClient.get('/auth/me'),
  updateProfile: (data) => axiosClient.put('/auth/me', data),
  changePassword: (currentPassword, newPassword) => axiosClient.put('/auth/me/password', { currentPassword, newPassword }),
  // ===== Quên mật khẩu =====
  forgotPassword: (email) => axiosClient.post('/auth/forgot-password', { email }),
  checkResetToken: (token) => axiosClient.get('/auth/reset-password/check', { params: { token } }),
  resetPassword: (token, newPassword) => axiosClient.post('/auth/reset-password', { token, newPassword }),
};

export default authApi;
