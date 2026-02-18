import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

(async () => {
  const { data } = await supabase.auth.signInWithPassword({ 
    email: 'admin@gmail.com', 
    password: 'Admin@123' 
  });
  console.log(data.session?.access_token);
})();
