import { Router } from 'express';
import { authRequired } from '../middlewares/auth';
import * as Users from '../controllers/users.controller';
import { requireOneOfRoles } from '../middlewares/roles';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { paths } from '../config/env';

const router = Router();

// Ensure upload directory exists
if (!fs.existsSync(paths.uploadDir)) {
  fs.mkdirSync(paths.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, paths.uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '')
    const safeBase = (path.basename(file.originalname || 'avatar', ext) || 'avatar').replace(/[^a-zA-Z0-9_-]/g, '')
    const name = `${safeBase}-${Date.now()}${ext || '.png'}`
    cb(null, name)
  },
})
const upload = multer({ storage })

router.get('/', authRequired, Users.listUsers);
router.get('/:id', authRequired, Users.getUserById);
// Only specific roles may manage users (team/global). Adjust as needed.
router.post(
  '/',
  authRequired,
  requireOneOfRoles(['MANAGER', 'MAINTENANCE_MANAGER', 'COO', 'MD', 'MASTER']),
  Users.createUser
);
router.put(
  '/:id',
  authRequired,
  requireOneOfRoles(['MANAGER', 'MAINTENANCE_MANAGER', 'COO', 'MD', 'MASTER']),
  Users.updateUser
);
router.delete(
  '/:id',
  authRequired,
  requireOneOfRoles(['MANAGER', 'MAINTENANCE_MANAGER', 'COO', 'MD', 'MASTER']),
  Users.deleteUser
);

// Per-user permission overrides
router.get(
  '/:id/permissions',
  authRequired,
  requireOneOfRoles(['COO', 'MD', 'MASTER']),
  Users.getUserPermissions
);
router.put(
  '/:id/permissions',
  authRequired,
  requireOneOfRoles(['COO', 'MD', 'MASTER']),
  Users.updateUserPermissions
);

// Avatar upload
router.post(
  '/:id/avatar',
  authRequired,
  requireOneOfRoles(['MANAGER', 'MAINTENANCE_MANAGER', 'COO', 'MD', 'MASTER']),
  upload.single('avatar'),
  Users.uploadAvatar
)

export default router;
