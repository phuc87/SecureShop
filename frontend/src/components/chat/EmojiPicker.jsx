const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤩', '🤔', '🙄', '😅', '😢', '😭', '😡',
  '😮', '😴', '🤗', '🙏', '👍', '👎', '👌', '✌️', '👏', '🙌', '💪', '👋', '❤️', '💙', '🔥', '⭐',
  '🎉', '✅', '❌', '⚠️', '❓', '💯', '📷', '🎥', '🔒', '🔑', '🏠', '🏪', '🚪', '🔔', '🚨', '💡',
  '📦', '🚚', '🛠️', '💰', '📞', '📍', '⏰', '📅',
];

export default function EmojiPicker({ onPick }) {
  return (
    <div className="chat-popover emoji-picker" role="dialog" aria-label="Chọn biểu tượng cảm xúc">
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => onPick(e)} aria-label={`Chèn ${e}`}>{e}</button>
      ))}
    </div>
  );
}
