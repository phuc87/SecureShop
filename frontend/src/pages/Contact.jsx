import { useState } from 'react';
import contentApi from '../api/contentApi';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/common/Icon';
import { CONTACT_SUBJECTS, mapEmbedUrl, SHOP } from '../utils/shopInfo';

function validate(f) {
  const e = {};
  if (!f.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Email không hợp lệ';
  if (f.phone && !/^0\d{9}$/.test(f.phone)) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
  if (f.message.trim().length < 10) e.message = 'Nội dung tối thiểu 10 ký tự';
  return e;
}

export default function Contact() {
  const { user } = useAuth();
  const empty = { fullName: user?.fullName || '', email: user?.email || '', phone: user?.phone || '', subject: 'TU_VAN', message: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    try {
      const res = await contentApi.sendContact({ ...form, phone: form.phone || null });
      setSent(res);
    } catch (err) {
      setServerError(err.message);
      setErrors(err.errors || {});
    } finally {
      setSending(false);
    }
  };

  const field = (name, label, props = {}) => (
    <label className="field" htmlFor={`ct-${name}`}>
      <span>{label}</span>
      <input id={`ct-${name}`} name={name} className={`input ${errors[name] ? 'input-error' : ''}`}
             value={form[name]} onChange={onChange} aria-invalid={!!errors[name]} {...props} />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </label>
  );

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">Liên hệ</p>
          <h1>Chúng tôi luôn sẵn sàng hỗ trợ</h1>
          <p>Cần tư vấn chọn thiết bị, khảo sát lắp đặt hay bảo hành? Gửi tin nhắn hoặc gọi hotline, chúng tôi phản hồi trong giờ làm việc.</p>
        </div>
      </section>

      <div className="container page">
        <div className="contact-layout">
          <aside className="contact-info">
            <div className="info-card">
              <span className="why-icon"><Icon name="mapPin" size={22} /></span>
              <div><b>Địa chỉ cửa hàng</b><span>{SHOP.address}</span></div>
            </div>
            <div className="info-card">
              <span className="why-icon"><Icon name="phone" size={22} /></span>
              <div><b>Hotline</b><a href={SHOP.hotlineHref}>{SHOP.hotline}</a></div>
            </div>
            <div className="info-card">
              <span className="why-icon"><Icon name="mail" size={22} /></span>
              <div><b>Email</b><a href={`mailto:${SHOP.email}`}>{SHOP.email}</a></div>
            </div>
            <div className="info-card">
              <span className="why-icon"><Icon name="clock" size={22} /></span>
              <div><b>Giờ làm việc</b><span>{SHOP.hours}</span></div>
            </div>
            <iframe className="contact-map" title="Bản đồ cửa hàng" src={mapEmbedUrl()} loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade" />
          </aside>

          <section className="contact-form-card" aria-labelledby="contact-form-title">
            {sent ? (
              <div className="contact-success" role="status">
                <span className="success-icon"><Icon name="checkCircle" size={44} /></span>
                <h2>Đã gửi thành công!</h2>
                <p>Cảm ơn {sent.fullName}. Chúng tôi đã nhận được yêu cầu
                  (mã <b>#{sent.id}</b>) và sẽ phản hồi qua email <b>{sent.email}</b>
                  {sent.phone && <> hoặc số <b>{sent.phone}</b></>} sớm nhất.</p>
                <button type="button" className="btn btn-outline" onClick={() => { setSent(null); setForm(empty); }}>
                  Gửi yêu cầu khác
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="contact-form">
                <h2 id="contact-form-title">Gửi tin nhắn cho chúng tôi</h2>
                {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}
                <div className="form-row">
                  {field('fullName', 'Họ và tên *', { autoComplete: 'name' })}
                  {field('phone', 'Số điện thoại', { type: 'tel', autoComplete: 'tel' })}
                </div>
                {field('email', 'Email *', { type: 'email', autoComplete: 'email' })}
                <label className="field" htmlFor="ct-subject">
                  <span>Chủ đề</span>
                  <select id="ct-subject" name="subject" className="input" value={form.subject} onChange={onChange}>
                    {CONTACT_SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
                <label className="field" htmlFor="ct-message">
                  <span>Nội dung *</span>
                  <textarea id="ct-message" name="message" rows="6" maxLength={2000}
                            className={`input ${errors.message ? 'input-error' : ''}`}
                            placeholder="Ví dụ: Tôi cần lắp 4 camera cho cửa hàng 60m², có cần đầu ghi không?"
                            value={form.message} onChange={onChange} aria-invalid={!!errors.message} />
                  <small className="muted char-count">{form.message.length}/2000</small>
                  {errors.message && <small className="field-error">{errors.message}</small>}
                </label>
                <button type="submit" className="btn btn-primary btn-lg" disabled={sending}>
                  <Icon name="send" size={18} /> {sending ? 'Đang gửi...' : 'Gửi tin nhắn'}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
