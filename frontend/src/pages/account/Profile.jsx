import { useState } from 'react';
import authApi from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/format';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const changed = form.fullName.trim() !== user.fullName || form.phone !== (user.phone || '');

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.fullName.trim()) found.fullName = 'Vui lòng nhập họ tên';
    if (form.phone && !/^0\d{9}$/.test(form.phone)) found.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      updateUser(await authApi.updateProfile(form));
      toast.success('Đã lưu thông tin tài khoản');
    } catch (err) {
      toast.error(err.message);
      setErrors(err.errors || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <h1 className="panel-title">Thông tin tài khoản</h1>
      <form className="form-narrow" onSubmit={onSubmit} noValidate>
        <label className="field" htmlFor="pf-fullName">
          <span>Họ và tên</span>
          <input id="pf-fullName" name="fullName" className={`input ${errors.fullName ? 'input-error' : ''}`}
                 value={form.fullName} onChange={onChange} autoComplete="name" />
          {errors.fullName && <small className="field-error">{errors.fullName}</small>}
        </label>
        <label className="field" htmlFor="pf-phone">
          <span>Số điện thoại</span>
          <input id="pf-phone" name="phone" type="tel" inputMode="numeric" className={`input ${errors.phone ? 'input-error' : ''}`}
                 value={form.phone} onChange={onChange} autoComplete="tel" placeholder="0912345678" />
          {errors.phone && <small className="field-error">{errors.phone}</small>}
        </label>
        <label className="field" htmlFor="pf-email">
          <span>Email đăng nhập</span>
          <input id="pf-email" className="input" value={user.email} disabled />
          <small className="muted">Email dùng để đăng nhập nên không đổi được.</small>
        </label>
        <p className="muted small">Thành viên từ {formatDate(user.createdAt)}</p>
        <button type="submit" className="btn btn-primary" disabled={saving || !changed}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}
