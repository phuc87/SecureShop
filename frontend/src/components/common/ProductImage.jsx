import { useState } from 'react';
import DeviceIcon from './DeviceIcon';

/**
 * Ảnh sản phẩm. Nếu chưa có file ảnh (vd. /images/products/ezviz-c6n.jpg chưa được đặt vào
 * frontend/public/images/products/) thì hiện icon theo loại thiết bị.
 */
export default function ProductImage({ src, alt, categoryName, iconSize = 72, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`product-image placeholder ${className}`} role="img" aria-label={alt}>
        <DeviceIcon categoryName={categoryName} size={iconSize} />
      </div>
    );
  }
  return (
    <div className={`product-image ${className}`}>
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}
