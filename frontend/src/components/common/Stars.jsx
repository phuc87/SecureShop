import Icon from './Icon';

/** Hiện số sao (làm tròn tới nửa sao không cần thiết: tô theo số nguyên gần nhất). */
export default function Stars({ value, size = 16 }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className="stars" role="img" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} filled={i <= rounded} />)}
    </span>
  );
}
