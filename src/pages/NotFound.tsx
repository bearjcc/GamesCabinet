import { EmptyShelfPage } from './EmptyShelfPage';

export function NotFound() {
  return (
    <EmptyShelfPage
      title="Nothing on this shelf"
      message="That address is not in the cabinet. Pick a game from home, or join with a room code."
      testId="page-not-found"
    />
  );
}
