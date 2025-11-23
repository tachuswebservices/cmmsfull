import { Router } from 'express';
import * as WorkOrders from '../controllers/workOrders.controller';
import { authRequired } from '../middlewares/auth';
import { upload } from '../utils/multer';

const router = Router();

router.get('/', authRequired, WorkOrders.listWorkOrders);
router.get('/:id', authRequired, WorkOrders.getWorkOrderById);
router.post('/', authRequired, WorkOrders.createWorkOrder);
router.put('/:id', authRequired, WorkOrders.updateWorkOrder);
router.post('/:id/start', authRequired, WorkOrders.startWorkOrder);
router.post('/:id/pause', authRequired, WorkOrders.pauseWorkOrder);
router.post('/:id/complete', authRequired, WorkOrders.completeWorkOrder);
router.post('/:id/issues', authRequired, upload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'audio', maxCount: 5 },
  { name: 'videos', maxCount: 5 }
]), WorkOrders.createIssue);

export default router;

