import { useState } from 'react';
import { Link } from 'react-router-dom';
import authApi from '../../api/authApi';

/** Bước 1: khách nhập email, hệ thống gửi link đặt lại mật khẩu (hiệu lực 30 phút). */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Vui lòng nhập đúng địa chỉ email');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await authApi.forgotPassword(value);
      setSentTo(value);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-icon" aria-hidden="true">📧</div>
          <h1>Kiểm tra email của bạn</h1>
          <p className="muted">
            Nếu <b>{sentTo}</b> là email đã đăng ký, chúng tôi vừa gửi một liên kết đặt lại mật khẩu.
            Liên kết có hiệu lực trong <b>30 phút</b>.
          </p>
          <ul className="auth-tips">
            <li>Không thấy email? Hãy xem thư mục <b>Spam / Quảng cáo</b>.</li>
            <li>Chỉ liên kết trong email <b>mới nhất</b> còn dùng được.</li>
          </ul>
          <button type="button" className="btn btn-outline btn-block" onClick={() => setSentTo('')}>
            Gửi lại hoặc dùng email khác
          </button>
          <p className="auth-switch"><Link to="/login">← Quay lại đăng nhập</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Quên mật khẩu</h1>
        <p className="muted">Nhập email bạn đã dùng để đăng ký, chúng tôi sẽ gửi liên kết tạo mật khẩu mới.</p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <label className="field" htmlFor="forgot-email">
          <span>Email</span>
          <input id="forgot-email" type="email" className="input" autoComplete="email" required autoFocus
                 value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
        </button>
        <p className="auth-switch">Nhớ ra rồi? <Link to="/login">Đăng nhập</Link></p>
      </form>
    </div>
  );
}
