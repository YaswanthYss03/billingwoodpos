import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('🔐 Testing Supabase login for admin@gmail.com\n');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'Admin@123',
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    return;
  }

  if (data.user) {
    console.log('✅ Login successful!');
    console.log('   Supabase User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Created at:', data.user.created_at);
    console.log('\n📝 Full Access Token:\n', data.session?.access_token);
    
    // Decode JWT header to see the kid
    if (data.session?.access_token) {
      const parts = data.session.access_token.split('.');
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      console.log('\n🔑 JWT Header:', JSON.stringify(header, null, 2));
    }
    
    console.log('\n⚠️  Database expects Supabase User ID: f4c8ccbf-cb53-4c98-810a-8fb00a710db3');
    console.log('   Actual Supabase User ID:', data.user.id);
    
    if (data.user.id !== 'f4c8ccbf-cb53-4c98-810a-8fb00a710db3') {
      console.log('\n❌ MISMATCH! The Supabase user ID does not match the database!');
      console.log('   This is why you\'re getting unauthorized.');
    } else {
      console.log('\n✅ User IDs match!');
    }
  } else {
    console.log('❌ No user data returned');
  }
}

testLogin().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
