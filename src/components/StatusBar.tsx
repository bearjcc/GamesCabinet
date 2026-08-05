export function StatusBar({
  text,
  tone = 'neutral',
}: {
  text: string;
  tone?: 'neutral' | 'you' | 'wait' | 'done';
}) {
  return (
    <div className={`status status-${tone}`} role="status">
      {text}
    </div>
  );
}
