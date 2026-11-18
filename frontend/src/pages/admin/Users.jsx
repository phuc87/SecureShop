import { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { EmptyState, ErrorState, Spinner } from '../../components/common/StateViews';
import { formatDate } from '../../utils/format';

const ROLE_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'CUSTOMER', label: 'Khách hàng' },
  { value: 'ADMIN', label: 'Quản trị viên' },
];

const ROLE_LABEL = { CUSTOMER: 'Khách hàng', ADMIN: 'Quản trị' };

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [pending, setPending] = useState(null); // thao tác đang chờ xác nhận
  const [busy, setBusy] = useState(false);

  // Gõ xong 300ms mới tìm, tránh gọi API mỗi phím
  useEffect(() => {
    const t = setTimeout(() => setKeyword(keywordInput.trim()), 300);
    return () => clearTimeout(t);
  }, [keywordInput]);

  const { data: users, loading, error, reload } = useFetch(
    () => adminApi.users({ q: keyword || undefined, role: role || undefined }),
    [keyword, role],
  );

  const askToggleStatus = (u) => setPending({
    title: u.enabled ? 'Khoá tài khoản?' : 'Mở khoá tài khoản?',
    message: u.enabled
      ? `${u.fullName} (${u.email}) sẽ bị đăng xuất và không thể đăng nhập cho tới khi được mở khoá.`
      : `${u.fullName} (${u.email}) sẽ đăng nhập lại được bình thường.`,
    confirmLabel: u.enabled ? 'Khoá tài khoản' : 'Mở khoá',
    danger: u.enabled,
    run: () => adminApi.updateUserStatus(u.id, !u.enabled),
    success: u.enabled ? `Đã khoá tài khoản ${u.email}` : `Đã mở khoá tài khoản ${u.email}`,
  });

  const askChangeRole = (u, newRole) => setPending({
    title: 'Đổi vai trò?',
    message: newRole === 'ADMIN'
      ? `${u.fullName} sẽ có toàn quyền quản trị: xem mọi đơn hàng, khoá tài khoản, đổi vai trò người khác. Tài khoản quản trị không mua hàng được.`
      : `${u.fullName} sẽ mất quyền quản trị và trở thành khách hàng.`,
    confirmLabel: `Đổi thành ${ROLE_LABEL[newRole]}`,
    danger: newRole === 'ADMIN',
    run: () => adminApi.updateUserRole(u.id, newRole),
    success: `Đã đổi ${u.email} thành ${ROLE_LABEL[newRole]}`,
  });

  const confirm = async () => {
    setBusy(true);
    try {
      await pending.run();
      toast.success(pending.success);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Người dùng</h1>
          <p className="muted">Khoá tài khoản vi phạm hoặc cấp quyền quản trị cho nhân viên tư vấn.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Lọc theo vai trò">
          {ROLE_TABS.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={role === t.value}
                    className={role === t.value ? 'active' : ''} onClick={() => setRole(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
        <label htmlFor="user-search" className="sr-only">Tìm người dùng</label>
        <input id="user-search" type="search" className="input toolbar-search" placeholder="Tìm theo tên, email, số điện thoại"
               value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} />
      </div>

      {loading && !users && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {users && users.length === 0 && <EmptyState title="Không có người dùng phù hợp" />}
      {users && users.length > 0 && (
        <div className="table-wrap table-stack-wrap">
          {/* Trên điện thoại mỗi dòng thành 1 thẻ; data-label là nhãn hiện bên trái giá trị */}
          <table className="data-table table-stack">
            <thead>
              <tr>
                <th>#</th><th>Họ tên</th><th>Email</th><th>Điện thoại</th><th>Vai trò</th>
                <th>Trạng thái</th><th>Ngày tạo</th><th><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === me.id;
                return (
                  <tr key={u.id} className={u.enabled ? '' : 'row-muted'}>
                    <td className="cell-id">{u.id}</td>
                    <td className="cell-title">{u.fullName} {isMe && <span className="chip">Bạn</span>}</td>
                    <td data-label="Email" className="cell-break">{u.email}</td>
                    <td data-label="Điện thoại">{u.phone || '-'}</td>
                    <td data-label="Vai trò">
                      <select id={`role-${u.id}`} className="input input-sm" value={u.role} disabled={isMe}
                              aria-label={`Vai trò của ${u.fullName}`}
                              title={isMe ? 'Không thể tự đổi vai trò của chính mình' : undefined}
                              onChange={(e) => askChangeRole(u, e.target.value)}>
                        <option value="CUSTOMER">Khách hàng</option>
                        <option value="ADMIN">Quản trị</option>
                      </select>
                    </td>
                    <td data-label="Trạng thái">
                      <span className={`chip ${u.enabled ? 'chip-green' : 'chip-red'}`}>
                        {u.enabled ? 'Hoạt động' : 'Đã khoá'}
                      </span>
                    </td>
                    <td data-label="Ngày tạo">{formatDate(u.createdAt)}</td>
                    <td className="cell-actions">
                      <button type="button" className={`btn btn-sm ${u.enabled ? 'btn-outline-danger' : 'btn-outline'}`}
                              disabled={isMe} onClick={() => askToggleStatus(u)}
                              title={isMe ? 'Không thể tự khoá tài khoản của chính mình' : undefined}>
                        {u.enabled ? 'Khoá' : 'Mở khoá'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!pending} title={pending?.title} message={pending?.message}
                     confirmLabel={pending?.confirmLabel} danger={pending?.danger} busy={busy}
                     onConfirm={confirm} onCancel={() => setPending(null)} />
    </>
  );
}
