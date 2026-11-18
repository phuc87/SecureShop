import useTheme from '../../hooks/useTheme';
import Icon from './Icon';

/** Nút chuyển giao diện sáng (ban ngày) / tối (ban đêm). */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggle } = useTheme();
  const label = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
  return (
    <button type="button" className={`theme-toggle ${className}`} onClick={toggle}
            aria-label={label} title={label} aria-pressed={isDark}>
      <Icon name={isDark ? 'sun' : 'moon'} size={20} />
    </button>
  );
}
