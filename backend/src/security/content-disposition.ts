export function attachmentContentDisposition(filename: string): string {
  const fallback = filename.replace(/[\r\n"\\]/g, '_').replace(/[^\x20-\x7e]/g, '_') || 'download';
  const encoded = encodeURIComponent(filename).replace(/['()*!]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
