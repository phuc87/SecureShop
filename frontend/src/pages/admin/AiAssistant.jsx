import { useEffect, useState } from 'react';
import aiApi from '../../api/aiApi';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';

/** Tên tiếng Việt của các intent (khớp ai-service/data/intents.json). */
export const INTENT_LABEL = {
  greeting: 'Chào hỏi', thanks_bye: 'Cảm ơn / tạm biệt', product_advice: 'Tư vấn chọn thiết bị', price_query: 'Hỏi giá',
  compare: 'So sánh', shipping: 'Giao hàng', warranty_return: 'Bảo hành, đổi trả', installation: 'Lắp đặt, cài đặt',
  payment: 'Thanh toán', order_status: 'Đơn hàng', store_info: 'Thông tin cửa hàng', promotion: 'Khuyến mãi',
  tech_support: 'Hỗ trợ kỹ thuật', human_handoff: 'Gặp nhân viên', about_bot: 'Hỏi về trợ lý', out_of_scope: 'Ngoài phạm vi',
  fallback: 'Không hiểu',
  // Tên intent của dữ liệu mẫu cũ (file V2__seed_data.sql)
  tu_van_camera: 'Tư vấn camera (mẫu cũ)', hoi_lap_dat: 'Hỏi lắp đặt (mẫu cũ)', hoi_gia: 'Hỏi giá (mẫu cũ)',
  gap_nhan_vien: 'Gặp nhân viên (mẫu cũ)', cung_cap_thong_tin: 'Cung cấp thông tin (mẫu cũ)', tu_van_khoa: 'Tư vấn khóa (mẫu cũ)',
};
const label = (i) => INTENT_LABEL[i] || i || '—';
const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'bad', label: 'Bị chê 👎' },
  { value: 'low', label: 'AI không chắc' },
  { value: 'handoff', label: 'Chuyển nhân viên' },
  { value: 'labeled', label: 'Đã gán nhãn' },
];

