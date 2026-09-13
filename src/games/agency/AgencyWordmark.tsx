type AgencyWordmarkProps = {
  /** compact = catalogue tile; play = in-match header */
  variant?: 'compact' | 'play';
};

const LOGO_SRC = '/games/agency/logo.jpg';

export function AgencyWordmark({ variant = 'play' }: AgencyWordmarkProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Agency"
      className={`agency-wordmark agency-wordmark--${variant}`}
      data-testid="agency-wordmark"
    />
  );
}
