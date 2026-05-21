'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Role } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { RoleBadge, ActiveBadge } from '@/components/status-badge'
import { TableEmpty } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { confirmAction } from '@/components/confirm'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Row = { id: string; name: string; email: string; role: Role; active: boolean; createdAt: string }

export function UsersClient({ initial }: { initial: Row[] }) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)

  async function onDelete(u: Row) {
    if (!confirmAction(`Delete user ${u.email}?`)) return
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('User deleted')
      router.refresh()
    } else {
      const j = await res.json().catch(() => ({}))
      toast.error('Delete failed', j.error)
    }
  }

  async function toggleActive(u: Row) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    })
    if (res.ok) {
      toast.success(u.active ? 'User disabled' : 'User enabled')
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add user
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.length === 0 && <TableEmpty colSpan={6} title="No users" />}
            {initial.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <RoleBadge role={u.role} />
                </TableCell>
                <TableCell>
                  <ActiveBadge active={u.active} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(u)
                      setOpen(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                    {u.active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => onDelete(u)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <UserForm
        key={editing?.id ?? 'new'}
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setEditing(null)
        }}
        editing={editing}
        onSaved={() => {
          setOpen(false)
          setEditing(null)
          router.refresh()
          toast.success(editing ? 'User updated' : 'User added')
        }}
      />
    </>
  )
}

function UserForm({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Row | null
  onSaved: () => void
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [email, setEmail] = useState(editing?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(editing?.role ?? 'STAFF')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload: any = { name, email, role }
    if (password) payload.password = password
    if (!editing && !password) {
      setErr('Password required for new user')
      setSaving(false)
      return
    }
    const res = editing
      ? await fetch(`/api/users/${editing.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/users`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error || 'Save failed')
      return
    }
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit user' : 'Add user'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{editing ? 'New password (leave blank to keep)' : 'Password'}</Label>
            <Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="ADMIN">Admin : full access</option>
              <option value="MANAGER">Manager : inventory, deletes, rates</option>
              <option value="STAFF">Staff : daily transactions</option>
            </Select>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
