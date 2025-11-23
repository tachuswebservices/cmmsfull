import { Router } from 'express';
import * as Assets from '../controllers/assets.controller';
import { authRequired } from '../middlewares/auth';
import { upload } from '../utils/multer';

const router = Router();

router.get('/', authRequired, Assets.listAssets);
router.post('/', authRequired, Assets.createAsset);
router.get('/:id', authRequired, Assets.getAssetById);
router.put('/:id', authRequired, Assets.updateAsset);
router.patch('/:id/status', authRequired, Assets.updateAssetStatus);
router.get('/:id/history', authRequired, Assets.getAssetHistory);
router.get('/:id/maintenance-logs', authRequired, Assets.getMaintenanceLogs);
router.get('/:id/spare-parts', authRequired, Assets.getSpareParts);
router.get('/:id/manual', authRequired, Assets.getAssetManual);
router.get('/:id/attachments', authRequired, Assets.listAssetAttachments);
router.post(
  '/:id/attachments',
  authRequired,
  upload.fields([
    { name: 'photos', maxCount: 10 },
    { name: 'documents', maxCount: 10 },
  ]),
  Assets.createAssetAttachments
);
router.delete('/:id/attachments/:filename', authRequired, Assets.deleteAssetAttachment);

export default router;

