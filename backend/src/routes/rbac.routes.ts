import { Router } from 'express'
import { RbacController } from '../controllers/rbac.controller'
import { authRequired } from '../middlewares/auth'
import { requireOneOfRoles } from '../middlewares/roles'

const router = Router()

// Permissions
router.get('/permissions', authRequired, RbacController.getPermissions)

// Roles
router.get('/roles', authRequired, RbacController.getRoles)
router.post('/roles', authRequired, requireOneOfRoles(['COO', 'MD', 'MASTER']), RbacController.createRole)
router.delete('/roles/:id', authRequired, requireOneOfRoles(['COO', 'MD', 'MASTER']), RbacController.deleteRole)
router.put('/roles/:id/permissions', authRequired, requireOneOfRoles(['COO', 'MD', 'MASTER']), RbacController.updateRolePermissions)

export default router
