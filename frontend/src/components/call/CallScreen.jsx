import { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon';

const pad = (n) => String(n).padStart(2, '0');
const clock = (sec) => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;

/** <video> gắn với 1 MediaStream (React không gán srcObject qua thuộc tính được). */
function StreamVideo({ stream, muted = false, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream || null;
    if (stream) el.play?.().catch(() => {});
  }, [stream]);
  // eslint-disable-next-line jsx-a11y/media-has-caption
  return <video ref={ref} className={className} autoPlay playsInline muted={muted} />;
}

function useTimer(startAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startAt) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startAt]);
  return startAt ? Math.max(0, Math.round((now - startAt) / 1000)) : 0;
}

/** Màn hình cuộc gọi: đổ chuông / đang gọi / đang nói chuyện / vừa kết thúc. Có thể thu nhỏ để vừa gọi vừa chat. */
export default function CallScreen({
  call, localStream, remoteStream, micOn, camOn, peerMedia, unstable, minimized, onMinimize, canSwitchCam,
  onAccept, onDecline, onHangUp, onToggleMic, onToggleCam, onSwitchCam,
}) {
  const { phase, peerName = '', type, reason, duration } = call;
  const seconds = useTimer(phase === 'active' ? call.connectedAt : null);
  const isVideo = type !== 'AUDIO';
  const hasRemoteVideo = !!remoteStream?.getVideoTracks().length && peerMedia.video && phase === 'active';
  const hasLocalVideo = !!localStream?.getVideoTracks().length && camOn;
  const mini = minimized && phase !== 'incoming' && phase !== 'ended';

  const status = {
    incoming: `${isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} đến...`,
    outgoing: call.id ? 'Đang đổ chuông...' : 'Đang mở camera...',
    connecting: 'Đang kết nối...',
    active: unstable ? 'Mạng chập chờn, đang kết nối lại...' : clock(seconds),
    ended: duration ? `${reason} · ${clock(duration)}` : reason,
  }[phase];

  // Esc: đang đổ chuông thì từ chối; đang nói thì thu nhỏ (không gác máy nhầm)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (phase === 'incoming') onDecline();
      else if (phase === 'connecting' || phase === 'active') onMinimize(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onDecline, onMinimize]);

  return (
    <div className={`call-screen phase-${phase} ${mini ? 'is-mini' : ''}`} role="dialog"
         aria-modal={!mini} aria-label={`Cuộc gọi với ${peerName}`}>
      <div className="call-stage">
        {/* Video bên kia luôn được gắn (kể cả khi thu nhỏ) để không mất tiếng */}
        <StreamVideo stream={remoteStream} className={`call-remote ${hasRemoteVideo ? '' : 'is-hidden'}`} />
        {!hasRemoteVideo && (
          <div className="call-placeholder">
            <span className={`call-avatar ${phase === 'incoming' || phase === 'outgoing' ? 'is-ringing' : ''}`} aria-hidden="true">
              {peerName.charAt(0).toUpperCase() || '?'}
            </span>
            {phase === 'active' && !peerMedia.video && <p className="call-note">{peerName} đang tắt camera</p>}
          </div>
        )}
        {localStream && phase !== 'ended' && (
          <div className={`call-local ${hasLocalVideo ? '' : 'is-off'}`}>
            <StreamVideo stream={localStream} muted className={hasLocalVideo ? '' : 'is-hidden'} />
            {!hasLocalVideo && <Icon name="videoOff" size={22} />}
            <span className="call-local-label">Bạn{!micOn && ' · tắt mic'}</span>
          </div>
        )}
      </div>

      <header className="call-top">
        <div className="call-who">
          <b>{peerName}</b>
          <span aria-live="polite">{status}</span>
          {phase === 'active' && !peerMedia.audio && <span className="call-muted"><Icon name="micOff" size={13} /> Bên kia đang tắt mic</span>}
        </div>
        {(phase === 'connecting' || phase === 'active' || phase === 'outgoing') && (
          <button type="button" className="call-icon-btn" onClick={() => onMinimize(!mini)}
                  aria-label={mini ? 'Phóng to cuộc gọi' : 'Thu nhỏ để vừa gọi vừa chat'}
                  title={mini ? 'Phóng to' : 'Thu nhỏ để vừa gọi vừa chat'}>
            <Icon name={mini ? 'maximize' : 'minimize'} size={18} />
          </button>
        )}
      </header>

      <footer className="call-controls">
        {phase === 'incoming' && (
          <>
            <button type="button" className="call-btn danger" onClick={onDecline}>
              <Icon name="phoneOff" size={24} /><span>Từ chối</span>
            </button>
            <button type="button" className="call-btn accept" onClick={onAccept} autoFocus>
              <Icon name={isVideo ? 'video' : 'phone'} size={24} /><span>Nghe máy</span>
            </button>
          </>
        )}
        {(phase === 'outgoing' || phase === 'connecting' || phase === 'active') && (
          <>
            <button type="button" className={`call-btn ${micOn ? '' : 'off'}`} onClick={onToggleMic}
                    aria-pressed={!micOn} disabled={!localStream}>
              <Icon name={micOn ? 'mic' : 'micOff'} size={22} /><span>{micOn ? 'Tắt mic' : 'Bật mic'}</span>
            </button>
            {isVideo && (
              <button type="button" className={`call-btn ${camOn ? '' : 'off'}`} onClick={onToggleCam}
                      aria-pressed={!camOn} disabled={!localStream}>
                <Icon name={camOn ? 'video' : 'videoOff'} size={22} /><span>{camOn ? 'Tắt camera' : 'Bật camera'}</span>
              </button>
            )}
            {isVideo && canSwitchCam && (
              <button type="button" className="call-btn" onClick={onSwitchCam}>
                <Icon name="refresh" size={22} /><span>Đổi camera</span>
              </button>
            )}
            <button type="button" className="call-btn danger" onClick={onHangUp}>
              <Icon name="phoneOff" size={24} /><span>{phase === 'outgoing' ? 'Huỷ' : 'Gác máy'}</span>
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
