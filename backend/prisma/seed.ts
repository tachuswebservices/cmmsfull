import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function base64url(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function hashSecret(secret: string) {
  const salt = base64url(crypto.randomBytes(16))
  const iterations = 100_000
  const hash = crypto.pbkdf2Sync(secret, salt, iterations, 32, 'sha256').toString('hex')
  return `pbkdf2$${iterations}$${salt}$${hash}`
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@company.in'
  const password = process.env.SEED_ADMIN_PASSWORD || '123456'
  const name = process.env.SEED_ADMIN_NAME || 'Administrator'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User already exists: ${email}`)
    return
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashSecret(password),
      name,
      role: 'ADMIN',
      status: 'ACTIVE',
      designation: 'System Admin',
      department: 'IT',
    },
  })
  console.log(`Seeded admin user: ${user.email} (id=${user.id})`)

  // Seed RBAC permissions and default roles
  const PERMISSIONS = [
    'workOrders.request','workOrders.updateStatus','workOrders.addNotes','workOrders.viewAll','workOrders.create','workOrders.approve','workOrders.assign','workOrders.close',
    'assets.view','assets.edit','assets.create',
    'pm.view','pm.manage',
    'breakdown.report','breakdown.view',
    'inventory.request','inventory.manage','inventory.create',
    'downtime.log','downtime.analyzeTeam','downtime.analyzeCompany',
    'kpi.viewTeam','kpi.viewGlobal',
    'budget.view','budget.approve','budget.inputMaintenanceCosts',
    'users.manageTeam','users.manageAll','users.create',
    'audit.view','audit.maintain',
    // New: control access to Guide tab
    'guide.view'
  ]

  // Upsert permissions
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    })
  }

  // Default roles and their permissions
  const defaultRoles: Record<string, string[]> = {
    OPERATOR: ['workOrders.request','workOrders.updateStatus','workOrders.addNotes','assets.view','pm.view','breakdown.report','inventory.request','downtime.log','guide.view'],
    MANAGER: ['workOrders.approve','workOrders.assign','workOrders.viewAll','assets.edit','assets.create','pm.manage','breakdown.view','inventory.manage','inventory.create','downtime.analyzeTeam','kpi.viewTeam','budget.view','users.manageTeam','audit.view','guide.view'],
    PRODUCTION_MANAGER: ['workOrders.request','workOrders.viewAll','assets.view','pm.view','breakdown.view','inventory.request','downtime.analyzeTeam','kpi.viewTeam','budget.view','audit.view','guide.view'],
    MAINTENANCE_MANAGER: ['workOrders.create','workOrders.approve','workOrders.assign','workOrders.close','workOrders.viewAll','assets.edit','assets.create','pm.manage','breakdown.view','inventory.manage','inventory.create','downtime.analyzeTeam','kpi.viewTeam','budget.inputMaintenanceCosts','users.manageTeam','audit.maintain','audit.view','guide.view'],
    COO: ['workOrders.viewAll','assets.view','pm.view','breakdown.view','inventory.request','downtime.analyzeCompany','kpi.viewGlobal','budget.approve','users.manageTeam','audit.view','guide.view'],
    MD: ['workOrders.viewAll','assets.view','pm.view','breakdown.view','inventory.request','downtime.analyzeCompany','kpi.viewGlobal','budget.approve','users.manageAll','users.create','audit.view','guide.view'],
  }

  for (const [name, keys] of Object.entries(defaultRoles)) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    // Fetch permission ids
    const perms = await prisma.permission.findMany({ where: { key: { in: keys } } })
    const existing = await prisma.rolePermission.findMany({ where: { roleId: role.id } })
    const existingIds = new Set(existing.map((m) => m.permissionId))
    const toAdd = perms.filter((p) => !existingIds.has(p.id)).map((p) => ({ roleId: role.id, permissionId: p.id }))
    if (toAdd.length) await prisma.rolePermission.createMany({ data: toAdd })
  }

  // Seed MASTER role with ALL permissions
  const MASTER = 'MASTER'
  const masterRole = await prisma.role.upsert({ where: { name: MASTER }, update: {}, create: { name: MASTER } })
  const allPerms = await prisma.permission.findMany()
  const existingMasterMappings = await prisma.rolePermission.findMany({ where: { roleId: masterRole.id } })
  const masterExisting = new Set(existingMasterMappings.map((m) => m.permissionId))
  const masterToAdd = allPerms.filter((p) => !masterExisting.has(p.id)).map((p) => ({ roleId: masterRole.id, permissionId: p.id }))
  if (masterToAdd.length) await prisma.rolePermission.createMany({ data: masterToAdd })

  // Seed a master user with full access (role MASTER)
  const mEmail = process.env.SEED_MASTER_EMAIL || 'master@company.in'
  const mPassword = process.env.SEED_MASTER_PASSWORD || 'master123!'
  const mName = process.env.SEED_MASTER_NAME || 'Master User'
  const existingMasterUser = await prisma.user.findUnique({ where: { email: mEmail } })
  if (!existingMasterUser) {
    const mu = await prisma.user.create({
      data: {
        email: mEmail,
        passwordHash: hashSecret(mPassword),
        name: mName,
        role: MASTER,
        status: 'ACTIVE',
        designation: 'Super Admin',
        department: 'IT',
      },
    })
    console.log(`Seeded MASTER user: ${mu.email} (id=${mu.id})`)
  } else {
    console.log(`MASTER user already exists: ${mEmail}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
