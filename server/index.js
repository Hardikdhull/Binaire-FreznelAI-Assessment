import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/upload', (req, res) => {
  try {
    const { files } = req.body || {};

    if (!files || typeof files !== 'object') {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const savedFiles = {};
    Object.entries(files).forEach(([fileName, value]) => {
      const safeFileName = path.basename(fileName).replace(/\.+/g, '.');
      const filePath = path.join(dataDir, safeFileName);
      const content = JSON.stringify(value, null, 2);
      fs.writeFileSync(filePath, content, 'utf8');
      savedFiles[fileName] = filePath;
    });

    const historyPath = path.join(dataDir, 'history.json');
    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath, 'utf8'))
      : [];
    history.push({ ...req.body, savedAt: new Date().toISOString() });
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    return res.json({
      message: 'JSON files uploaded and persisted to disk.',
      savedFiles,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Server error while storing files',
    });
  }
});

app.get('/api/history', (req, res) => {
  const historyPath = path.join(dataDir, 'history.json');
  if (!fs.existsSync(historyPath)) {
    return res.json([]);
  }
  return res.json(JSON.parse(fs.readFileSync(historyPath, 'utf8')));
});

app.listen(port, () => {
  console.log(`JSON upload server listening on http://localhost:${port}`);
});
