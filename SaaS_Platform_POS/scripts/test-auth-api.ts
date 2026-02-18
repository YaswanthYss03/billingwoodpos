import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function testAuth() {
  console.log('🔐 Testing JWT Authentication\n');
  
  // Step 1: Login and get token
  const { data, error } = await supabase.auth.signInWithPassword({ 
    email: 'admin@gmail.com', 
    password: 'Admin@123' 
  });
  
  if (error || !data.session) {
    console.error('❌ Login failed:', error?.message);
    return;
  }
  
  const token = data.session.access_token;
  
  // Decode JWT header
  const parts = token.split('.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  
  console.log('✅ Login successful');
  console.log('🔑 JWT kid:', header.kid);
  console.log('📝 Token (first 50 chars):', token.substring(0, 50) + '...\n');
  
  // Step 2: Test authentication with backend
  console.log('🧪 Testing /api/v1/auth/me endpoint...');
  
  const response = await fetch('http://localhost:4000/api/v1/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const responseData = await response.json();
  
  if (response.ok) {
    console.log('✅ Authentication successful!');
    console.log('   User data:', JSON.stringify(responseData, null, 2));
  } else {
    console.log('❌ Authentication failed!');
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(responseData, null, 2));
  }
}

testAuth().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
