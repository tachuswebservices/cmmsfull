import { Router } from 'express';
import * as Notifications from '../controllers/notifications.controller';
import { authRequired } from '../middlewares/auth';

const router = Router();

router.get('/', authRequired, Notifications.listNotifications);
router.post('/:id/read', authRequired, Notifications.markRead);
router.post('/read-all', authRequired, Notifications.markAllRead);
router.post('/register-token', authRequired, Notifications.registerPushToken);
router.post('/unregister-token', authRequired, Notifications.unregisterPushToken);
router.post('/send-test', authRequired, Notifications.sendTestPush);

export default router;

