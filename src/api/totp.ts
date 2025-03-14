import { createClient } from '@supabase/supabase-js';
import speakeasy from 'speakeasy';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY
);

export const getTOTP = async (username: string, apiKey: string) => {
  // Simple API key check
  if (apiKey !== import.meta.env.VITE_SUPABASE_SERVICE_KEY) {
    throw new Error('Invalid API key');
  }

  try {
    // Get user's TOTP secret from Supabase models table
    const { data: model, error } = await supabase
      .from('models')
      .select('totp_secret')
      .eq('username', username)
      .single();

    if (error || !model) {
      throw new Error('User not found');
    }

    if (!model.totp_secret) {
      throw new Error('TOTP not configured for this user');
    }

    // Generate TOTP code using speakeasy
    const totpCode = speakeasy.totp({
      secret: model.totp_secret,
      encoding: 'base32'
    });

    return totpCode;
  } catch (error) {
    console.error('TOTP generation error:', error);
    throw error;
  }
}; 