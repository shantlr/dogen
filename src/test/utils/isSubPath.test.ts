import { isSubPath } from '../../lib/utils';

describe('isSubPath', () => {
  it('should resolve false for same path', () => {
    expect(isSubPath('/test/a', '/test/a')).toBe(false);
  });
  it('should resolve false when ref path is longer', () => {
    expect(isSubPath('/test/a/b', '/test/a')).toBe(false);
  });
  it('should resolve false when different root', () => {
    expect(isSubPath('/test/a', '/test2/a')).toBe(false);
  });
  it('should resolve false when same level', () => {
    expect(isSubPath('/test/a', '/test/b')).toBe(false);
  });
  it('should resolve true when sub path', () => {
    expect(isSubPath('/test/a', '/test/a/b')).toBe(true);
  });
  it('should resolve true when deep sub path', () => {
    expect(isSubPath('/test/a/b', '/test/a/b/c/d/e/f')).toBe(true);
  });
});
