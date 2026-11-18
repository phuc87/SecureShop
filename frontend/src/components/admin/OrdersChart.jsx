import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../../utils/format';

/** Số gọn trên trục: 4.270.000 -> "4,3 tr"; 500.000 -> "500K". */
const compact = (v) => {
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(v);
};

/** Làm tròn mức cao nhất của trục lên số đẹp (1, 2, 2.5, 5, 10 × 10^n). */
function niceMax(v) {
  if (v <= 0) return 1_000_000;
  const p = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * p >= v);
  return step * p;
}

const dayLabel = (iso) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};
const weekday = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short' });

/** Theo dõi độ rộng thật của khung chứa để vẽ lại SVG cho vừa (responsive, chữ không bị co giãn). */
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Biểu đồ cột: giá trị đơn hàng (không tính đơn huỷ) mỗi ngày.
 * 1 chuỗi số liệu -> không cần chú thích màu; rê chuột / Tab vào cột để xem chi tiết; có bảng số liệu kèm theo.
 */
export default function OrdersChart({ daily }) {
  const [wrapRef, width] = useWidth();
  const [active, setActive] = useState(null);
  const height = 220;
  const pad = { top: 16, right: 8, bottom: 28, left: 48 };
  const plotW = Math.max(width - pad.left - pad.right, 100);
  const plotH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...daily.map((d) => Number(d.total))));
  const band = plotW / daily.length;
  const barW = Math.min(24, band * 0.62);
  const y = (v) => pad.top + plotH - (Number(v) / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelEvery = band < 34 ? 2 : 1; // màn hình hẹp: hiện nhãn ngày cách 1
  const totalAll = daily.reduce((s, d) => s + Number(d.total), 0);
  const ordersAll = daily.reduce((s, d) => s + d.orders, 0);
  const a = active != null ? daily[active] : null;

  return (
    <div className="orders-chart" ref={wrapRef}>
      <p className="chart-sub">
        <b>{formatCurrency(totalAll)}</b> từ <b>{ordersAll}</b> đơn (không tính đơn huỷ)
      </p>
      <div className="chart-area">
        <svg width={width} height={height} role="img"
             aria-label={`Biểu đồ cột giá trị đơn hàng 14 ngày qua, tổng ${formatCurrency(totalAll)} từ ${ordersAll} đơn`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="chart-tick">{compact(t)}</text>
            </g>
          ))}
          {daily.map((d, i) => {
            const v = Number(d.total);
            const h = (v / max) * plotH;
            const x = pad.left + i * band + (band - barW) / 2;
            const r = Math.min(4, h, barW / 2);
            const top = pad.top + plotH - h;
            return (
              <g key={d.date}>
                {h > 0 && (
                  // Cột bo 4px ở đầu, vuông ở đáy
                  <path className={`chart-bar ${active === i ? 'is-active' : ''}`}
                        d={`M${x},${pad.top + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + plotH} Z`} />
                )}
                {i % labelEvery === (daily.length - 1) % labelEvery && (
                  <text x={pad.left + i * band + band / 2} y={height - 8} textAnchor="middle" className="chart-tick">{dayLabel(d.date)}</text>
                )}
                {/* Vùng bắt chuột rộng cả dải, dễ trỏ hơn cột mảnh */}
                <rect x={pad.left + i * band} y={pad.top} width={band} height={plotH} className="chart-hit" tabIndex={0}
                      aria-label={`${weekday(d.date)} ${dayLabel(d.date)}: ${d.orders} đơn, ${formatCurrency(v)}`}
                      onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
              </g>
            );
          })}
          <line x1={pad.left} x2={width - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} className="chart-axis" />
        </svg>
        {a && (
          <div className="chart-tooltip" role="status"
               style={{
                 left: Math.min(Math.max(pad.left + active * band + band / 2, 70), width - 70),
                 top: Math.max(y(a.total) - 8, 4),
               }}>
            <b>{weekday(a.date)}, {dayLabel(a.date)}</b>
            <span>{a.orders} đơn · {formatCurrency(a.total)}</span>
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>Xem số liệu dạng bảng</summary>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Ngày</th><th>Số đơn</th><th>Giá trị</th></tr></thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.date}><td>{weekday(d.date)} {dayLabel(d.date)}</td><td>{d.orders}</td><td>{formatCurrency(d.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
