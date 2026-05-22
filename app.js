const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes/routes');

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: [
      'https://up-stop-assignment.vercel.app',
      'http://localhost:4200',
    ],
    credentials: true,
  })
);

app.use('/', routes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Route Not Found',
    path: req.originalUrl,
  });
});

module.exports = app;