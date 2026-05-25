const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || 'arqdata2026';
const DATA_FILE = path.join(__dirname, 'votes.json');

const PARTICIPANTS = [
  'Leonardo Carvallo',
  'Sebastian Vargas',
  'Franco Bertinatti',
  'Sebastian Wilwerth',
  'David Wajsberg'
];

const DEFAULT_DATA = {
  votes: {},
  weights: { ia: 3, cc: 3, da: 2, rm: 2, pm: 2, idp: 4, ex: 3, cx: 2 }
};

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Config (participants list for frontend)
app.get('/api/config', (req, res) => {
  res.json({ participants: PARTICIPANTS });
});

// Status: who has voted
app.get('/api/status', (req, res) => {
  const data = readData();
  res.json({
    voters_done: Object.keys(data.votes),
    total: PARTICIPANTS.length
  });
});

// Get my votes
app.get('/api/votes/:voter', (req, res) => {
  const data = readData();
  const voter = decodeURIComponent(req.params.voter);
  res.json({ votes: data.votes[voter] || {} });
});

// Submit votes
app.post('/api/votes', (req, res) => {
  const { voter, votes } = req.body;
  if (!voter || typeof votes !== 'object') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  const data = readData();
  data.votes[voter] = votes;
  writeData(data);
  res.json({ ok: true, saved_at: new Date().toISOString() });
});

// Admin: verify PIN
app.post('/api/admin/verify', (req, res) => {
  const { pin } = req.body;
  res.json({ ok: pin === ADMIN_PIN });
});

// Admin: get full results
app.get('/api/admin/results', (req, res) => {
  const { pin } = req.query;
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Acceso denegado' });
  res.json(readData());
});

// Admin: update weights
app.post('/api/admin/weights', (req, res) => {
  const { pin, weights } = req.body;
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Acceso denegado' });
  const data = readData();
  data.weights = { ...data.weights, ...weights };
  writeData(data);
  res.json({ ok: true });
});

// Admin: reset all votes
app.post('/api/admin/reset', (req, res) => {
  const { pin } = req.body;
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Acceso denegado' });
  const data = readData();
  data.votes = {};
  writeData(data);
  res.json({ ok: true });
});

// Fallback to SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ArqData Voting running on http://localhost:${PORT}`);
  console.log(`Admin PIN: ${ADMIN_PIN}`);
});
