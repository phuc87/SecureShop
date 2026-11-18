/**
 * Chuông điện thoại tự tạo bằng Web Audio (không cần file mp3).
 *  'incoming': chuông có người gọi tới (2 nốt, lặp lại)
 *  'outgoing': tiếng "tút... tút..." khi đang chờ bên kia bắt máy
 * Trình duyệt có thể chặn phát âm thanh nếu người dùng chưa từng bấm vào trang: khi đó chỉ im lặng, không lỗi.
 */
export function playTone(kind) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return () => {};
  let ctx;
  try { ctx = new AudioCtx(); } catch { return () => {}; }
  ctx.resume?.().catch(() => {});
  let stopped = false;
  let timer;

  const beep = (freq, start, length, volume = 0.12) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
    gain.gain.setValueAtTime(volume, ctx.currentTime + start + length - 0.03);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + length + 0.05);
  };

  const cycle = () => {
    if (stopped) return;
    if (kind === 'incoming') {
      [0, 0.25, 1.0, 1.25].forEach((t, i) => beep(i % 2 ? 660 : 880, t, 0.2));
      if (navigator.vibrate) navigator.vibrate([300, 200, 300]);
      timer = setTimeout(cycle, 3000);
    } else {
      beep(440, 0, 1.0, 0.06);
      timer = setTimeout(cycle, 3000);
    }
  };
  cycle();

  return () => {
    stopped = true;
    clearTimeout(timer);
    if (navigator.vibrate) navigator.vibrate(0);
    ctx.close().catch(() => {});
  };
}
