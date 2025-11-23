import { MainLayout } from '@/components/layout/main-layout'
import { WorkOrdersContent } from '@/components/work-orders/work-orders-content'
import { RequirePermission } from '@/components/auth/require-permission'

export default function WorkOrdersPage() {
  return (
    <MainLayout>
      <RequirePermission anyOf={['workOrders.request','workOrders.viewAll','workOrders.create','workOrders.approve','workOrders.assign','workOrders.close']} fallback={<div className="p-6 text-sm text-slate-600">You do not have access to Work Orders.</div>}>
        <WorkOrdersContent />
      </RequirePermission>
    </MainLayout>
  )
}
