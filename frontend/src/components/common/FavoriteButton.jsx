import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useToast } from '../../context/ToastContext';
import Icon from './Icon';

/**
 * Nút trái tim.
 * variant="icon": nút tròn nhỏ đè lên ảnh (thẻ sản phẩm).
 * variant="full": nút có chữ (trang chi tiết).
 */
export default function FavoriteButton({ product, variant = 'icon' }) {
  const { user, canShop } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  if (user && !canShop) return null; // admin không mua hàng -> không có yêu thích

  const liked = !!user && isFavorite(product.id);
  const label = liked ? `Bỏ yêu thích ${product.name}` : `Thêm ${product.name} vào yêu thích`;

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info('Đăng nhập để lưu sản phẩm yêu thích');
      navigate('/login', { state: { from: location } });
      return;
    }
    toggle(product);
  };

  if (variant === 'full') {
    return (
      <button type="button" className={`btn btn-outline fav-full ${liked ? 'liked' : ''}`} aria-pressed={liked} onClick={onClick}>
        <Icon name="heart" size={18} filled={liked} />
        {liked ? 'Đã yêu thích' : 'Yêu thích'}
      </button>
    );
  }
  return (
    <button type="button" className={`fav-btn ${liked ? 'liked' : ''}`} aria-pressed={liked} aria-label={label}
            title={liked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} onClick={onClick}>
      <Icon name="heart" size={18} filled={liked} />
    </button>
  );
}
