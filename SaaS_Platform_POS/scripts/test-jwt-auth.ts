import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function testAuth() {
  console.log('🔐 Testing JWT authentication...\n');

  const { data } = await supabase.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'Admin@123',
  });

  if (data.session) {
    const token = data.session.access_token;
    console.log('✅ Got token, testing backend endpoint...\n');

    const response = await fetch('http://localhost:4000/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (response.status === 200) {
      console.log('\n✅ JWT verification working correctly!');
    } else {
      console.log('\n❌ JWT verification failed!');
    }
  }
}

testAuth().catch(console.error);
