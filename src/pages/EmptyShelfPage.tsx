import { Link } from 'react-router-dom';
import { Shell } from '../components/Shell';

export function EmptyShelfPage({
  title,
  message,
  testId = 'empty-shelf',
  showJoin = true,
}: {
  title: string;
  message: string;
  testId?: string;
  showJoin?: boolean;
}) {
  return (
    <Shell title={title}>
      <div className="empty-shelf" data-testid={testId}>
        <p className="empty-shelf__message">{message}</p>
        <div className="empty-shelf__actions">
          <Link className="btn primary" to="/" data-testid="empty-shelf-home">
            Home
          </Link>
          {showJoin ? (
            <Link className="btn" to="/#join" data-testid="empty-shelf-join">
              Join a room
            </Link>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
