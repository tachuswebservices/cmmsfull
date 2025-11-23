import { MainLayout } from '@/components/layout/main-layout'
import { SettingsContent } from '@/components/settings/settings-content'
import { RequirePermission } from '@/components/auth/require-permission'

export default function SettingsPage() {
  return (
    <MainLayout>
      <RequirePermission anyOf={['users.manageTeam', 'users.manageAll']} fallback={<div className="p-6 text-sm text-slate-600">You do not have access to Settings.</div>}>
        <SettingsContent />
      </RequirePermission>
    </MainLayout>
  )
}
