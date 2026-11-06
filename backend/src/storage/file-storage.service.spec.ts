import { BadRequestException } from '@nestjs/common';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStorageService } from './file-storage.service';

describe('FileStorageService', () => {
  it('persists and reads files using opaque keys, rejects traversal, and removes files idempotently', async () => {
    const previousDirectory = process.env.DATA_STORAGE_DIR;
    const directory = await mkdtemp(join(tmpdir(), 'matiksight-storage-'));
    process.env.DATA_STORAGE_DIR = directory;
    try {
      const storage = new FileStorageService();
      const contents = Buffer.from('persistent dataset');
      const key = await storage.store(contents, '.csv');

      expect(key).toMatch(/^[0-9a-f-]{36}\.csv$/i);
      await expect(storage.read(key)).resolves.toEqual(contents);
      await expect(storage.read('../dataset.csv')).rejects.toBeInstanceOf(BadRequestException);
      await storage.remove(key);
      await storage.remove(key);
      await expect(storage.read(key)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      if (previousDirectory === undefined) delete process.env.DATA_STORAGE_DIR;
      else process.env.DATA_STORAGE_DIR = previousDirectory;
      await rm(directory, { recursive: true, force: true });
    }
  });
});
