import axiosClient from './axiosClient';

const chatApi = {
  /** Khách: lấy (hoặc tạo) hội thoại của mình. Trả về { conversation, supportOnline } */
  myConversation: () => axiosClient.get('/chat/my-conversation'),

  /** { messages (cũ -> mới), hasMore } */
  messages: (conversationId, before) =>
    axiosClient.get(`/chat/conversations/${conversationId}/messages`, { params: { before } }),

  /** payload: { type, content?, fileUrl?, fileName?, fileSize?, mimeType?, productId? } */
  send: (conversationId, payload) => axiosClient.post(`/chat/conversations/${conversationId}/messages`, payload),

  markRead: (conversationId) => axiosClient.post(`/chat/conversations/${conversationId}/read`),

  /** Tải file lên, trả về { url, fileName, size, mimeType, type } */
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post('/chat/upload', form, {
      timeout: 120000,
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    });
  },

  // ===== Admin =====
  adminList: (params) => axiosClient.get('/admin/chat/conversations', { params }),
  adminGet: (id) => axiosClient.get(`/admin/chat/conversations/${id}`),
  adminClose: (id) => axiosClient.post(`/admin/chat/conversations/${id}/close`),
  adminUnreadCount: () => axiosClient.get('/admin/chat/unread-count'),
};

export default chatApi;
