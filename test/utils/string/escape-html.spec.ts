import { escapeHtml } from '../../../src/utils/string/escape-html';

describe('escapeHtml', () => {
  it('should escape the html special characters', () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;',
    );
  });

  it('should keep plain text unchanged', () => {
    expect(escapeHtml('Hello John')).toBe('Hello John');
  });

  it('should not double escape in a single pass', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it.each([
    [null, ''],
    [undefined, ''],
    [42, '42'],
    [0, '0'],
    [false, 'false'],
  ])('should stringify %p', (value, expected) => {
    expect(escapeHtml(value)).toBe(expected);
  });
});
