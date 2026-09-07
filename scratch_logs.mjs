
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data } = await sb
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: true });

  const relevant = data.filter(d => 
    (d.details && d.details.includes('2026-09-05')) ||
    (d.metadata && JSON.stringify(d.metadata).includes('2026-09-05'))
  );

  console.log('Relevant logs count:', relevant.length);
  relevant.forEach(d => {
    console.log(`[${d.created_at}] [${d.staff_name || 'System'}] [${d.action_type}] ${d.details}`);
  });
}

main();
