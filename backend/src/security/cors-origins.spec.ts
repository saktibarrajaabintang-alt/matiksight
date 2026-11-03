import { parseCorsOrigins } from './cors-origins';

describe('parseCorsOrigins', () => {
  it('allows only an explicit list of exact http origins', () => {
    expect(parseCorsOrigins(' http://localhost:3001,https://app.example.com ')).toEqual([
      'http://localhost:3001',
      'https://app.example.com',
    ]);
  });

  it('disables cross-origin access when no origins are configured', () => {
    expect(parseCorsOrigins('')).toEqual([]);
  });

  it.each(['*', 'https://app.example.com/path', 'ftp://app.example.com', 'not-a-url'])(
    'rejects unsafe or invalid origin config: %s',
    (origin) => expect(() => parseCorsOrigins(origin)).toThrow(),
  );
});
