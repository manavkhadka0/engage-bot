import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  /** Only used to presign; devices on the LAN can't reach `localhost`. */
  private readonly presignClient: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'tokinomo';
    const credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'tokinomo',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '***REMOVED***',
    };
    const region = process.env.S3_REGION ?? 'us-east-1';
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';
    this.client = new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
      forcePathStyle,
      credentials,
    });
    this.presignClient = new S3Client({
      region,
      endpoint:
        process.env.S3_PUBLIC_ENDPOINT ??
        process.env.S3_ENDPOINT ??
        'http://localhost:9000',
      forcePathStyle,
      credentials,
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Created bucket ${this.bucket}`);
      } catch (err) {
        this.logger.warn(
          `S3 unavailable (${this.bucket}) — audio upload needs MinIO: ${String(err)}`,
        );
      }
    }
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ key: string; checksum: string; size: number }> {
    const checksum = createHash('sha256').update(body).digest('hex');
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: { checksum },
      }),
    );
    return { key, checksum, size: body.length };
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.presignClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }
}
