import { useNavigate } from 'react-router-dom';
import { JoinRoomPanel } from './JoinRoomPanel';

export function HeaderJoin() {
  const navigate = useNavigate();
  return (
    <div className="header-join" data-testid="header-join">
      <JoinRoomPanel
        askName
        title=""
        compact
        onJoined={(room) => {
          navigate(`/g/${room.gameName}/${room.matchID}`);
        }}
      />
    </div>
  );
}
