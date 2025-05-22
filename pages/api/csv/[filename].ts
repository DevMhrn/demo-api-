import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { filename } = req.query;
  
  if (typeof filename !== 'string') {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Updated to look in public directory instead of db
  const filePath = path.join(process.cwd(), 'public', filename);
  
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const fileContents = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(fileContents);
  } catch (error) {
    res.status(500).json({ error: 'Error reading file' });
  }
}
