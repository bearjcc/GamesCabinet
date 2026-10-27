import { createContext, type ReactNode, useContext } from 'react';

const PlayRoomMetaContext = createContext<string | null>(null);

export function PlayRoomMetaProvider({
  roomCode,
  children,
}: {
  roomCode: string | null;
  children: ReactNode;
}) {
  return <PlayRoomMetaContext.Provider value={roomCode}>{children}</PlayRoomMetaContext.Provider>;
}

export function usePlayRoomMeta(): string | null {
  return useContext(PlayRoomMetaContext);
}
