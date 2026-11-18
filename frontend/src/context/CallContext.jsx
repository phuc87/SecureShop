import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import callApi from '../api/callApi';
import { useAuth } from './AuthContext';
import { useChatSocket } from './ChatSocketContext';
import { useToast } from './ToastContext';
import { playTone } from '../utils/ringtone';
import CallScreen from '../components/call/CallScreen';

/**
 * GỌI VIDEO (WebRTC) giữa khách hàng và tư vấn viên.
 *
 * Luồng 1 cuộc gọi:
 *   A bấm Gọi   -> mở camera/micro -> POST /api/calls            -> B nhận CALL_RING (đổ chuông)
 *   B bấm Nghe  -> mở camera/micro -> POST /api/calls/{id}/accept -> A nhận CALL_ACCEPTED
 *   A tạo "offer" (mô tả hình/tiếng của mình) -> gửi qua server -> B trả "answer"
 *   2 bên trao đổi "ICE candidate" (địa chỉ mạng có thể kết nối) -> kết nối thẳng 2 máy, hình/tiếng KHÔNG đi qua server
 *   Ai bấm Gác máy -> POST /end -> bên kia nhận CALL_ENDED
 *
 * Trạng thái (call.phase): outgoing (đang gọi) | incoming (có người gọi) | connecting | active | ended
 */
const CallContext = createContext(null);

// Cùng mạng LAN thì 2 máy kết nối thẳng, không cần STUN. Có Internet thì STUN giúp đi qua NAT/router.
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const DISCONNECT_GRACE_MS = 10000; // mạng chập chờn: chờ 10 giây rồi mới gác máy

/** Mở camera + micro. Không có camera (hoặc camera đang bị app khác dùng) thì gọi bằng tiếng. */
async function openMedia(type) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    const err = new Error('Trình duyệt chỉ cho dùng camera/micro trên trang HTTPS hoặc localhost. '
      + 'Khi gọi giữa 2 máy, hãy mở web bằng địa chỉ https://... (chạy start-demo-2-may.bat).');
    err.code = 'INSECURE';
    throw err;
  }
  const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  if (type === 'AUDIO') return { stream: await navigator.mediaDevices.getUserMedia({ audio }), videoFailed: false };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    });
    return { stream, videoFailed: false };
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') throw err;
    // Không có camera / camera bận: thử chỉ micro
    return { stream: await navigator.mediaDevices.getUserMedia({ audio }), videoFailed: true };
  }
}

function mediaErrorMessage(err) {
  if (err.code === 'INSECURE') return err.message;
  if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
    return 'Bạn chưa cho phép dùng camera/micro. Bấm biểu tượng ổ khoá cạnh thanh địa chỉ -> Cho phép, rồi gọi lại.';
  }
  if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return 'Không tìm thấy micro trên máy này.';
  if (err.name === 'NotReadableError') return 'Micro/camera đang bị ứng dụng khác sử dụng.';
  return err.message || 'Không mở được camera/micro';
}

