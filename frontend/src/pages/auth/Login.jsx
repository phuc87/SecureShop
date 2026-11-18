import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import GoogleButton from '../../components/auth/GoogleButton';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Xin chào, ${user.fullName}!`);
      // Không tự navigate: GuestOnlyRoute thấy đã có user sẽ chuyển về trang trước đó
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Đăng nhập</h1>
        <p className="muted">Đăng nhập để đặt hàng và trò chuyện với tư vấn viên.</p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <label className="field" htmlFor="login-email">
          <span>Email</span>
          <input id="login-email" name="email" type="email" className="input" autoComplete="email" required
                 value={form.email} onChange={handleChange} />
        </label>
        <label className="field" htmlFor="login-password">
          <span className="field-label-row">
            Mật khẩu
            <Link to="/forgot-password" className="field-aside">Quên mật khẩu?</Link>
          </span>
          <input id="login-password" name="password" type="password" className="input" autoComplete="current-password"
                 required value={form.password} onChange={handleChange} />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
        <GoogleButton text="signin_with" onError={setError} />
        <p className="auth-switch">Chưa có tài khoản? <Link to="/register" state={location.state}>Đăng ký ngay</Link></p>

        {import.meta.env.DEV && (
          <div className="dev-hint">
            <b>Tài khoản mẫu (chỉ hiện khi chạy dev)</b>
            <button type="button" className="link-btn"
                    onClick={() => setForm({ email: 'admin@secureshop.vn', password: 'Admin@123' })}>
              Admin: admin@secureshop.vn / Admin@123
            </button>
            <button type="button" className="link-btn"
                    onClick={() => setForm({ email: 'phucaipro123@gmail.com', password: 'Customer@123' })}>
              Khách: phucaipro123@gmail.com / Customer@123
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
