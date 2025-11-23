import { MainLayout } from '@/components/layout/main-layout'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { RequirePermission } from '@/components/auth/require-permission'

export default function DashboardPage() {
  return (
    <MainLayout>
      <RequirePermission anyOf={['dashboard.access', 'kpi.viewTeam', 'kpi.viewGlobal']} fallback={<div className="p-6 text-sm text-slate-600">You do not have access to the KPI Dashboard.</div>}>
        <DashboardContent />
      </RequirePermission>
    </MainLayout>
  )
}
