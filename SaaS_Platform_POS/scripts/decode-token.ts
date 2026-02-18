import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function decodeToken() {
  console.log('🔍 Decoding Supabase JWT token...\n');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'Admin@123',
  });

  if (error || !data.session) {
    console.error('❌ Login failed');
    return;
  }

  const token = data.session.access_token;
  
  // Decode JWT header (without verification)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('❌ Invalid JWT token format');
    return;
  }

  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

  console.log('📝 JWT Header:');
  console.log(JSON.stringify(header, null, 2));
  
  console.log('\n📝 JWT Payload:');
  console.log(JSON.stringify(payload, null, 2));
  
  console.log('\n⚠️  IMPORTANT:');
  console.log(`   Token uses algorithm: ${header.alg}`);
  
  if (header.alg === 'ES256') {
    console.log('   ↳ This is Elliptic Curve signing (ES256)');
    console.log('   ↳ Backend is configured for HMAC signing (HS256)');
    console.log('   ↳ This mismatch causes the 401 Unauthorized error!');
  }
}

decodeToken().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
