import { useState } from 'react';
import authApi from '../../api/authApi';
import { useToast } from '../../context/ToastContext';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export default function ChangePassword() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.currentPassword) found.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (form.newPassword.length < 8) found.newPassword = 'Mật khẩu mới từ 8 ký tự';
    else if (!/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) found.newPassword = 'Mật khẩu phải có cả chữ và số';
    if (form.confirm !== form.newPassword) found.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await authApi.changePassword(form.currentPassword, form.newPassword);
      toast.success('Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.');
      setForm(EMPTY);
    } catch (err) {
      if (err.message.includes('hiện tại')) setErrors({ currentPassword: err.message });
      else setErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, autoComplete) => (
    <label className="field" htmlFor={`pw-${name}`}>
      <span>{label}</span>
      <input id={`pw-${name}`} name={name} type="password" autoComplete={autoComplete}
             className={`input ${errors[name] ? 'input-error' : ''}`} value={form[name]} onChange={onChange} />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </label>
  );

  return (
    <div className="panel">
      <h1 className="panel-title">Đổi mật khẩu</h1>
      <form className="form-narrow" onSubmit={onSubmit} noValidate>
        {errors._ && <div className="alert alert-error" role="alert">{errors._}</div>}
        {field('currentPassword', 'Mật khẩu hiện tại', 'current-password')}
        {field('newPassword', 'Mật khẩu mới (từ 8 ký tự, có chữ và số)', 'new-password')}
        {field('confirm', 'Nhập lại mật khẩu mới', 'new-password')}
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Đổi mật khẩu'}</button>
      </form>
    </div>
  );
}
