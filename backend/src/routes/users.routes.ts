import { Router } from 'express';
import { authRequired } from '../middlewares/auth';
import * as Users from '../controllers/users.controller';
import { requirePermission } from '../middlewares/permissions';
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
router.post('/', authRequired, requirePermission('users.create'), Users.createUser);
router.put('/:id', authRequired, requirePermission('users.manageTeam'), Users.updateUser);
router.delete('/:id', authRequired, requirePermission('users.manageAll'), Users.deleteUser);

// Per-user permission overrides
router.get('/:id/permissions', authRequired, requirePermission('users.manageAll'), Users.getUserPermissions);
router.put('/:id/permissions', authRequired, requirePermission('users.manageAll'), Users.updateUserPermissions);

// Avatar upload
router.post(
  '/:id/avatar',
  authRequired,
  requirePermission('users.manageTeam'),
  upload.single('avatar'),
  Users.uploadAvatar
)

export default router;
