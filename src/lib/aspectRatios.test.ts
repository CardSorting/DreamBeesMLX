import { describe, expect, it } from 'vitest';
import {
  aspectRatioOptions,
  DEFAULT_ASPECT_RATIO,
  getAspectRatioOption,
  normalizeAspectRatio,
  toCssAspectRatio,
} from './aspectRatios';
import { mapHistoryItemToDetail } from './generationFlow';

describe('aspect ratio helpers', () => {
  it('keeps user-facing shape presets in a stable order', () => {
    expect(aspectRatioOptions.map((option) => option.value)).toEqual([
      '4:5',
      '1:1',
      '3:4',
      '2:3',
      '9:16',
      '16:9',
    ]);
  });

  it('normalizes unsupported ratio values to the recommended default', () => {
    expect(normalizeAspectRatio('9:16')).toBe('9:16');
    expect(normalizeAspectRatio('17:22')).toBe(DEFAULT_ASPECT_RATIO);
    expect(normalizeAspectRatio(undefined)).toBe(DEFAULT_ASPECT_RATIO);
  });

  it('formats ratio values for CSS and labels', () => {
    expect(toCssAspectRatio('4:5')).toBe('4 / 5');
    expect(toCssAspectRatio('bad-value')).toBe('1 / 1');
    expect(getAspectRatioOption('4:5')?.label).toBe('Feed');
    expect(getAspectRatioOption(DEFAULT_ASPECT_RATIO)?.badge).toBe('Recommended');
  });
});

describe('generation detail mapping', () => {
  it('preserves aspect ratio from recovered local params', () => {
    const detail = mapHistoryItemToDetail({
      id: 'gen_1',
      prompt: 'a poster',
      imageUrl: 'https://example.test/image.webp',
      params: { aspectRatio: '2:3' },
    });

    expect(detail.parameters.size).toBe('2:3');
  });
});
