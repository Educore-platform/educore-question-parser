export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  redis: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD?.trim() || undefined,
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'educore',
  },
  typeorm: {
    /** When false, Nest skips migrations on boot (e.g. Docker entrypoint ran them). Default true. */
    runMigrationsOnStartup:
      process.env.TYPEORM_RUN_MIGRATIONS_ON_STARTUP !== 'false',
  },
  upload: {
    maxSizeMB: Number(process.env.MAX_FILE_SIZE_MB ?? 50),
    maxFiles: Number(process.env.MAX_FILES ?? 20),
    dir: process.env.UPLOAD_DIR ?? './uploads',
  },
  media: {
    dir: process.env.MEDIA_DIR ?? './media',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
    maxTokens: Number(process.env.ANTHROPIC_MAX_TOKENS ?? 4096),
    batchSize: Number(process.env.AI_BATCH_SIZE ?? 5),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    batchSize: Number(process.env.CLOUDINARY_BATCH_SIZE ?? 10),
    uploadConcurrency: Number(process.env.CLOUDINARY_UPLOAD_CONCURRENCY ?? 5),
  },
});
