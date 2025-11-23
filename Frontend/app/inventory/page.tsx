import { MainLayout } from '@/components/layout/main-layout'
import { InventoryContent } from '@/components/inventory/inventory-content'
import { RequirePermission } from '@/components/auth/require-permission'

export default function InventoryPage() {
  return (
    <MainLayout>
      <RequirePermission anyOf={['inventory.request', 'inventory.manage']} fallback={<div className="p-6 text-sm text-slate-600">You do not have access to Inventory.</div>}>
        <InventoryContent />
      </RequirePermission>
    </MainLayout>
  )
}
