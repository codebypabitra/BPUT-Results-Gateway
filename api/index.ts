import express from 'express';
import { setupBputRoutes } from '../src/server/bputService.ts';

const app = express();
app.use(express.json());

// Mount all BPUT gateway routes (CORS, health, student details, marks, batch check, etc.)
setupBputRoutes(app);

// 404 handler for unmatched API requests
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found on BPUT gateway',
    path: req.url,
    method: req.method,
  });
});

export default app;