export function CallProvider({ children }) {
  const { user } = useAuth();
  const { addListener, publish } = useChatSocket();
  const toast = useToast();

  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peerMedia, setPeerMedia] = useState({ audio: true, video: true });
  const [unstable, setUnstable] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [canSwitchCam, setCanSwitchCam] = useState(false);

  const callRef = useRef(null);         // bản mới nhất của call (listener WebSocket đọc)
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const pendingIce = useRef([]);        // ICE tới trước khi có remote description -> giữ lại
  const stopTone = useRef(() => {});
  const timers = useRef({});
  const facing = useRef('user');

  const update = useCallback((patch) => {
    setCall((prev) => {
      let next;
      if (patch === null) next = null;
      else if (typeof patch === 'function') next = patch(prev);
      else next = prev ? { ...prev, ...patch } : patch;
      callRef.current = next;
      return next;
    });
  }, []);

  const signal = useCallback((kind, data) => {
    const c = callRef.current;
    if (c?.id) publish('/app/call.signal', { callId: c.id, kind, data });
  }, [publish]);

  // ------------------------------------------------------------------ dọn dẹp
  const cleanup = useCallback(() => {
    stopTone.current();
    stopTone.current = () => {};
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingIce.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setUnstable(false);
    setPeerMedia({ audio: true, video: true });
    document.title = document.title.replace(/^📞 /, '');
  }, []);

  /** Kết thúc phía mình và hiện thông báo ngắn rồi đóng màn hình gọi. */
  const finishLocally = useCallback((reason) => {
    const c = callRef.current;
    if (!c || c.phase === 'ended') return;
    cleanup();
    const duration = c.connectedAt ? Math.round((Date.now() - c.connectedAt) / 1000) : null;
    update({ phase: 'ended', reason, duration });
    timers.current.close = setTimeout(() => { update(null); setMinimized(false); }, 2600);
  }, [cleanup, update]);

  // ------------------------------------------------------------------ WebRTC
  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current));
    pc.onicecandidate = (e) => { if (e.candidate) signal('ice', e.candidate.toJSON()); };
    pc.ontrack = (e) => setRemoteStream(e.streams[0] || new MediaStream([e.track]));
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') {
        clearTimeout(timers.current.grace);
        setUnstable(false);
        update((prev) => (prev ? { ...prev, phase: 'active', connectedAt: prev.connectedAt || Date.now() } : prev));
      } else if (s === 'disconnected') {
        setUnstable(true);
        clearTimeout(timers.current.grace);
        timers.current.grace = setTimeout(() => {
          const c = callRef.current;
          if (c?.id) callApi.end(c.id).catch(() => {});
          finishLocally('Mất kết nối với người bên kia');
        }, DISCONNECT_GRACE_MS);
      } else if (s === 'failed') {
        const c = callRef.current;
        if (c?.id) callApi.end(c.id).catch(() => {});
        finishLocally('Không kết nối được. Hai máy cần cùng mạng hoặc có Internet.');
      }
    };
    return pc;
  }, [signal, update, finishLocally]);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    const list = pendingIce.current;
    pendingIce.current = [];
    for (const cand of list) {
      try { await pc.addIceCandidate(cand); } catch { /* ứng viên hỏng: bỏ qua */ }
    }
  }, []);

  const prepareMedia = useCallback(async (type) => {
    const { stream, videoFailed } = await openMedia(type);
    localRef.current = stream;
    setLocalStream(stream);
    setMicOn(true);
    setCamOn(stream.getVideoTracks().length > 0);
    navigator.mediaDevices.enumerateDevices?.()
      .then((ds) => setCanSwitchCam(ds.filter((d) => d.kind === 'videoinput').length > 1))
      .catch(() => {});
    if (videoFailed) toast.info('Không mở được camera, cuộc gọi chỉ có tiếng.');
    return stream;
  }, [toast]);

  // ------------------------------------------------------------------ hành động của người dùng
  /** Gọi trong hội thoại. peerName: tên hiện trên màn hình trong lúc chờ. */
  const startCall = useCallback(async ({ conversationId, peerName, type = 'VIDEO' }) => {
    if (callRef.current) { toast.error('Bạn đang trong một cuộc gọi khác'); return; }
    update({ id: null, conversationId, peerName, type, phase: 'outgoing', outgoing: true });
    setMinimized(false);
    try {
      const stream = await prepareMedia(type);
      if (callRef.current?.phase !== 'outgoing') { // đã bấm huỷ trong lúc đang mở camera
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const res = await callApi.start(conversationId, type);
      if (callRef.current?.phase !== 'outgoing') { // đã bấm huỷ trong lúc chờ server
        callApi.end(res.callId).catch(() => {});
        return;
      }
      update({ id: res.callId, peerName: res.peerName || peerName });
      stopTone.current = playTone('outgoing');
    } catch (err) {
      if (callRef.current?.phase === 'outgoing') {
        cleanup();
        update(null);
        toast.error(err.status ? err.message : mediaErrorMessage(err));
      }
    }
  }, [prepareMedia, cleanup, update, toast]);

  const acceptCall = useCallback(async () => {
    const c = callRef.current;
    if (!c || c.phase !== 'incoming') return;
    stopTone.current();
    update({ phase: 'connecting' });
    try {
      const stream = await prepareMedia(c.type);
      if (callRef.current?.id !== c.id || callRef.current.phase !== 'connecting') { // đã gác máy khi đang mở camera
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      // Tạo kết nối TRƯỚC khi báo "đã nghe": người gọi nhận được là gửi offer ngay, phải có chỗ nhận
      createPeer();
      await callApi.accept(c.id);
    } catch (err) {
      if (callRef.current?.id === c.id && callRef.current.phase !== 'ended') {
        callApi.reject(c.id).catch(() => {});
        cleanup();
        update(null);
        toast.error(err.status ? err.message : mediaErrorMessage(err));
      }
    }
  }, [prepareMedia, createPeer, cleanup, update, toast]);

  const declineCall = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    callApi.reject(c.id).catch(() => {});
    cleanup();
    update(null);
  }, [cleanup, update]);

  const hangUp = useCallback(() => {
    const c = callRef.current;
    if (!c || c.phase === 'ended') return;
    if (c.id) callApi.end(c.id).catch(() => {});
    finishLocally(c.phase === 'outgoing' ? 'Đã huỷ cuộc gọi' : 'Bạn đã kết thúc cuộc gọi');
  }, [finishLocally]);

  const toggleMic = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    signal('media', { audio: track.enabled, video: !!localRef.current.getVideoTracks()[0]?.enabled });
  }, [signal]);

  const toggleCam = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) { toast.info('Máy này không có camera'); return; }
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    signal('media', { audio: !!localRef.current.getAudioTracks()[0]?.enabled, video: track.enabled });
  }, [signal, toast]);

  /** Đổi camera trước/sau (điện thoại, laptop có 2 camera). */
  const switchCamera = useCallback(async () => {
    const stream = localRef.current;
    const old = stream?.getVideoTracks()[0];
    if (!old) return;
    facing.current = facing.current === 'user' ? 'environment' : 'user';
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing.current } });
      const track = fresh.getVideoTracks()[0];
      track.enabled = old.enabled;
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(track);
      stream.removeTrack(old);
      old.stop();
      stream.addTrack(track);
      setLocalStream(new MediaStream(stream.getTracks()));
    } catch {
      toast.error('Không đổi được camera');
    }
  }, [toast]);

  // ------------------------------------------------------------------ sự kiện từ server
  useEffect(() => addListener(async (ev) => {
    if (!ev.type?.startsWith('CALL_')) return;
    const c = callRef.current;
    const mine = c && c.id === ev.callId;

    switch (ev.type) {
      case 'CALL_RING': {
        if (c) { callApi.reject(ev.callId).catch(() => {}); return; } // đang bận cuộc khác
        update({
          id: ev.callId, conversationId: ev.conversationId, peerName: ev.peerName, peerRole: ev.peerRole,
          type: ev.callType || 'VIDEO', phase: 'incoming', outgoing: false,
        });
        setMinimized(false);
        stopTone.current = playTone('incoming');
        if (!document.title.startsWith('📞')) document.title = `📞 ${document.title}`;
        break;
      }
      case 'CALL_TAKEN':
        // Đã nhận ở tab khác / tư vấn viên khác nhận -> tắt chuông ở đây
        if (mine && c.phase === 'incoming') { cleanup(); update(null); }
        break;
      case 'CALL_ACCEPTED': {
        if (!mine || c.phase !== 'outgoing') return;
        stopTone.current();
        update({ phase: 'connecting', peerName: ev.peerName || c.peerName });
        const pc = createPeer();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signal('offer', { type: offer.type, sdp: offer.sdp });
        break;
      }
      case 'CALL_SIGNAL': {
        if (!mine || !pcRef.current) return;
        const pc = pcRef.current;
        try {
          if (ev.kind === 'offer') {
            await pc.setRemoteDescription(ev.data);
            await flushIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            signal('answer', { type: answer.type, sdp: answer.sdp });
          } else if (ev.kind === 'answer') {
            await pc.setRemoteDescription(ev.data);
            await flushIce();
          } else if (ev.kind === 'ice') {
            if (pc.remoteDescription) await pc.addIceCandidate(ev.data).catch(() => {});
            else pendingIce.current.push(ev.data);
          } else if (ev.kind === 'media') {
            setPeerMedia({ audio: ev.data?.audio !== false, video: ev.data?.video !== false });
          }
        } catch (err) {
          console.error('WebRTC signaling', err); // eslint-disable-line no-console
        }
        break;
      }
      case 'CALL_REJECTED':
      case 'CALL_MISSED':
      case 'CALL_ENDED':
        if (mine && c.phase !== 'ended') finishLocally(ev.reason || 'Cuộc gọi đã kết thúc');
        break;
      default:
    }
  }), [addListener, update, cleanup, createPeer, signal, flushIce, finishLocally]);

  // Đăng xuất giữa cuộc gọi -> gác máy
  useEffect(() => {
    if (!user && callRef.current) {
      if (callRef.current.id && callRef.current.phase !== 'ended') callApi.end(callRef.current.id).catch(() => {});
      cleanup();
      update(null);
    }
  }, [user, cleanup, update]);

  // Đóng tab / tải lại trang giữa cuộc gọi -> báo server gác máy
  useEffect(() => {
    const onUnload = () => {
      const c = callRef.current;
      if (c?.id && c.phase !== 'ended') callApi.endOnUnload(c.id); // đang đổ chuông thì server coi là từ chối
    };
    window.addEventListener('pagehide', onUnload);
    return () => window.removeEventListener('pagehide', onUnload);
  }, []);

  const value = useMemo(() => ({
    call, inCall: !!call, startCall,
  }), [call, startCall]);

  return (
    <CallContext.Provider value={value}>
      {children}
      {call && (
        <CallScreen call={call} localStream={localStream} remoteStream={remoteStream}
                    micOn={micOn} camOn={camOn} peerMedia={peerMedia} unstable={unstable}
                    minimized={minimized} onMinimize={setMinimized} canSwitchCam={canSwitchCam}
                    onAccept={acceptCall} onDecline={declineCall} onHangUp={hangUp}
                    onToggleMic={toggleMic} onToggleCam={toggleCam} onSwitchCam={switchCamera} />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall phải dùng bên trong <CallProvider>');
  return ctx;
}
