import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import Icon from '../common/Icon';
import axiosClient from '../../api/axiosClient';

/**
 * Chọn vị trí giao hàng trên bản đồ OpenStreetMap (miễn phí, không cần API key).
 * - Bấm vào bản đồ hoặc kéo ghim -> tự đổi toạ độ ra địa chỉ (Nominatim) và gọi onPick({ province, district, ward, street }).
 * - Ô tìm kiếm: gõ địa chỉ -> nhảy tới vị trí đó.
 * - Nút "Vị trí của tôi": dùng GPS của trình duyệt.
 * Khách vẫn sửa tay các ô địa chỉ sau khi chọn.
 */
/**
 * Gọi Nominatim qua backend trước (đúng quy định: User-Agent + 1 request/giây).
 * Nếu backend không ra được Internet (vd. DNS nhà mạng chặn openstreetmap.org) thì trình duyệt tự gọi thẳng.
 */
async function geo(path, params) {
  try {
    return await axiosClient.get(`/geo/${path}`, { params });
  } catch (err) {
    if (err?.status !== 502) throw err;
    const qs = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': 'vi', ...params });
    if (path === 'search') { qs.set('countrycodes', 'vn'); qs.set('limit', '5'); }
    const res = await fetch(`https://nominatim.openstreetmap.org/${path}?${qs}`);
    if (!res.ok) throw new Error();
    return res.json();
  }
}

const DEFAULT_CENTER = [10.7769, 106.7009]; // TP. Hồ Chí Minh

const pin = L.icon({
  iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/** Đổi kết quả Nominatim sang 4 ô địa chỉ của form. */
export function toAddress(a = {}) {
  const province = a.city || a.state || a.province || '';
  const district = a.city_district || a.county || a.district || (a.city && a.state ? '' : a.town) || '';
  const ward = a.quarter || a.suburb || a.village || a.neighbourhood || a.hamlet || '';
  const street = [a.house_number, a.road].filter(Boolean).join(' ') || a.amenity || a.building || '';
  return { province, district, ward: ward === district ? '' : ward, street };
}

export default function AddressMap({ onPick }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [q, setQ] = useState('');
  const [status, setStatus] = useState({ type: 'hint', text: 'Bấm vào bản đồ hoặc kéo ghim đỏ tới đúng nơi nhận hàng.' });
  const [busy, setBusy] = useState(false);

  const reverse = async (lat, lng) => {
    setStatus({ type: 'hint', text: 'Đang tìm địa chỉ...' });
    try {
      // Gọi qua backend (backend gọi OpenStreetMap Nominatim đúng quy định của họ)
      const data = await geo('reverse', { lat, lon: lng });
      if (!data.address) throw new Error();
      onPickRef.current?.(toAddress(data.address), { lat, lng });
      setStatus({ type: 'ok', text: `Đã điền: ${data.display_name}. Bạn kiểm tra lại và sửa nếu cần.` });
    } catch (err) {
      setStatus({ type: 'error', text: 'Không lấy được địa chỉ tại điểm này (mạng đang chặn dịch vụ bản đồ), bạn vui lòng nhập tay.' });
    }
  };

  const moveTo = (lat, lng, zoom = 17) => {
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], Math.max(zoom, mapRef.current.getZoom()));
    reverse(lat, lng);
  };

  useEffect(() => {
    const map = L.map(boxRef.current, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const marker = L.marker(DEFAULT_CENTER, { draggable: true, icon: pin }).addTo(map);
    marker.on('dragend', () => { const p = marker.getLatLng(); reverse(p.lat, p.lng); });
    map.on('click', (e) => { marker.setLatLng(e.latlng); reverse(e.latlng.lat, e.latlng.lng); });
    mapRef.current = map;
    markerRef.current = marker;
    setTimeout(() => map.invalidateSize(), 50);
    return () => map.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const [hit] = await geo('search', { q: q.trim() });
      if (!hit) setStatus({ type: 'error', text: 'Không tìm thấy địa chỉ này trên bản đồ, thử gõ ngắn hơn (vd: tên đường, quận).' });
      else moveTo(Number(hit.lat), Number(hit.lon));
    } catch (err) {
      setStatus({ type: 'error', text: err?.message || 'Không kết nối được dịch vụ bản đồ.' });
    } finally {
      setBusy(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) { setStatus({ type: 'error', text: 'Trình duyệt không hỗ trợ định vị.' }); return; }
    setStatus({ type: 'hint', text: 'Đang lấy vị trí của bạn...' });
    navigator.geolocation.getCurrentPosition(
      (p) => moveTo(p.coords.latitude, p.coords.longitude),
      () => setStatus({ type: 'error', text: 'Không lấy được vị trí (bạn chưa cho phép, hoặc trang không chạy HTTPS).' }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="addr-map">
      <div className="addr-map-tools">
        <div className="addr-map-search">
          <input className="input" placeholder="Tìm địa chỉ trên bản đồ..." value={q} aria-label="Tìm địa chỉ trên bản đồ"
                 onChange={(e) => setQ(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} />
          <button type="button" className="btn btn-outline" onClick={search} disabled={busy || !q.trim()}>
            <Icon name="search" size={16} /> Tìm
          </button>
        </div>
        <button type="button" className="btn btn-outline addr-map-locate" onClick={locate}>
          <Icon name="target" size={16} /> Vị trí của tôi
        </button>
      </div>
      <div ref={boxRef} className="addr-map-box" />
      <p className={`addr-map-status is-${status.type}`} role="status">{status.text}</p>
    </div>
  );
}
