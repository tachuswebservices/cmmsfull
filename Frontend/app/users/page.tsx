// Users page
import { MainLayout } from '@/components/layout/main-layout'
import { UsersContent } from '@/components/users/users-content'
import { RequirePermission } from '@/components/auth/require-permission'

export default function UsersPage() {
  return (
    <MainLayout>
      <RequirePermission anyOf={['users.access', 'users.edit', 'users.create', 'users.manageTeam', 'users.manageAll']} fallback={<div className="p-6 text-sm text-slate-600">You do not have access to manage users.</div>}>
        <UsersContent />
      </RequirePermission>
    </MainLayout>
  )
}
