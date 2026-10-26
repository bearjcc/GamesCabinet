export function StatusBar({
  text,
  tone = 'neutral',
}: {
  text: string;
  tone?: 'neutral' | 'you' | 'wait' | 'done';
}) {
  return (
    <div
      className={`status status-${tone}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="match-status"
    >
      {text}
    </div>
  );
}
