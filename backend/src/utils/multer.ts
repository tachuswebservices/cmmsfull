import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { paths } from '../config/env';

function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDirExists(paths.uploadDir);

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, paths.uploadDir);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${base}-${unique}${ext}`);
  }
});

export const upload = multer({ storage });

