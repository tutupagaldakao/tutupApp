const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (_req, res) => res.send('tutupapp-backend OK'));
app.listen(PORT, () => console.log('Listening on', PORT));
