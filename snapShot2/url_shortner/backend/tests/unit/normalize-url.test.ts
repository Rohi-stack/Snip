import { describe, it, expect } from 'vitest';
import { normalizeUrl } from '../../src/utils/normalize-url.js';

describe('normalizeUrl', () => {
  it('should trim whitespace', () => {
    expect(normalizeUrl('  https://google.com  ')).toBe('https://google.com');
  });

  it('should add https:// if missing', () => {
    expect(normalizeUrl('google.com')).toBe('https://google.com');
    expect(normalizeUrl('www.google.com')).toBe('https://www.google.com');
  });

  it('should preserve existing http:// or https://', () => {
    expect(normalizeUrl('https://google.com')).toBe('https://google.com');
    expect(normalizeUrl('http://google.com')).toBe('http://google.com');
  });
});
