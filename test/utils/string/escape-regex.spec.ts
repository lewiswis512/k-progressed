import { escapeRegex } from '../../../src/utils/string/escape-regex';

describe('escapeRegex', () => {
  it('should escape every regex metacharacter', () => {
    expect(escapeRegex('.*+?^${}()|[]\\')).toBe(
      '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\',
    );
  });

  it('should keep plain text unchanged', () => {
    expect(escapeRegex('John Doe 42')).toBe('John Doe 42');
  });

  it('should match the input literally once escaped', () => {
    const input = 'a.b*(c)';
    const regex = new RegExp(`^${escapeRegex(input)}$`);

    expect(regex.test(input)).toBe(true);
    expect(regex.test('aXbbb(c)')).toBe(false);
  });

  it('should neutralize a catastrophic backtracking pattern', () => {
    const regex = new RegExp(escapeRegex('(a+)+$'));

    expect(regex.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!')).toBe(false);
    expect(regex.test('x(a+)+$')).toBe(true);
  });
});
