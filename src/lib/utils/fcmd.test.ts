import { fcmd } from '../../lib/utils';

describe('fcmd', () => {
  it('should resolve empty args to string', () => {
    expect(fcmd(`yarn run`)).toBe('yarn run');
  });
  it('should resolve only single arg to string', () => {
    expect(fcmd(`${'yarn run'}`)).toBe('yarn run');
  });
  it('should resolve only single arg to string', () => {
    expect(fcmd(`${'yarn run'}`)).toBe('yarn run');
  });
  it('should resolve string', () => {
    expect(fcmd(`${'yarn'} ${'build'}`)).toBe(`yarn build`);
  });
  it('should resolve string 2', () => {
    expect(fcmd(`${'yarn'} ${{ hello: 'build' }?.hello}`)).toBe(`yarn build`);
  });
  it('should resolve undefined value to null', () => {
    expect(fcmd`yarn run ${undefined}`).toBe(null);
  });
  it('should resolve undefined value to null', () => {
    expect(fcmd`yarn run ${null}`).toBe(null);
  });
  it('should resolve false value to null', () => {
    expect(fcmd`yarn run ${false}`).toBe(null);
  });
  it('should resolve empty string value to null', () => {
    expect(fcmd`yarn run ${false}`).toBe(null);
  });

  it('should resolve some undefined value to null', () => {
    expect(fcmd`yarn run ${'build'} ${undefined}`).toBe(null);
  });
});
