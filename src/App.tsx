import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GameLaunch } from './pages/GameLaunch';
import { Home } from './pages/Home';
import { PlayBot } from './pages/PlayBot';
import { PlayLocal } from './pages/PlayLocal';
import { PlayOnline } from './pages/PlayOnline';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/game/:gameId" element={<GameLaunch />} />
        <Route path="/play/:gameId" element={<PlayLocal />} />
        <Route path="/vs-bot/:gameId" element={<PlayBot />} />
        <Route path="/g/:gameId/:code" element={<PlayOnline />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
