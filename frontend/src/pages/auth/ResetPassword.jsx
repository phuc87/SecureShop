import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import authApi from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/common/StateViews';

/** Bước 2: khách bấm link trong email -> /reset-password?token=... -> đặt mật khẩu mới. */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { user, logout } = useAuth();

  const [check, setCheck] = useState({ loading: true, valid: false, email: '' });
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setCheck({ loading: false, valid: false, email: '' });
      return;
    }
    let alive = true;
    authApi.checkResetToken(token)
      .then((res) => alive && setCheck({ loading: false, valid: !!res.valid, email: res.email || '' }))
      .catch(() => alive && setCheck({ loading: false, valid: false, email: '' }));
    return () => { alive = false; };
  }, [token]);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined, _: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.newPassword.length < 8) found.newPassword = 'Mật khẩu mới từ 8 ký tự';
    else if (!/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) found.newPassword = 'Mật khẩu phải có cả chữ và số';
    if (form.confirm !== form.newPassword) found.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await authApi.resetPassword(token, form.newPassword);
      if (user) logout(); // đang đăng nhập tài khoản khác/cũ trên máy này -> đăng xuất để đăng nhập lại
      setDone(true);
    } catch (err) {
      setErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (check.loading) return <div className="auth-page"><Spinner label="Đang kiểm tra liên kết..." /></div>;

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-icon" aria-hidden="true">✅</div>
          <h1>Đã đổi mật khẩu</h1>
          <p className="muted">Mật khẩu mới đã được lưu. Hãy đăng nhập bằng mật khẩu mới.</p>
          <Link to="/login" className="btn btn-primary btn-block">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  if (!check.valid) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-icon" aria-hidden="true">⏰</div>
          <h1>Liên kết không còn hiệu lực</h1>
          <p className="muted">
            Liên kết đặt lại mật khẩu đã hết hạn (30 phút), đã được dùng, hoặc không đúng.
            Bạn hãy gửi yêu cầu mới nhé.
          </p>
          <Link to="/forgot-password" className="btn btn-primary btn-block">Gửi yêu cầu mới</Link>
          <p className="auth-switch"><Link to="/login">← Quay lại đăng nhập</Link></p>
        </div>
      </div>
    );
  }

  const field = (name, label) => (
    <label className="field" htmlFor={`reset-${name}`}>
      <span>{label}</span>
      <input id={`reset-${name}`} name={name} type="password" autoComplete="new-password"
             className={`input ${errors[name] ? 'input-error' : ''}`} value={form[name]} onChange={onChange} />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </label>
  );

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1>Đặt mật khẩu mới</h1>
        <p className="muted">Tài khoản: <b>{check.email}</b></p>
        {errors._ && <div className="alert alert-error" role="alert">{errors._}</div>}
        {field('newPassword', 'Mật khẩu mới (từ 8 ký tự, có chữ và số)')}
        {field('confirm', 'Nhập lại mật khẩu mới')}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
        </button>
      </form>
    </div>
  );
}
