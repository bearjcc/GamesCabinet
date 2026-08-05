import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from './clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('copyToClipboard', () => {
  it('uses navigator.clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when clipboard API is missing', async () => {
    vi.stubGlobal('navigator', {});
    const select = vi.fn();
    const removeChild = vi.fn();
    const appendChild = vi.fn();
    const textarea = { value: '', style: {}, select, setAttribute: vi.fn() };
    const createElement = vi.fn().mockReturnValue(textarea);
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal('document', {
      createElement,
      body: { appendChild, removeChild },
      execCommand,
    });

    await expect(copyToClipboard('room-link')).resolves.toBe(true);
    expect(textarea.value).toBe('room-link');
    expect(select).toHaveBeenCalled();
    expect(appendChild).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
  });

  it('returns false when both clipboard paths fail', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    vi.stubGlobal('document', {
      createElement: () => {
        throw new Error('no dom');
      },
    });
    await expect(copyToClipboard('x')).resolves.toBe(false);
  });
});
