import express from 'express';
import totpRouter from './routes/totp';

const app = express();

app.use(express.json());
app.use('/api', totpRouter);

export default app; 