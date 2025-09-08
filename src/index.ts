// index.ts
import express from 'express';
import uploadRouter from './routes/upload';
import schemaRouter from './routes/schema';

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// added health check for the server
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// root routers
app.use('/', uploadRouter);
app.use('/', schemaRouter);

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`schema-api running on http://localhost:${PORT}`);
  });
}

export default app;