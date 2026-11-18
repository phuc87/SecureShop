import axiosClient from './axiosClient';

const SESSION_KEY = 'secureshop_ai_session';

/** Mã phiên chat AI (lưu ở trình duyệt). Dùng để AI nhớ ngữ cảnh các câu trước, kể cả khách chưa đăng nhập. */
export const aiSession = {
  get() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) id = aiSession.reset();
    return id;
  },
  reset() {
    // crypto.randomUUID chỉ có trên HTTPS/localhost -> tự tạo khi mở web bằng IP qua http
    const id = (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`)
      .replace(/[^A-Za-z0-9_-]/g, '');
    localStorage.setItem(SESSION_KEY, id);
    return id;
  },
};

const aiApi = {
  ask: (message) => axiosClient.post('/ai/ask', { sessionId: aiSession.get(), message }, { timeout: 20000 }),
  handoff: () => axiosClient.post('/ai/handoff', { sessionId: aiSession.get() }),
  feedback: (logId, value) => axiosClient.post('/ai/feedback', { sessionId: aiSession.get(), logId, value }),
  status: () => axiosClient.get('/ai/status'),

  // ===== Quản trị =====
  overview: () => axiosClient.get('/admin/ai/overview'),
  logs: (params) => axiosClient.get('/admin/ai/logs', { params }),
  intents: () => axiosClient.get('/admin/ai/intents'),
  label: (id, intent) => axiosClient.put(`/admin/ai/logs/${id}/label`, { intent }),
  retrain: () => axiosClient.post('/admin/ai/retrain', null, { timeout: 120000 }),
  exportCsv: () => axiosClient.get('/admin/ai/export', { responseType: 'blob' }),
};

export default aiApi;
