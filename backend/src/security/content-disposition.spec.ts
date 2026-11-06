import { attachmentContentDisposition } from './content-disposition';

describe('attachmentContentDisposition', () => {
  it('creates a safe ASCII fallback and UTF-8 encoded filename parameter', () => {
    expect(attachmentContentDisposition('report "final".csv\r\n')).toBe(
      'attachment; filename="report _final_.csv__"; filename*=UTF-8\'\'report%20%22final%22.csv%0D%0A',
    );
    expect(attachmentContentDisposition('résumé.csv')).toContain('filename*=UTF-8\'\'r%C3%A9sum%C3%A9.csv');
  });
});
