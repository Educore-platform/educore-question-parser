import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from '../../../src/shared/redis/redis.service';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let configService: {
    get: jest.Mock;
  };

  function getLatestMockInstance(): {
    connect: jest.Mock;
    quit: jest.Mock;
  } {
    const MockRedis = Redis as unknown as jest.Mock;
    const calls = MockRedis.mock.results;
    const last = calls[calls.length - 1]?.value as {
      connect: jest.Mock;
      quit: jest.Mock;
    };
    return last;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'redis.host') return '127.0.0.1';
        if (key === 'redis.port') return 6379;
        return defaultValue;
      }),
    };

    const MockRedis = Redis as unknown as jest.Mock;
    MockRedis.mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  describe('onModuleInit', () => {
    it('creates Redis client with config host/port and connects', async () => {
      await service.onModuleInit();

      expect(Redis).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 6379,
        lazyConnect: true,
      });

      const inst = getLatestMockInstance();
      expect(inst.connect).toHaveBeenCalled();
    });

    it('uses ConfigService defaults when keys missing', async () => {
      configService.get.mockImplementation((key: string, def?: unknown) => def);

      await service.onModuleInit();

      expect(Redis).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 6379,
        lazyConnect: true,
      });
    });

    it('propagates connect failure and logs error', async () => {
      const err = new Error('ECONNREFUSED');
      const MockRedis = Redis as unknown as jest.Mock;
      MockRedis.mockImplementation(() => ({
        connect: jest.fn().mockRejectedValue(err),
        quit: jest.fn().mockResolvedValue(undefined),
      }));

      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await expect(service.onModuleInit()).rejects.toThrow('ECONNREFUSED');

      expect(errorSpy).toHaveBeenCalledWith('Redis connection failed', err);

      errorSpy.mockRestore();
    });
  });

  describe('getClient', () => {
    it('returns Redis instance after init', async () => {
      await service.onModuleInit();

      const client = service.getClient();
      expect(client).toBe(getLatestMockInstance());
    });
  });

  describe('onModuleDestroy', () => {
    it('quits client when present', async () => {
      await service.onModuleInit();
      const inst = getLatestMockInstance();

      await service.onModuleDestroy();

      expect(inst.quit).toHaveBeenCalled();
    });

    it('does not throw when client missing', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
