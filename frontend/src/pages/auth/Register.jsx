import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const EMPTY = { fullName: '', email: '', phone: '', password: '', confirmPassword: '' };

/** Kiểm tra phía client giống luật ở backend, để báo lỗi ngay không cần gửi request. */
function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Email không hợp lệ';
  if (form.phone && !/^0\d{9}$/.test(form.phone)) errors.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
  if (form.password.length < 8) errors.password = 'Mật khẩu từ 8 ký tự';
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = 'Mật khẩu phải có cả chữ và số';
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const { confirmPassword, ...payload } = form;
      const user = await register(payload);
      toast.success(`Tạo tài khoản thành công. Chào mừng ${user.fullName}!`);
      // GuestOnlyRoute sẽ chuyển về trang trước đó
    } catch (err) {
      setServerError(err.message);
      setErrors(err.errors || {});
      setSubmitting(false);
    }
  };

  const field = (name, label, type = 'text', autoComplete) => (
    <label className="field" htmlFor={`reg-${name}`}>
      <span>{label}</span>
      <input id={`reg-${name}`} name={name} type={type} className={`input ${errors[name] ? 'input-error' : ''}`}
             autoComplete={autoComplete} value={form[name]} onChange={handleChange}
             aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `reg-${name}-err` : undefined} />
      {errors[name] && <small id={`reg-${name}-err`} className="field-error">{errors[name]}</small>}
    </label>
  );

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Tạo tài khoản</h1>
        <p className="muted">Theo dõi đơn hàng và nhận tư vấn nhanh hơn.</p>

        {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}

        {field('fullName', 'Họ và tên', 'text', 'name')}
        {field('email', 'Email', 'email', 'email')}
        {field('phone', 'Số điện thoại (không bắt buộc)', 'tel', 'tel')}
        {field('password', 'Mật khẩu', 'password', 'new-password')}
        {field('confirmPassword', 'Nhập lại mật khẩu', 'password', 'new-password')}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>
        <p className="auth-switch">Đã có tài khoản? <Link to="/login" state={location.state}>Đăng nhập</Link></p>
      </form>
    </div>
  );
}
