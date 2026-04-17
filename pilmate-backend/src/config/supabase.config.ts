import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

export const createSupabaseClient = (config: ConfigService) => {
  return createClient(
    config.get<string>('SUPABASE_URL') || '',
    config.get<string>('SUPABASE_SERVICE_ROLE_KEY') || ''
  );
};
