import { type BotDifficulty, botDifficultyLabel, cycleBotDifficulty } from '../../lib/bots';

export function PlayBotDifficultyMenu({
  difficulty,
  onChange,
}: {
  difficulty: BotDifficulty;
  onChange: (next: BotDifficulty) => void;
}) {
  return (
    <div className="game-shell-menu-row">
      <span className="game-shell-menu-label">Bot</span>
      <button
        type="button"
        className="game-shell-menu-btn"
        data-testid="bot-difficulty"
        onClick={() => onChange(cycleBotDifficulty(difficulty))}
        aria-label={`Bot difficulty ${botDifficultyLabel(difficulty)}. Click to cycle.`}
      >
        {botDifficultyLabel(difficulty)}
      </button>
    </div>
  );
}
