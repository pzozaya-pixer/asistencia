import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { Client } from 'minio';

@Injectable()
export class StorageService {
  private readonly client: Client;
  private readonly publicClient: Client | null;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') ?? 'minio',
      port: Number(this.configService.get<string>('MINIO_PORT') ?? '9000'),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey:
        this.configService.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
      secretKey:
        this.configService.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
    });

    const publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL');

    if (publicUrl) {
      const parsed = new URL(publicUrl);
      this.publicClient = new Client({
        endPoint: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
        useSSL: parsed.protocol === 'https:',
        accessKey:
          this.configService.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
        secretKey:
          this.configService.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
      });
    } else {
      this.publicClient = null;
    }
  }

  async uploadObject(input: {
    bucket: string;
    originalName: string;
    mimeType: string;
    buffer: Buffer;
    prefix: string;
  }) {
    const extension = this.getExtension(input.originalName);
    const objectName = `${input.prefix}/${Date.now()}-${randomUUID()}${extension}`;
    const checksum = createHash('sha256').update(input.buffer).digest('hex');

    await this.client.putObject(
      input.bucket,
      objectName,
      input.buffer,
      input.buffer.byteLength,
      {
        'Content-Type': input.mimeType,
      },
    );

    return {
      bucket: input.bucket,
      objectName,
      checksum,
      size: input.buffer.byteLength,
    };
  }

  async getObject(bucket: string, objectName: string) {
    const stream = await this.client.getObject(bucket, objectName);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    return Buffer.concat(chunks);
  }

  async getSignedUrl(bucket: string, objectName: string, expirySeconds?: number) {
    if (!this.publicClient) {
      return null;
    }

    return this.publicClient.presignedGetObject(
      bucket,
      objectName,
      expirySeconds ??
        Number(this.configService.get<string>('MINIO_SIGNED_URL_TTL') ?? '900'),
    );
  }

  async checkConnection() {
    await this.client.listBuckets();
    return true;
  }

  private getExtension(filename: string) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.slice(lastDot) : '';
  }
}
