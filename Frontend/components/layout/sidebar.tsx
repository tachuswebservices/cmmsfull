'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, ClipboardList, Package, Boxes, BarChart3, Users, Settings, Wrench } from 'lucide-react'
import Image from 'next/image'
import { useHasAny } from '@/hooks/use-permissions'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, anyOf: ['kpi.viewTeam','kpi.viewGlobal'] },
  { name: 'Work Orders', href: '/work-orders', icon: ClipboardList, anyOf: ['workOrders.request','workOrders.viewAll','workOrders.create','workOrders.approve','workOrders.assign','workOrders.close'] },
  { name: 'Asset Management', href: '/assets', icon: Package, anyOf: ['assets.view','assets.edit'] },
  { name: 'Inventory', href: '/inventory', icon: Boxes, anyOf: ['inventory.request','inventory.manage'] },
  // Guide is visible to all authenticated users; no permissions required
  { name: 'Guide', href: '/guide', icon: Wrench },
  { name: 'Reports & Analytics', href: '/reports', icon: BarChart3, anyOf: ['downtime.analyzeTeam','downtime.analyzeCompany'] },
  { name: 'User Management', href: '/users', icon: Users, anyOf: ['users.manageTeam','users.manageAll'] },
  { name: 'Settings', href: '/settings', icon: Settings, anyOf: ['users.manageTeam','users.manageAll'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const canDashboard = useHasAny(['kpi.viewTeam','kpi.viewGlobal'])
  const canWO = useHasAny(['workOrders.request','workOrders.viewAll','workOrders.create','workOrders.approve','workOrders.assign','workOrders.close'])
  const canAssets = useHasAny(['assets.view','assets.edit'])
  const canInventory = useHasAny(['inventory.request','inventory.manage'])
  const canReports = useHasAny(['downtime.analyzeTeam','downtime.analyzeCompany'])
  const canUsers = useHasAny(['users.manageTeam','users.manageAll'])
  const canSettings = useHasAny(['users.manageTeam','users.manageAll'])

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-emerald-700/60">
        <div className="bg-white p-1 rounded-lg shadow">
          <Image src="/IMH.png" alt="Logo" width={48} height={48} className="h-12 w-12 object-contain" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg tracking-wide">Digital Factory</h1>
          {/* <p className="text-slate-300 text-[10px]">Empowering The Factories Of The Future</p> */}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          // Filter by permissions when anyOf is present
          if (item.anyOf) {
            const allowed = (
              (item.href === '/dashboard' && canDashboard) ||
              (item.href === '/work-orders' && canWO) ||
              (item.href === '/assets' && canAssets) ||
              (item.href === '/inventory' && canInventory) ||
              (item.href === '/reports' && canReports) ||
              (item.href === '/users' && canUsers) ||
              (item.href === '/settings' && canSettings)
            )
            if (!allowed) return null
          }
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-orange-600 text-white border border-orange-400 border-l-4 border-orange-700 ring-1 ring-inset ring-orange-500/40 shadow'
                  : 'text-slate-200 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-emerald-700/60">
        <p className="text-slate-300 text-xs text-center">
          © 2024 CMMS India
        </p>
      </div>
    </div>
  )
}
