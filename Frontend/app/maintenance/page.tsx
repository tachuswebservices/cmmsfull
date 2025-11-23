import { MainLayout } from '@/components/layout/main-layout'
import { PreventiveMaintenanceContent } from '@/components/maintenance/preventive-maintenance-content'
import { RequirePermission } from '@/components/auth/require-permission'

export default function MaintenancePage() {
  return (
    <MainLayout>
      <RequirePermission anyOf={['pm.view', 'pm.manage']} fallback={<div className="p-6 text-sm text-slate-600">You do not have access to Preventive Maintenance.</div>}>
        <PreventiveMaintenanceContent />
      </RequirePermission>
    </MainLayout>
  )
}
