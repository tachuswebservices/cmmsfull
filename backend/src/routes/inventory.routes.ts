import { Router } from 'express'
import { authRequired } from '../middlewares/auth'
import * as Inventory from '../controllers/inventory.controller'
import { upload } from '../utils/multer'

const router = Router()

router.get('/', authRequired, Inventory.listInventory)
router.get('/:id', authRequired, Inventory.getInventoryById)
router.post('/', authRequired, Inventory.createInventory)
router.put('/:id', authRequired, Inventory.updateInventory)
router.post('/:id/image', authRequired, upload.single('image'), Inventory.uploadInventoryImage)
router.delete('/:id', authRequired, Inventory.deleteInventory)

export default router
