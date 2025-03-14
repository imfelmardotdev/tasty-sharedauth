import { Router, Request, Response } from 'express';
import { getTOTP } from '../api/totp';

const router = Router();

router.post('/get-totp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.body;
    const apiKey = req.headers['x-api-key'];

    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    if (!apiKey) {
      res.status(401).json({ error: 'API key is required' });
      return;
    }

    const totpCode = await getTOTP(username, apiKey as string);
    
    // Return plain text response
    res.setHeader('Content-Type', 'text/plain');
    res.send(totpCode);

  } catch (error: any) {
    console.error('API error:', error);
    
    if (error.message === 'Invalid API key') {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    if (error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (error.message === 'TOTP not configured for this user') {
      res.status(400).json({ error: 'TOTP not configured for this user' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 