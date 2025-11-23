import { Router } from 'express'
import { RbacController } from '../controllers/rbac.controller'

const router = Router()

// Permissions
router.get('/permissions', RbacController.getPermissions)

// Roles
router.get('/roles', RbacController.getRoles)
router.post('/roles', RbacController.createRole)
router.delete('/roles/:id', RbacController.deleteRole)
router.put('/roles/:id/permissions', RbacController.updateRolePermissions)

export default router
