import { MainLayout } from '@/components/layout/main-layout'
import { AssetsContent } from '@/components/assets/assets-content'
import { RequirePermission } from '@/components/auth/require-permission'

export default function AssetsPage() {
  return (
    <MainLayout>
      <RequirePermission anyOf={['assets.view', 'assets.edit', 'assets.create']} fallback={<div className="p-6 text-sm text-slate-600">You do not have access to Assets.</div>}>
        <AssetsContent />
      </RequirePermission>
    </MainLayout>
  )
}
