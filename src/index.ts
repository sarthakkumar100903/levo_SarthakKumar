// index.ts
import express from 'express';
import uploadRouter from './routes/upload';
import schemaRouter from './routes/schema';

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// mount routers at root
app.use('/', uploadRouter);
app.use('/', schemaRouter);

// export app for tests
export default app;

// start server only if run directly
if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 schema-api running on http://localhost:${PORT}`);
  });
}
