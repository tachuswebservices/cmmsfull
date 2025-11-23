'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Search, Users, Mail, Phone, Shield } from 'lucide-react'
import { UserService } from '@/lib/services/user-service'
import { AddUserForm } from './add-user-form'
import { UserDetails } from './user-details'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { roleLabel } from '@/lib/rbac'
import { useHasAny, useCan } from '@/hooks/use-permissions'

export function UsersContent() {
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  // Access to users tab can be governed by manage permissions, but creation must respect 'users.create'
  const canManageUsers = useHasAny(['users.manageTeam', 'users.manageAll'])
  const canCreateUser = useCan('users.create')

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true)
      const data = await UserService.getUsers()
      setUsers(data)
      setIsLoading(false)
    }

    loadUsers()
  }, [])

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const key = (role || '').toUpperCase()
    const variants: Record<string, any> = {
      'MD': 'default',
      'COO': 'default',
      'MAINTENANCE_MANAGER': 'secondary',
      'PRODUCTION_MANAGER': 'secondary',
      'MANAGER': 'secondary',
      'OPERATOR': 'outline',
    }
    return variants[key] || 'outline'
  }

  const getStatusBadge = (status: string) => {
    return status === 'active' ? 'default' : 'secondary'
  }

  const inactiveUsers = users.filter(user => user.status === 'inactive')

  const handleUserAdded = (newUser: any) => {
    setUsers([...users, newUser]);
    setIsAddingUser(false);
  }

  const handleUserUpdated = (updatedUser: any) => {
    setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user));
    setSelectedUser(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold ">User Management</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage system users and their permissions
          </p>
        </div>
        {canCreateUser && (
          <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
            <DialogTrigger asChild>
              <Button className="btn-hover">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <AddUserForm onUserAdded={handleUserAdded} onCancel={() => setIsAddingUser(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">{users.length}</div>
            <p className="text-xs text-slate-600 mt-1">Registered users</p>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">
              Inactive Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-600">{inactiveUsers.length}</div>
            <p className="text-xs text-slate-600 mt-1">Deactivated accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Dialog key={user.id} onOpenChange={(open) => !open && setSelectedUser(null)}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer transition hover:shadow-lg hover:-translate-y-0.5 border border-slate-200/80" onClick={() => setSelectedUser(user)}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full ring-2 ring-white border-2 border-slate-300 overflow-hidden">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback>
                            {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="mb-1.5">
                        <h3 className="font-semibold text-slate-900 truncate text-base leading-tight">
                          {user.name}
                        </h3>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          <Badge variant={getRoleBadge(user.role)} className="text-[10px] py-0.5">
                            {roleLabel(user.role)}
                          </Badge>
                          <Badge variant={getStatusBadge(user.status)} className="text-[10px] py-0.5 capitalize">
                            {user.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-1">{user.designation || '—'}</p>
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-1.5 text-sm">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{user.phone || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <Shield className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{user.department || '—'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-200/80">
                        <span className="text-xs text-slate-500">
                          Joined {new Date(user.joinedDate).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            {selectedUser && selectedUser.id === user.id && (
              <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>User Details</DialogTitle>
                </DialogHeader>
                <UserDetails user={selectedUser} onBack={() => setSelectedUser(null)} onUserUpdated={handleUserUpdated} />
              </DialogContent>
            )}
          </Dialog>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-slate-900 mb-2">
              No users found
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms to see more results.'
                : 'Get started by adding your first user.'}
            </p>
            {canCreateUser && (
              <Button className="btn-hover">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
