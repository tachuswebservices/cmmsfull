import { Router } from 'express'
import { authRequired } from '../middlewares/auth'
import { docUpload, assignDocId } from '../utils/docMulter'
import * as Docs from '../controllers/documents.controller'

const router = Router()

router.get('/', authRequired, Docs.listDocuments)
router.get('/:id', authRequired, Docs.getDocument)
router.post('/', authRequired, assignDocId(), docUpload.array('files'), Docs.createDocument)
router.patch('/:id', authRequired, Docs.updateDocument)
router.delete('/:id', authRequired, Docs.deleteDocument)

export default router
