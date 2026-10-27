import { type KeyboardEvent, useRef } from 'react';

type Props = {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  disabled?: boolean;
  testId?: string;
};

export function RoomCodeBoxes({
  value,
  onChange,
  length = 4,
  disabled = false,
  testId = 'join-code',
}: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.toUpperCase().padEnd(length, ' ').slice(0, length).split('');

  function commit(nextChars: string[]) {
    onChange(nextChars.join('').trimEnd());
  }

  function onCharChange(index: number, char: string) {
    const next = [...chars];
    next[index] = char.slice(-1).toUpperCase();
    commit(next);
    if (char && index < length - 1) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !chars[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="room-code-boxes" data-testid={testId}>
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          className="room-code-boxes__cell"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={1}
          disabled={disabled}
          value={char.trim()}
          aria-label={`Room code letter ${index + 1}`}
          data-testid={`${testId}-${index}`}
          onChange={(event) => onCharChange(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
        />
      ))}
    </div>
  );
}
