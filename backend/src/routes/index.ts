import { Router } from 'express';
import authRoutes from './auth.routes';
import workOrderRoutes from './workOrders.routes';
import assetRoutes from './assets.routes';
import breakdownRoutes from './breakdown.routes';
import notificationRoutes from './notifications.routes';
import inventoryRoutes from './inventory.routes';
import usersRoutes from './users.routes';
import documentsRoutes from './documents.routes';
import preventiveRoutes from './preventive.routes';
import rbacRoutes from './rbac.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/assets', assetRoutes);
router.use('/breakdown-reports', breakdownRoutes);
router.use('/notifications', notificationRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/users', usersRoutes);
router.use('/documents', documentsRoutes);
router.use('/preventive-tasks', preventiveRoutes);
router.use('/rbac', rbacRoutes);

export default router;

