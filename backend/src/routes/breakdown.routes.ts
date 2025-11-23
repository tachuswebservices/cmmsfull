import { Router } from 'express';
import * as Breakdown from '../controllers/breakdown.controller';
import { authRequired } from '../middlewares/auth';
import { upload } from '../utils/multer';

const router = Router();

router.post('/', authRequired, upload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'audio', maxCount: 5 },
  { name: 'videos', maxCount: 5 }
]), Breakdown.submitBreakdownReport);

router.post('/transcribe', authRequired, upload.single('audio'), Breakdown.transcribeAudio);

export default router;

