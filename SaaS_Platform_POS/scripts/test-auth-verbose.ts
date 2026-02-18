import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import * as path from 'path';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const apiUrl = 'http://localhost:4000/api/v1';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBackendAuth() {
  console.log('🔐 Testing full authentication flow...\n');

  // Step 1: Login to Supabase
  console.log('Step 1: Logging into Supabase...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'Admin@123',
  });

  if (error) {
    console.error('❌ Supabase login failed:', error.message);
    return;
  }

  console.log('✅ Supabase login successful');
  console.log('   User ID:', data.user?.id);
  console.log('   Token (first 50 chars):', data.session?.access_token?.substring(0, 50) + '...\n');

  // Step 2: Call backend /auth/me with the token
  console.log('Step 2: Calling backend /auth/me...');
  
  try {
    const { stdout, stderr } = await execAsync(
      `curl -v -H "Authorization: Bearer ${data.session?.access_token}" ${apiUrl}/auth/me 2>&1`
    );

    console.log('📝 Full Response:');
    console.log(stdout);
    
    if (stderr) {
      console.error('stderr:', stderr);
    }
  } catch (error: any) {
    console.error('❌ Backend authentication failed!');
    console.error('   Error:', error.message);
  }
}

testBackendAuth().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
