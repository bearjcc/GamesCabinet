/** In-world START / END stubs on the middle row (flat art matching Bear mockup). */
export function TracksTerminal({ side }: { side: 'start' | 'end' }) {
  const label = side === 'start' ? 'START' : 'END';
  return (
    <div
      className={`tracks-terminal tracks-terminal--${side}`}
      role="img"
      aria-label={label}
      data-testid={`tracks-terminal-${side}`}
    >
      <div
        className="tracks-terminal__track"
        data-testid={`tracks-terminal-${side}-track`}
        aria-hidden
      />
      <div className="tracks-terminal__buffer" aria-hidden />
      <div className="tracks-terminal__sign">{label}</div>
    </div>
  );
}
