import { Router } from 'express';
import { authRequired } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import * as MissedPmController from '../controllers/missed-pm.controller';

const router = Router();

router.get(
  '/',
  authRequired,
  requirePermission('kpi.viewGlobal'),
  MissedPmController.listMissedPreventiveTasks
);

router.patch(
  '/:id/resolve',
  authRequired,
  requirePermission('kpi.viewGlobal'),
  MissedPmController.markMissedAsResolved
);

export default router;
