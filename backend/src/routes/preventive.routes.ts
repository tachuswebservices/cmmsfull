import { Router } from 'express';
import { authRequired } from '../middlewares/auth';
import * as Preventive from '../controllers/preventive.controller';

const router = Router();

router.post('/', authRequired, Preventive.createPreventiveTask);
router.get('/', authRequired, Preventive.listPreventiveTasks);
router.get('/my', authRequired, Preventive.listMyPreventiveTasks);
router.patch('/:id', authRequired, Preventive.updatePreventiveTask);
router.post('/:id/complete', authRequired, Preventive.completePreventiveTask);
router.delete('/:id', authRequired, Preventive.deletePreventiveTask);

export default router;
