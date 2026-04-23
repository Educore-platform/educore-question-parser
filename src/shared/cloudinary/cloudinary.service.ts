import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>('cloudinary.cloudName'),
      api_key: this.configService.getOrThrow<string>('cloudinary.apiKey'),
      api_secret: this.configService.getOrThrow<string>('cloudinary.apiSecret'),
    });
  }

  async uploadFile(
    localPath: string,
    folder: string,
    publicId?: string,
  ): Promise<CloudinaryUploadResult> {
    const options: Record<string, string | boolean> = {
      folder,
      resource_type: 'auto',
      use_filename: false,
      unique_filename: false,
    };
    if (publicId && publicId.length) options.public_id = publicId;

    const result = await cloudinary.uploader.upload(localPath, options);
    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  }
}
