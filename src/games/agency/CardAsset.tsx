import { useState } from 'react';

type CardAssetProps = {
  src: string;
  alt: string;
  className?: string;
  /** Shown when the PNG is not on disk yet (graceful until ComfyUI assets land). */
  fallbackClassName?: string;
};

/**
 * Layered card image. Text and numbers stay in DOM; this is for flat icon/plate PNGs only.
 */
export function CardAsset({ src, alt, className, fallbackClassName }: CardAssetProps) {
  const [failed, setFailed] = useState(false);

  if (failed && fallbackClassName) {
    return <span className={fallbackClassName} aria-hidden="true" />;
  }

  if (failed) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