function Bars({ items, max, format = (n) => n, tone }) {
  if (!items.length) return <p className="muted small">Chưa có dữ liệu.</p>;
  return (
    <ul className="status-bars ai-bars">
      {items.map(({ key, value }) => (
        <li key={key}>
          <div className="ai-bar-row">
            <span className="ai-bar-label">{label(key)}</span>
            <span className={`sb-track ${tone || ''}`} aria-hidden="true">
              <span style={{ width: value ? `${Math.max((value / max) * 100, 3)}%` : 0 }} />
            </span>
            <b>{format(value)}</b>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AiAssistant() {
  const toast = useToast();
  const { data: ov, loading, error, reload } = useFetch(() => aiApi.overview(), []);
  const [intents, setIntents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const { data: logs, loading: logsLoading, reload: reloadLogs } = useFetch(
    () => aiApi.logs({ filter, q: q || undefined, page, size: 12 }), [filter, q, page],
  );
  const [confirmTrain, setConfirmTrain] = useState(false);
  const [training, setTraining] = useState(false);

  useEffect(() => { aiApi.intents().then(setIntents).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const setLabel = async (row, intent) => {
    try {
      await aiApi.label(row.id, intent || null);
      toast.success(intent ? `Đã gán nhãn "${label(intent)}"` : 'Đã bỏ nhãn');
      reloadLogs();
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const retrain = async () => {
    setTraining(true);
    try {
      const res = await aiApi.retrain();
      toast.success(`Đã dạy lại AI: ${res.examples} câu, độ chính xác ${pct(res.accuracy)} (model ${res.version})`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTraining(false);
      setConfirmTrain(false);
    }
  };

  const download = async () => {
    try {
      const blob = await aiApi.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai-training-data.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading && !ov) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const model = ov.model || {};
  const intentItems = (ov.intents || []).map((x) => ({ key: x.intent, value: x.count }));
  const maxIntent = Math.max(1, ...intentItems.map((x) => x.value));
  const f1Items = Object.entries(ov.perIntentF1 || {}).map(([key, value]) => ({ key, value })).sort((a, b) => a.value - b.value);
  const rated = ov.good + ov.bad;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Trợ lý AI</h1>
          <p className="muted">
            <span className={`chip ${ov.online ? 'chip-green' : 'chip-red'}`}>{ov.online ? '● Đang chạy' : '● Đang tắt'}</span>
            {' '}{ov.online
              ? <>Model <code>{model.model_version}</code> · {model.examples} câu mẫu · độ chính xác {pct(model.accuracy)}</>
              : 'Chạy start-ai.bat để bật trợ lý AI'}
          </p>
        </div>
        <div className="ai-head-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={download}>Tải dữ liệu train (CSV)</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!ov.online} onClick={() => setConfirmTrain(true)}>
            Dạy lại AI
          </button>
        </div>
      </div>

      <div className="stat-grid dash-stats ai-stats">
        <div className="stat-card"><span>Câu hỏi đã trả lời</span><b>{ov.total}</b><small className="muted">{ov.last7Days} trong 7 ngày qua</small></div>
        <div className="stat-card"><span>Độ tin cậy trung bình</span><b>{pct(ov.avgConfidence)}</b><small className="muted">{ov.lowConfidence} câu AI không chắc (&lt; 60%)</small></div>
        <div className="stat-card"><span>Khách hài lòng</span><b>{rated ? pct(ov.good / rated) : '—'}</b><small className="muted">👍 {ov.good} · 👎 {ov.bad}</small></div>
        <div className="stat-card"><span>Chuyển tư vấn viên</span><b>{ov.handoffs}</b><small className="muted">{ov.total ? pct(ov.handoffs / ov.total) : '—'} số câu hỏi</small></div>
        <div className="stat-card"><span>Đã gán nhãn lại</span><b>{ov.labeled}</b><small className="muted">dùng khi bấm "Dạy lại AI"</small></div>
        <div className="stat-card"><span>Macro F1 (kiểm định chéo)</span><b>{model.macro_f1 != null ? model.macro_f1.toFixed(2) : '—'}</b><small className="muted">{model.extra_examples || 0} câu học từ thực tế</small></div>
      </div>

      <div className="dash-grid">
        <div className="panel">
          <h2>Khách hỏi gì nhiều nhất</h2>
          <Bars items={intentItems} max={maxIntent} />
        </div>
        <div className="panel">
          <h2>AI giỏi / yếu ở đâu (F1 từng ý định)</h2>
          <p className="muted small">Thấp = hay nhầm. Thêm câu mẫu cho ý định đó (gán nhãn bên dưới hoặc sửa data/intents.json) rồi dạy lại.</p>
          <Bars items={f1Items} max={1} format={(v) => v.toFixed(2)} tone="sb-f1" />
        </div>
      </div>

      <div className="panel ai-logs">
        <h2>Lịch sử hỏi đáp</h2>
        <p className="muted small">AI hiểu sai câu nào thì chọn <b>nhãn đúng</b> → bấm <b>Dạy lại AI</b>. Câu khách bấm 👍 cũng được dùng làm dữ liệu train.</p>
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Lọc câu hỏi">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" role="tab" aria-selected={filter === f.value}
                      className={filter === f.value ? 'active' : ''} onClick={() => { setFilter(f.value); setPage(0); }}>
                {f.label}
              </button>
            ))}
          </div>
          <label htmlFor="ai-search" className="sr-only">Tìm câu hỏi</label>
          <input id="ai-search" type="search" className="input toolbar-search" placeholder="Tìm trong câu hỏi của khách"
                 value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </div>

        {logsLoading && !logs && <Spinner />}
        {logs && logs.content.length === 0 && <EmptyState title="Không có câu hỏi nào" />}
        {logs && logs.content.length > 0 && (
          <div className="table-wrap table-stack-wrap">
            <table className="data-table table-stack ai-table">
              <thead>
                <tr><th>Thời gian</th><th>Câu hỏi của khách</th><th>AI hiểu là</th><th>AI trả lời</th><th>Nhãn đúng</th></tr>
              </thead>
              <tbody>
                {logs.content.map((r) => (
                  <tr key={r.id} className={r.feedback === 'BAD' ? 'row-bad' : ''}>
                    <td data-label="Thời gian" className="ai-time">
                      {new Date(r.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="cell-title ai-question">
                      “{r.userMessage}”
                      <span className="ai-tags">
                        {r.feedback === 'GOOD' && <span className="chip chip-green">👍</span>}
                        {r.feedback === 'BAD' && <span className="chip chip-red">👎</span>}
                        {r.handedOff && <span className="chip chip-blue">→ nhân viên</span>}
                        {!r.userId && <span className="chip">khách vãng lai</span>}
                      </span>
                    </td>
                    <td data-label="AI hiểu là">
                      <span className="ai-intent">
                        <b>{label(r.predictedIntent)}</b>
                        <span className={`ai-conf ${r.confidence != null && r.confidence < 0.6 ? 'low' : ''}`}>{pct(r.confidence)}</span>
                        {r.resolvedIntent && r.resolvedIntent !== r.predictedIntent && (
                          <small className="muted">→ xử lý như: {label(r.resolvedIntent)}</small>
                        )}
                      </span>
                    </td>
                    <td data-label="AI trả lời" className="ai-reply">
                      <details>
                        <summary>{(r.botReply || '').split('\n')[0].slice(0, 70)}{r.productCount ? ` · ${r.productCount} sản phẩm` : ''}</summary>
                        <p>{r.botReply}</p>
                      </details>
                    </td>
                    <td data-label="Nhãn đúng">
                      <select className="input input-sm" value={r.correctedIntent || ''} aria-label={`Nhãn đúng cho câu "${r.userMessage}"`}
                              disabled={!intents.length} onChange={(e) => setLabel(r, e.target.value)}>
                        <option value="">{r.correctedIntent ? 'Bỏ nhãn' : '— AI đúng / chưa gán —'}</option>
                        {intents.map((i) => <option key={i.intent} value={i.intent}>{label(i.intent)}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {logs && <Pagination page={logs.page} totalPages={logs.totalPages} onChange={setPage} />}
      </div>

      <ConfirmDialog open={confirmTrain} title="Dạy lại trợ lý AI?" confirmLabel="Dạy lại" busy={training}
                     message={`AI sẽ học lại toàn bộ câu mẫu, cộng thêm ${ov.labeled} câu bạn đã gán nhãn và các câu khách bấm 👍. Mất vài giây, trong lúc đó AI vẫn trả lời bình thường.`}
                     onConfirm={retrain} onCancel={() => setConfirmTrain(false)} />
    </>
  );
}
