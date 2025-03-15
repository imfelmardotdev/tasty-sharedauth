import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_KEY || ''
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.body;
    const apiKey = req.headers['x-api-key'];

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    // API key validation
    if (apiKey !== process.env.VITE_SUPABASE_SERVICE_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Get user's TOTP secret from Supabase models table
    const { data: model, error } = await supabase
      .from('models')
      .select('totp_secret')
      .eq('username', username)
      .single();

    if (error || !model) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!model.totp_secret) {
      return res.status(400).json({ error: 'TOTP not configured for this user' });
    }

    // Return the TOTP secret as plain text
    res.setHeader('Content-Type', 'text/plain');
    res.send(model.totp_secret);

  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 