const express = require('express');
const app = express();

app.get('/', (_req, res) => res.send('tutupapp-backend: OK'));
app.get('/healthz', (_req, res) => res.send('ok'));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log('listening on', port));
