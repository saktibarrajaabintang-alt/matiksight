import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls', '.png', '.jpg', '.jpeg']);

@Injectable()
export class FileStorageService {
  private readonly root: string;

  constructor() {
    this.root = resolve(process.env.DATA_STORAGE_DIR || resolve(process.cwd(), 'storage'));
  }

  async store(buffer: Buffer, extension: string): Promise<string> {
    const normalizedExtension = extension.toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(normalizedExtension)) {
      throw new BadRequestException('Ekstensi file tidak didukung untuk penyimpanan.');
    }
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BadRequestException('File kosong atau tidak memiliki isi.');
    }

    await mkdir(this.root, { recursive: true });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const key = `${randomUUID()}${normalizedExtension}`;
      try {
        await writeFile(this.pathForKey(key), buffer, { flag: 'wx', mode: 0o600 });
        return key;
      } catch (error) {
        if (!this.isErrorCode(error, 'EEXIST')) throw error;
      }
    }
    throw new InternalServerErrorException('Gagal menghasilkan nama file penyimpanan yang unik.');
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.pathForKey(key));
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(this.pathForKey(key));
    } catch (error) {
      if (this.isErrorCode(error, 'ENOENT')) return;
      throw error;
    }
  }

  private pathForKey(key: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(csv|xlsx|xls|png|jpg|jpeg)$/i.test(key)) {
      throw new BadRequestException('Kunci file tidak valid.');
    }
    const path = resolve(this.root, key);
    const relativePath = relative(this.root, path);
    if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('Kunci file tidak valid.');
    }
    return path;
  }

  private isErrorCode(error: unknown, code: string): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
  }
}
