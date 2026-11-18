import { useState } from 'react';
import adminApi from '../../api/adminApi';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';
import Icon from '../../components/common/Icon';
import { subjectLabel } from '../../utils/shopInfo';

const TABS = [
  { value: 'NEW', label: 'Chưa xử lý' },
  { value: 'HANDLED', label: 'Đã xử lý' },
  { value: '', label: 'Tất cả' },
];

const formatDateTime = (iso) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export default function Contacts() {
  const toast = useToast();
  const [status, setStatus] = useState('NEW');
  const [busyId, setBusyId] = useState(null);
  const { data: items, loading, error, reload } = useFetch(() => adminApi.contacts(status || undefined), [status]);

  const toggle = async (c) => {
    const next = c.status === 'NEW' ? 'HANDLED' : 'NEW';
    setBusyId(c.id);
    try {
      await adminApi.updateContactStatus(c.id, next);
      toast.success(next === 'HANDLED' ? `Đã xử lý tin #${c.id}` : `Đã mở lại tin #${c.id}`);
      window.dispatchEvent(new Event('contacts:changed')); // cập nhật badge trên menu
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tin nhắn liên hệ</h1>
          <p className="muted">Yêu cầu gửi từ trang Liên hệ. Gọi lại hoặc trả lời email khách rồi đánh dấu đã xử lý.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Lọc theo trạng thái">
          {TABS.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={status === t.value}
                    className={status === t.value ? 'active' : ''} onClick={() => setStatus(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !items && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {items && items.length === 0 && (
        <EmptyState title={status === 'NEW' ? 'Không còn tin nào chưa xử lý' : 'Chưa có tin nhắn'} />
      )}
      {items && items.length > 0 && (
        <ul className="contact-list">
          {items.map((c) => (
            <li key={c.id} className={`contact-item ${c.status === 'NEW' ? 'is-new' : ''}`}>
              <div className="contact-item-head">
                <div>
                  <b>{c.fullName}</b>
                  <span className="chip chip-blue">{subjectLabel(c.subject)}</span>
                  {c.status === 'NEW' ? <span className="chip chip-red">Mới</span> : <span className="chip chip-green">Đã xử lý</span>}
                </div>
                <span className="muted small">#{c.id} · {formatDateTime(c.createdAt)}</span>
              </div>
              <p className="contact-message">{c.message}</p>
              <div className="contact-item-foot">
                <span className="contact-ways">
                  <a href={`mailto:${c.email}`}><Icon name="mail" size={15} /> {c.email}</a>
                  {c.phone && <a href={`tel:${c.phone}`}><Icon name="phone" size={15} /> {c.phone}</a>}
                  {c.handledByName && <span className="muted small">Xử lý bởi {c.handledByName} lúc {formatDateTime(c.handledAt)}</span>}
                </span>
                <button type="button" className={`btn btn-sm ${c.status === 'NEW' ? 'btn-primary' : 'btn-outline'}`}
                        disabled={busyId === c.id} onClick={() => toggle(c)}>
                  {c.status === 'NEW' ? 'Đánh dấu đã xử lý' : 'Mở lại'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
