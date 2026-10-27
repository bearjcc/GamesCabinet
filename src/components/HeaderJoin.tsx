import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SeatedRoom } from '../lib/lobby';
import { JoinRoomPanel } from './JoinRoomPanel';

export function HeaderJoin() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [dialogOpen]);

  function onJoined(room: SeatedRoom) {
    setDialogOpen(false);
    navigate(`/g/${room.gameName}/${room.matchID}`);
  }

  return (
    <div className="header-join" data-testid="header-join">
      <div className="header-join__desktop">
        <JoinRoomPanel
          title="Join a room"
          compact
          codeBoxes
          joinLabel="Join →"
          onJoined={onJoined}
        />
      </div>
      <button
        type="button"
        className="header-join__mobile"
        data-testid="header-join-open"
        onClick={() => setDialogOpen(true)}
      >
        Join a room →
      </button>
      {dialogOpen ? (
        <dialog
          ref={dialogRef}
          className="header-join__dialog"
          aria-labelledby="header-join-dialog-title"
          onClose={() => setDialogOpen(false)}
        >
          <h2 id="header-join-dialog-title">Join a room</h2>
          <JoinRoomPanel
            askName
            codeBoxes
            joinLabel="Join →"
            title=""
            testIdPrefix="join-dialog"
            onJoined={onJoined}
          />
          <button
            type="button"
            className="btn ghost header-join__dialog-close"
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </button>
        </dialog>
      ) : null}
    </div>
  );
}
