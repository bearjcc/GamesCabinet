import { useState } from 'react';
import { copyToClipboard } from '../lib/clipboard';
import { roomShareUrl } from '../lib/matchSeats';

export function RoomBar({
  gameId,
  matchID,
  onLeave,
  busy = false,
}: {
  gameId: string;
  matchID: string;
  onLeave?: () => void;
  busy?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  async function onCopyLink() {
    setCopyStatus(null);
    const url = roomShareUrl(gameId, matchID);
    const ok = await copyToClipboard(url);
    setCopyStatus(ok ? 'Copied' : 'Could not copy — select the room code');
  }

  return (
    <div className="room-chip">
      <span>
        Room <strong data-testid="room-code">{matchID}</strong>
      </span>
      <button
        type="button"
        className="btn ghost"
        disabled={busy}
        data-testid="copy-room-link"
        onClick={() => void onCopyLink()}
      >
        Copy link
      </button>
      {copyStatus ? (
        <span
          className="room-copy-status"
          role="status"
          aria-live="polite"
          data-testid="copy-room-status"
        >
          {copyStatus}
        </span>
      ) : null}
      {onLeave ? (
        <button type="button" className="btn ghost" disabled={busy} onClick={onLeave}>
          Leave
        </button>
      ) : null}
    </div>
  );
}
