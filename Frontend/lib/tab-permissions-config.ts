export type TabPermConfig = {
  access?: string[]
  accessAllowKey?: string
  add?: string[]
  edit?: string[]
}

export const TAB_PERMISSIONS: Record<string, TabPermConfig> = {
  Dashboard:     { access: ['kpi.viewTeam', 'kpi.viewGlobal'], accessAllowKey: 'kpi.viewTeam' },
  'Work Orders': { access: ['workOrders.request', 'workOrders.viewAll'], accessAllowKey: 'workOrders.viewAll', add: ['workOrders.create'], edit: ['workOrders.approve', 'workOrders.assign', 'workOrders.close'] },
  Assets:        { access: ['assets.view'], add: ['assets.create'], edit: ['assets.edit'] },
  Inventory:     { access: ['inventory.request'], add: ['inventory.create'], edit: ['inventory.manage'] },
  'Missed PM':   { access: ['kpi.viewGlobal'] },
  Guide:         { access: ['guide.view'], add: ['guide.create'] },
  Reports:       { access: ['downtime.analyzeTeam', 'downtime.analyzeCompany'] },
  Users:         { access: ['users.manageTeam'], add: ['users.create'], edit: ['users.manageAll'] },
  Settings:      { access: ['users.manageTeam'], add: ['users.create'], edit: ['users.manageAll'] },
}
