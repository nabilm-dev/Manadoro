const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname)));

const scriptPath = path.join(__dirname, 'get-media.ps1');

app.get('/api/spotify', (req, res) => {
  // Execute PowerShell script to detect Windows Media / Spotify / Browser player
  const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
  
  exec(cmd, { timeout: 4000, encoding: 'utf8' }, (err, stdout, stderr) => {
    if (err || !stdout) {
      return res.json({ isPlaying: false, status: 'error' });
    }

    try {
      const data = JSON.parse(stdout.trim());
      if (data && data.title && data.status !== 'None') {
        const isPlaying = data.status === 'Playing';
        return res.json({
          isPlaying: isPlaying,
          isPaused: data.status === 'Paused',
          title: data.title,
          artist: data.artist || 'Unknown Artist',
          album: data.album || '',
          app: data.app || 'media',
          status: data.status
        });
      }
      return res.json({ isPlaying: false });
    } catch (parseErr) {
      return res.json({ isPlaying: false });
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n🍅 ManaDoro running at http://localhost:${PORT}\n`);
});
