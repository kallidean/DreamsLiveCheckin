import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Save, UserPlus, UserX, UserCheck, Search } from 'lucide-react';
import api from '../../lib/axios';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

// Desktop: 10 proportional fr columns — fully fluid, resizes with the browser window
// Order: Name | Email | Phone | Role | Region | Supervisor | Category | Verified | Save | Status
const GRID = 'md:grid-cols-[1.5fr_2fr_1fr_0.8fr_0.7fr_1.5fr_1fr_0.8fr_0.6fr_0.8fr]';

function AddUserModal({ onClose, supervisors, defaultSupervisorId, regions }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    role: 'rep', region: '', category: '', supervisor_id: defaultSupervisorId || '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/api/users', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('User created successfully', 'success');
      onClose();
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create user');
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.role === 'rep' && !form.supervisor_id) {
      setError('A supervisor is required for reps.');
      return;
    }
    mutation.mutate({ ...form, supervisor_id: form.supervisor_id || null });
  }

  return (
    <Modal isOpen onClose={onClose} title="Add User">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rep">rep</option>
              <option value="supervisor">supervisor</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Region (State)</label>
            <select
              value={form.region}
              onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select State —</option>
              {regions.map(r => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <input
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="e.g. Retail"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Supervisor {form.role === 'rep' ? '*' : '(optional)'}
            </label>
            <select
              value={form.supervisor_id}
              onChange={e => setForm(p => ({ ...p, supervisor_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function UserRow({ user, supervisors, regions, hasDirectReports }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [edits, setEdits] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role,
    phone: user.phone || '',
    region: user.region || '',
    category: user.category || '',
    verified: user.verified,
    active: user.active !== false,
    supervisor_id: user.supervisor_id || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch(`/api/users/${user.id}`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      addToast(`${user.name} updated successfully`, 'success');
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Failed to update user', 'error');
    },
  });

  function handleToggleActive() {
    const action = edits.active ? 'disable' : 'enable';
    if (window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) {
      setEdits(p => ({ ...p, active: !p.active }));
    }
  }

  function handleSave() {
    updateMutation.mutate({ ...edits, supervisor_id: edits.supervisor_id || null });
  }

  return (
    <div className={`border-b border-gray-100 px-3 py-3 last:border-b-0 ${!edits.active ? 'opacity-50' : 'hover:bg-gray-50'}`}>
      {/*
        Mobile : grid-cols-3  — 9 visible items → 3×3
          Row 1: Name (+ verified icon)  | Email      | Phone
          Row 2: Role                    | Region     | Supervisor
          Row 3: Category                | Save       | Status
        Desktop: 10-column fr grid (Verified shown as its own column, hidden on mobile)
      */}
      <div className={`grid grid-cols-3 gap-2 ${GRID} md:items-center`}>

        {/* 1 — Name  +  verified toggle (icon only on mobile) */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Name</span>
          <div className="flex items-center gap-1">
            <input
              value={edits.name}
              onChange={e => setEdits(p => ({ ...p, name: e.target.value }))}
              className={`${inputCls} flex-1 min-w-0`}
              placeholder="Name"
            />
            <button
              type="button"
              onClick={() => setEdits(p => ({ ...p, verified: !p.verified }))}
              title={edits.verified ? 'Verified — click to unverify' : 'Not verified — click to verify'}
              className={`md:hidden shrink-0 transition-colors ${
                edits.verified ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'
              }`}
            >
              <CheckCircle size={15} />
            </button>
          </div>
        </div>

        {/* 2 — Email */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Email</span>
          <input
            type="email"
            value={edits.email}
            onChange={e => setEdits(p => ({ ...p, email: e.target.value }))}
            className={inputCls}
          />
        </div>

        {/* 3 — Phone */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Phone</span>
          <input
            value={edits.phone}
            onChange={e => setEdits(p => ({ ...p, phone: e.target.value }))}
            className={inputCls}
            placeholder="Phone"
          />
        </div>

        {/* 4 — Role */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Role</span>
          <select
            value={edits.role}
            onChange={e => setEdits(p => ({ ...p, role: e.target.value }))}
            disabled={user.role === 'supervisor' && hasDirectReports}
            title={user.role === 'supervisor' && hasDirectReports
              ? 'Reassign all direct reports before changing this role'
              : undefined}
            className={`${inputCls} disabled:bg-gray-100 disabled:cursor-not-allowed`}
          >
            <option value="rep">rep</option>
            <option value="supervisor">supervisor</option>
            <option value="admin">admin</option>
          </select>
        </div>

        {/* 5 — Region */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Region</span>
          <select
            value={edits.region}
            onChange={e => setEdits(p => ({ ...p, region: e.target.value }))}
            className={inputCls}
          >
            <option value="">—</option>
            {regions.map(r => (
              <option key={r.code} value={r.code}>{r.code}</option>
            ))}
          </select>
        </div>

        {/* 6 — Supervisor */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Supervisor</span>
          <select
            value={edits.supervisor_id}
            onChange={e => setEdits(p => ({ ...p, supervisor_id: e.target.value }))}
            className={inputCls}
          >
            <option value="">— None —</option>
            {supervisors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 7 — Category  (mobile: row 3 col 1 — replaces Verified) */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Category</span>
          <input
            value={edits.category}
            onChange={e => setEdits(p => ({ ...p, category: e.target.value }))}
            className={inputCls}
            placeholder="Category"
          />
        </div>

        {/* 8 — Verified  (desktop only — hidden on mobile so the grid stays 3×3) */}
        <div className="hidden md:flex flex-col justify-center min-w-0">
          <button
            type="button"
            onClick={() => setEdits(p => ({ ...p, verified: !p.verified }))}
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              edits.verified ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {edits.verified ? <><CheckCircle size={14} /> Verified</> : <><XCircle size={14} /> No</>}
          </button>
        </div>

        {/* 9 — Save */}
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Save</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            <Save size={14} />
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* 10 — Status */}
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Status</span>
          <button
            type="button"
            onClick={handleToggleActive}
            className={`flex items-center gap-1 text-sm font-medium ${
              edits.active ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'
            }`}
          >
            {edits.active ? <><UserX size={14} /> Disable</> : <><UserCheck size={14} /> Enable</>}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function UserManagement() {
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSupervisorId, setFilterSupervisorId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then(r => r.data.data),
  });

  const { data: supervisors = [] } = useQuery({
    queryKey: ['supervisors'],
    queryFn: () => api.get('/api/users/supervisors').then(r => r.data.data),
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.get('/api/regions').then(r => r.data.data),
    staleTime: Infinity,
  });

  // Set of user IDs who have at least one direct report (supervisor_id pointing to them)
  const supervisorsWithReports = useMemo(() => {
    if (!data) return new Set();
    const s = new Set();
    for (const u of data) {
      if (u.supervisor_id) s.add(u.supervisor_id);
    }
    return s;
  }, [data]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (filterSupervisorId) {
      result = result.filter(u => u.supervisor_id === filterSupervisorId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, filterSupervisorId, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus size={16} />
            Add User
          </button>
        </div>

        {/* Search + supervisor filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterSupervisorId}
            onChange={e => setFilterSupervisorId(e.target.value)}
            className="sm:w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Supervisors</option>
            {supervisors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          {/* Column headers — desktop only, same GRID template as rows */}
          <div className={`hidden md:grid gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide ${GRID}`}>
            <div>Name</div>
            <div>Email</div>
            <div>Phone</div>
            <div>Role</div>
            <div>Region</div>
            <div>Supervisor</div>
            <div>Category</div>
            <div>Verified</div>
            <div>Save</div>
            <div>Status</div>
          </div>

          {filteredUsers.map(user => (
            <UserRow
              key={user.id}
              user={user}
              supervisors={supervisors}
              regions={regions}
              hasDirectReports={supervisorsWithReports.has(user.id)}
            />
          ))}
          {!isLoading && filteredUsers.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400">No users found</div>
          )}
        </div>

      </div>

      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          supervisors={supervisors}
          defaultSupervisorId={filterSupervisorId}
          regions={regions}
        />
      )}
    </div>
  );
}
