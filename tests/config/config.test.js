const { parseCommaSeparatedList } = require('../../src/config');

describe('parseCommaSeparatedList', () => {
  it('returns an empty array for empty or missing values', () => {
    expect(parseCommaSeparatedList('')).toEqual([]);
    expect(parseCommaSeparatedList('   ')).toEqual([]);
    expect(parseCommaSeparatedList(undefined)).toEqual([]);
  });

  it('parses a single origin', () => {
    expect(parseCommaSeparatedList('http://localhost:5173')).toEqual([
      'http://localhost:5173',
    ]);
  });

  it('parses a comma-separated list and trims whitespace', () => {
    expect(
      parseCommaSeparatedList(
        'http://localhost:5173, https://myapp.com ,https://staging.myapp.com',
      ),
    ).toEqual([
      'http://localhost:5173',
      'https://myapp.com',
      'https://staging.myapp.com',
    ]);
  });
});
