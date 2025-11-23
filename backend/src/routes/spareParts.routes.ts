import { Router } from 'express';
import { authRequired } from '../middlewares/auth';
import * as SpareParts from '../controllers/spareParts.controller';
import { upload } from '../utils/multer';

const router = Router();

router.get('/', authRequired, SpareParts.listSpareParts);
router.get('/:id', authRequired, SpareParts.getSparePartById);
router.post('/', authRequired, SpareParts.createSparePart);
router.put('/:id', authRequired, SpareParts.updateSparePart);
router.post('/:id/image', authRequired, upload.single('image'), SpareParts.uploadSparePartImage);

export default router;
