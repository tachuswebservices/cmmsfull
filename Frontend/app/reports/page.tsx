import { MainLayout } from '@/components/layout/main-layout'
import { ReportsContent } from '@/components/reports/reports-content'
import { RequirePermission } from '@/components/auth/require-permission'

export default function ReportsPage() {
  return (
    <MainLayout>
      <RequirePermission anyOf={['downtime.analyzeTeam', 'downtime.analyzeCompany']} fallback={<div className="p-6 text-sm text-slate-600">You do not have access to Reports.</div>}>
        <ReportsContent />
      </RequirePermission>
    </MainLayout>
  )
}
