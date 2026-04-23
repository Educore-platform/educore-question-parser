import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('redis.host', '127.0.0.1');
    const port = this.configService.get<number>('redis.port', 6379);
    const username = this.configService.get<string | undefined>(
      'redis.username',
    );
    const password = this.configService.get<string | undefined>(
      'redis.password',
    );

    this.client = new Redis({
      host,
      port,
      lazyConnect: true,
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
    });

    try {
      await this.client.connect();
      this.logger.log(`Redis connected → ${host}:${port}`);
    } catch (err) {
      this.logger.error('Redis connection failed', err);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
