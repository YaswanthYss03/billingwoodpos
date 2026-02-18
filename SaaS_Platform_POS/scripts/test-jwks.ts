import { JwksClient } from 'jwks-rsa';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

async function testJwks() {
  console.log('🔍 Testing JWKS fetching...\n');
  console.log('JWKS URI:', `${supabaseUrl}/auth/v1/jwks`);

  const client = new JwksClient({
    jwksUri: `${supabaseUrl}/auth/v1/jwks`,
    requestHeaders: {
      'apikey': supabaseAnonKey,
    },
  });

  try {
    // Kid from the token we decoded earlier
    const kid = '99244bb1-411c-4222-a518-6ed1f76c80aa';
    console.log('Fetching signing key for kid:', kid);
    
    const key = await client.getSigningKey(kid);
    console.log('✅ Successfully fetched signing key!');
    console.log('Public key:', key.getPublicKey().substring(0, 100) + '...');
  } catch (error: any) {
    console.error('❌ Failed to fetch signing key');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testJwks().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
