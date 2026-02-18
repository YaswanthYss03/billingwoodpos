import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const redis = new Redis(process.env.REDIS_URL!);

async function main() {
  console.log('Flushing Redis cache...');
  
  await redis.flushall();
  
  console.log('✅ Redis cache cleared successfully!');
  
  await redis.quit();
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
