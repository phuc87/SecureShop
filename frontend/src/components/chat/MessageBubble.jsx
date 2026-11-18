import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import ProductImage from '../common/ProductImage';
import PriceTag from '../common/PriceTag';

export const formatTime = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

function Body({ m }) {
  switch (m.type) {
    case 'IMAGE':
      return (
        <a href={m.fileUrl} target="_blank" rel="noreferrer" className="msg-image">
          <img src={m.fileUrl} alt={m.fileName || 'Hình ảnh'} loading="lazy" />
        </a>
      );
    case 'AUDIO':
      return (
        <div className="msg-audio">
          <Icon name="headset" size={16} />
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls preload="metadata" src={m.fileUrl} />
        </div>
      );
    case 'VIDEO':
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video className="msg-video" controls preload="metadata" src={m.fileUrl} />
      );
    case 'FILE':
      return (
        <a href={m.fileUrl} target="_blank" rel="noreferrer" className="msg-file" download={m.fileName}>
          <span className="msg-file-icon"><Icon name="inbox" size={20} /></span>
          <span><b>{m.fileName}</b><small>{formatSize(m.fileSize)} · Bấm để tải</small></span>
        </a>
      );
    case 'PRODUCT_CARD':
      return m.product ? (
        <Link to={`/products/${m.product.slug}`} className="msg-product">
          <ProductImage src={m.product.thumbnailUrl} alt="" categoryName={m.product.categoryName} iconSize={30} />
          <span>
            <b>{m.product.name}</b>
            <PriceTag price={m.product.price} salePrice={m.product.salePrice} />
            <small>Xem chi tiết →</small>
          </span>
        </Link>
      ) : <em>Sản phẩm không còn tồn tại</em>;
    default:
      return null;
  }
}

/** mine = tin của phía mình (căn phải). */
export default function MessageBubble({ m, mine, showSeen }) {
  if (m.senderType === 'SYSTEM' || m.type === 'CALL_LOG') {
    return (
      <div className="msg-system">
        {m.type === 'CALL_LOG' && <Icon name="video" size={14} />} {m.content}
        <time>{formatTime(m.createdAt)}</time>
      </div>
    );
  }
  const isAi = m.senderType === 'AI';
  return (
    <div className={`msg-row ${mine ? 'mine' : 'theirs'}`}>
      <div className={`msg-bubble type-${m.type.toLowerCase()} ${isAi ? 'is-ai' : ''}`}>
        {!mine && <span className="msg-sender">{m.senderName}</span>}
        <Body m={m} />
        {m.content && <p className="msg-text">{m.content}</p>}
        <span className="msg-meta">
          <time dateTime={m.createdAt}>{formatTime(m.createdAt)}</time>
          {mine && showSeen && m.seenAt && <span className="msg-seen">· Đã xem</span>}
        </span>
      </div>
    </div>
  );
}
