import express from 'express';
import cors from 'cors';
import router from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { httpLogger } from './utils/logger';
import { env, paths } from './config/env';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

// Serve uploaded files statically
app.use('/uploads', express.static(paths.uploadDir));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, time: new Date().toISOString() });
});

app.use('/', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

