import axiosClient, { tokenStorage } from './axiosClient';

/** Gọi video: điều khiển qua REST, dữ liệu WebRTC qua STOMP /app/call.signal. */
const callApi = {
  /** type: 'VIDEO' | 'AUDIO' -> { type: 'CALL_OUTGOING', callId, peerName, ... } */
  start: (conversationId, type = 'VIDEO') => axiosClient.post('/calls', { conversationId, type }),
  accept: (callId) => axiosClient.post(`/calls/${callId}/accept`),
  reject: (callId) => axiosClient.post(`/calls/${callId}/reject`),
  end: (callId) => axiosClient.post(`/calls/${callId}/end`),
  /** Gác máy khi đóng tab: keepalive để request vẫn đi được dù trang đang đóng. */
  endOnUnload: (callId) => {
    const base = import.meta.env.VITE_API_URL || '/api';
    fetch(`${base}/calls/${callId}/end`, {
      method: 'POST', keepalive: true, headers: { Authorization: `Bearer ${tokenStorage.get()}` },
    }).catch(() => {});
  },
};

export default callApi;
