import { useState } from 'react';
import adminApi from '../../api/adminApi';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';
import { formatCurrency } from '../../utils/format';

const STATE_CHIP = { RUNNING: 'chip-green', SCHEDULED: 'chip-blue', EXPIRED: '', USED_UP: 'chip-orange', OFF: 'chip-red' };
const EMPTY = {
  code: '', description: '', discountType: 'PERCENT', discountValue: '10', maxDiscount: '', minOrder: '0',
  startsAt: '', endsAt: '', usageLimit: '', perUserLimit: '1', showPublic: true, active: true,
};

/** "2026-11-20T10:00:00" -> "2026-11-20T10:00" (định dạng của ô datetime-local) */
const toInput = (iso) => (iso ? iso.slice(0, 16) : '');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
const randomCode = () => `SS${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function discountText(v) {
  if (v.discountType === 'PERCENT') {
    return `${Number(v.discountValue)}%${v.maxDiscount ? ` (tối đa ${formatCurrency(v.maxDiscount)})` : ''}`;
  }
  return formatCurrency(v.discountValue);
}

export default function Vouchers() {
  const toast = useToast();
  const { data: list, loading, error, reload } = useFetch(() => adminApi.vouchers(), []);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setEditing({ ...EMPTY, code: randomCode() }); setErrors({}); };
  const openEdit = (v) => {
    setEditing({
      id: v.id, code: v.code, description: v.description || '', discountType: v.discountType,
      discountValue: String(Number(v.discountValue)), maxDiscount: v.maxDiscount ? String(Number(v.maxDiscount)) : '',
      minOrder: String(Number(v.minOrder)), startsAt: toInput(v.startsAt), endsAt: toInput(v.endsAt),
      usageLimit: v.usageLimit ?? '', perUserLimit: String(v.perUserLimit), showPublic: v.showPublic, active: v.active,
    });
    setErrors({});
  };
  const set = (name, value) => {
    setEditing((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined, _: undefined }));
  };

  const save = async () => {
    const f = editing;
    const found = {};
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(f.code.trim())) found.code = '3-30 ký tự: chữ không dấu, số, gạch ngang';
    const value = Number(f.discountValue);
    if (!value || value <= 0) found.discountValue = 'Nhập mức giảm lớn hơn 0';
    else if (f.discountType === 'PERCENT' && value > 100) found.discountValue = 'Tối đa 100%';
    if (f.startsAt && f.endsAt && f.endsAt <= f.startsAt) found.endsAt = 'Phải sau ngày bắt đầu';
    setErrors(found);
    if (Object.keys(found).length) return;
    const payload = {
      code: f.code.trim().toUpperCase(), description: f.description.trim() || null, discountType: f.discountType,
      discountValue: value, maxDiscount: f.discountType === 'PERCENT' && f.maxDiscount ? Number(f.maxDiscount) : null,
      minOrder: Number(f.minOrder) || 0, startsAt: f.startsAt || null, endsAt: f.endsAt || null,
      usageLimit: f.usageLimit === '' ? null : Number(f.usageLimit), perUserLimit: Number(f.perUserLimit) || 1,
      showPublic: f.showPublic, active: f.active,
    };
    setSaving(true);
    try {
      if (f.id) await adminApi.updateVoucher(f.id, payload);
      else await adminApi.createVoucher(payload);
      toast.success(f.id ? `Đã lưu mã ${payload.code}` : `Đã tạo mã ${payload.code}`);
      setEditing(null);
      reload();
    } catch (err) {
      setErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (v) => {
    try {
      await adminApi.setVoucherActive(v.id, !v.active);
      toast.success(v.active ? `Đã tắt mã ${v.code}` : `Đã bật mã ${v.code}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await adminApi.deleteVoucher(deleting.id);
      toast.success(`Đã xoá mã ${deleting.code}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const field = (name, label, { upper, ...props } = {}) => (
    <label className="field" htmlFor={`vc-${name}`}>
      <span>{label}</span>
      <input id={`vc-${name}`} className={`input ${errors[name] ? 'input-error' : ''}`} value={editing[name]}
             onChange={(e) => set(name, upper ? e.target.value.toUpperCase() : e.target.value)} {...props} />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </label>
  );

  const running = (list || []).filter((v) => v.state === 'RUNNING').length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mã giảm giá</h1>
          <p className="muted">Khách nhập mã ở trang thanh toán. {list && <>Đang chạy <b>{running}</b> / {list.length} mã.</>}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>+ Tạo mã giảm giá</button>
      </div>

      {loading && !list && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {list && list.length === 0 && <EmptyState title="Chưa có mã giảm giá nào" />}
      {list && list.length > 0 && (
        <div className="table-wrap table-stack-wrap">
          <table className="data-table table-stack voucher-table">
            <thead>
              <tr><th>Mã</th><th>Giảm</th><th>Điều kiện</th><th>Hiệu lực</th><th>Đã dùng</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id} className={v.state === 'RUNNING' ? '' : 'row-muted'}>
                  <td className="cell-title">
                    <span className="voucher-code-cell">
                      <code className="voucher-code">{v.code}</code>
                      <small className="muted">{v.description}</small>
                    </span>
                  </td>
                  <td data-label="Giảm"><b>{discountText(v)}</b></td>
                  <td data-label="Điều kiện" className="voucher-cond">
                    {Number(v.minOrder) > 0 ? `Đơn từ ${formatCurrency(v.minOrder)}` : 'Mọi đơn'}
                    <small className="muted">Mỗi khách {v.perUserLimit} lần</small>
                  </td>
                  <td data-label="Hiệu lực" className="voucher-cond">
                    {v.startsAt || v.endsAt ? (
                      <>
                        {v.startsAt && <small>Từ {fmtDate(v.startsAt)}</small>}
                        {v.endsAt && <small>Đến {fmtDate(v.endsAt)}</small>}
                      </>
                    ) : <small className="muted">Không giới hạn</small>}
                  </td>
                  <td data-label="Đã dùng">
                    <span className="voucher-usage">
                      <b>{v.usedCount}{v.usageLimit ? ` / ${v.usageLimit}` : ''}</b>
                      {v.usageLimit && (
                        <span className="sb-track" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, (v.usedCount / v.usageLimit) * 100)}%` }} />
                        </span>
                      )}
                    </span>
                  </td>
                  <td data-label="Trạng thái"><span className={`chip ${STATE_CHIP[v.state]}`}>{v.stateLabel}</span></td>
                  <td className="cell-actions">
                    <div className="row-actions">
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => openEdit(v)}>Sửa</button>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => toggle(v)}>{v.active ? 'Tắt' : 'Bật'}</button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(v)}>Xoá</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!editing} title={editing?.id ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá'}
                     confirmLabel={editing?.id ? 'Lưu' : 'Tạo mã'} busy={saving}
                     onConfirm={save} onCancel={() => setEditing(null)}>
        {editing && (
          <div className="voucher-form-grid">
            {errors._ && <div className="alert alert-error span-all" role="alert">{errors._}</div>}
            <div className="span-all voucher-code-row">
              {field('code', 'Mã *', { maxLength: 30, autoFocus: true, upper: true })}
              <button type="button" className="btn btn-sm btn-outline" onClick={() => set('code', randomCode())}>Tạo ngẫu nhiên</button>
            </div>
            <label className="field span-all" htmlFor="vc-type">
              <span>Kiểu giảm</span>
              <div className="voucher-type" role="radiogroup" id="vc-type">
                {[['PERCENT', 'Theo %'], ['FIXED', 'Số tiền cố định']].map(([val, lbl]) => (
                  <button key={val} type="button" role="radio" aria-checked={editing.discountType === val}
                          className={editing.discountType === val ? 'active' : ''} onClick={() => set('discountType', val)}>{lbl}</button>
                ))}
              </div>
            </label>
            {field('discountValue', editing.discountType === 'PERCENT' ? 'Giảm (%) *' : 'Số tiền giảm (₫) *', { type: 'number', min: 1, inputMode: 'numeric' })}
            {editing.discountType === 'PERCENT'
              ? field('maxDiscount', 'Giảm tối đa (₫, để trống = không giới hạn)', { type: 'number', min: 1, inputMode: 'numeric' })
              : <span />}
            {field('minOrder', 'Đơn tối thiểu (₫)', { type: 'number', min: 0, inputMode: 'numeric' })}
            {field('usageLimit', 'Tổng lượt dùng (trống = không giới hạn)', { type: 'number', min: 1, inputMode: 'numeric' })}
            {field('startsAt', 'Bắt đầu (trống = ngay)', { type: 'datetime-local' })}
            {field('endsAt', 'Kết thúc (trống = không hết hạn)', { type: 'datetime-local' })}
            {field('perUserLimit', 'Mỗi khách dùng tối đa (lần)', { type: 'number', min: 1, max: 100, inputMode: 'numeric' })}
            <span />
            <label className="field span-all" htmlFor="vc-description">
              <span>Mô tả cho khách (trống = tự viết)</span>
              <input id="vc-description" className="input" maxLength={255} value={editing.description}
                     placeholder="VD: Giảm 10% (tối đa 100.000 ₫) cho đơn từ 500.000 ₫"
                     onChange={(e) => set('description', e.target.value)} />
            </label>
            <label className="check-option span-all">
              <input type="checkbox" checked={editing.active} onChange={(e) => set('active', e.target.checked)} />
              <span>Đang bật</span>
            </label>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog open={!!deleting} title="Xoá mã giảm giá?" danger busy={busy} confirmLabel="Xoá"
                     message={deleting ? `Mã ${deleting.code} sẽ bị xoá. Mã đã dùng trong đơn hàng thì không xoá được, hãy tắt thay vì xoá.` : ''}
                     onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </>
  );
}
