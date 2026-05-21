import { describe, it, expect } from 'vitest';
import { generateShortCode } from '../../src/utils/generate-short-code.js';

describe('generateShortCode', () => {
  it('should generate a string of length 7 by default', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(7);
  });

  it('should generate random strings', () => {
    const code1 = generateShortCode();
    const code2 = generateShortCode();
    expect(code1).not.toBe(code2);
  });

  it('should avoid empty strings', () => {
    const code = generateShortCode();
    expect(code.trim()).not.toBe('');
  });
});
