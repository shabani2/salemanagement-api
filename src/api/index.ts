// api/index.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app/expressApp';

export default (req: VercelRequest, res: VercelResponse) => {
  // @ts-ignore - Vercel ne fournit pas req.originalUrl
  req.originalUrl = req.url;
  app(req, res); // Appelle ton app Express comme un handler
};
