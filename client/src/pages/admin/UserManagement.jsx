import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, UserPlus, UserX, UserCheck, Search, Save, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../../lib/axios';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

// Desktop: 10 proportional fr columns — fully fluid
// Order: First | Last | Email | Phone | Role | Region | Supervisor | Category | Verified | Status
const GRID = 'md:grid-cols-[1.2fr_1.2fr_1.8fr_1fr_0.8fr_0.7fr_1.5fr_1fr_0.6fr_0.8fr]';

const FIELD_LABELS = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  role: 'Role',
  region: 'Region',
  category: 'Category',
  verified: 'Verified',
  active: 'Status',
  supervisor_id: 'Supervisor',
};

function getOriginal(user) {
  return {
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'rep',
    region: user.region || '',
    category: user.category || '',
    verified: !!user.verified,
    active: user.active !== false,
    supervisor_id: String(user.supervisor_id || ''),
  };
}

function buildChanges(original, draft, supervisors) {
  const changes = [];
  for (const field of Object.keys(FIELD_LABELS)) {
    const origVal = original[field] ?? '';
    const draftVal = draft[field] ?? '';
    if (String(origVal) !== String(draftVal)) {
      let origDisplay = String(origVal);
      let draftDisplay = String(draftVal);
      if (field === 'supervisor_id') {
        origDisplay = supervisors.find(s => String(s.id) === origDisplay)?.name || origDisplay || '(none)';
        draftDisplay = supervisors.find(s => String(s.id) === draftDisplay)?.name || draftDisplay || '(none)';
      } else if (field === 'verified' || field === 'active') {
        origDisplay = origVal ? 'Yes' : 'No';
        draftDisplay = draftVal ? 'Yes' : 'No';
      }
      if (!origDisplay) origDisplay = '(empty)';
      if (!draftDisplay) draftDisplay = '(empty)';
      changes.push({ field, label: FIELD_LABELS[field], old: origDisplay, new: draftDisplay });
    }
  }
  return changes;
}

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <div
      className="flex items-center gap-0.5 cursor-pointer select-none hover:text-gray-700 transition-colors"
      onClick={() => onSort(field)}
    >
      {label}
      {active
        ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
        : <ChevronUp size={11} className="opacity-20" />}
    </div>
  );
}

function AddUserModal({ onClose, supervisors, defaultSupervisorId, regions }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', phone: '',
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
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
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
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
            <input
              required
              value={form.first_name}
              onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
            <input
              value={form.last_name}
              onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
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

function ConfirmDialog({ item, onProceed, onSkip, onCancel, isLoading, queuePos, queueTotal }) {
  const { draft, changes } = item;
  const fullName = [draft.first_name, draft.last_name].filter(Boolean).join(' ');
  return (
    <Modal isOpen onClose={onCancel} title={`Confirm Changes — ${queuePos} of ${queueTotal}`}>
      <p className="text-sm text-gray-700 mb-4">
        Save the following changes for <strong>{fullName || item.user.email}</strong>?
      </p>
      {changes.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No changes detected.</p>
      ) : (
        <div className="space-y-1.5 mb-6 border border-gray-100 rounded-lg p-3 bg-gray-50">
          {changes.map(({ label, old: oldVal, new: newVal }) => (
            <div key={label} className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className="font-medium text-gray-600 shrink-0">{label}:</span>
              <span className="text-red-500 line-through shrink-0">{oldVal}</span>
              <span className="text-gray-400 shrink-0">→</span>
              <span className="text-green-600 shrink-0">{newVal}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-lg transition-colors"
        >
          Cancel All
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
        >
          Skip
        </button>
        <button
          onClick={onProceed}
          disabled={isLoading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Saving…' : 'Proceed'}
        </button>
      </div>
    </Modal>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function UserRow({ user, draft, onFieldChange, supervisors, regions, hasDirectReports, isDirty }) {
  return (
    <div className={`border-b border-gray-100 px-3 py-3 last:border-b-0 transition-colors ${
      !draft.active ? 'opacity-50' : isDirty ? 'bg-yellow-50' : 'hover:bg-gray-50'
    }`}>
      {/*
        Mobile: grid-cols-3 — 9 visible items → 3×3
          Row 1: Name (first+last stacked + verified icon)  | Email      | Phone
          Row 2: Role                                       | Region     | Supervisor
          Row 3: Category                                   | Verified(hidden) | Status
        Desktop: 10-column fr grid (First | Last as separate columns; Verified its own col)
      */}
      <div className={`grid grid-cols-3 gap-2 ${GRID} md:items-center`}>

        {/* 1 — First Name cell (mobile: stacks last name + verified icon beneath) */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Name</span>
          <div className="flex items-start gap-1">
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <input
                value={draft.first_name}
                onChange={e => onFieldChange(user.id, 'first_name', e.target.value)}
                className={inputCls}
                placeholder="First"
              />
              {/* Last name stacked under first name on mobile only */}
              <input
                value={draft.last_name}
                onChange={e => onFieldChange(user.id, 'last_name', e.target.value)}
                className={`${inputCls} md:hidden`}
                placeholder="Last"
              />
            </div>
            {/* Verified toggle icon — mobile only */}
            <button
              type="button"
              onClick={() => onFieldChange(user.id, 'verified', !draft.verified)}
              title={draft.verified ? 'Verified — click to unverify' : 'Not verified — click to verify'}
              className={`md:hidden mt-1 shrink-0 transition-colors ${
                draft.verified ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'
              }`}
            >
              <CheckCircle size={15} />
            </button>
          </div>
        </div>

        {/* 2 — Last Name (desktop only) */}
        <div className="hidden md:flex flex-col min-w-0">
          <input
            value={draft.last_name}
            onChange={e => onFieldChange(user.id, 'last_name', e.target.value)}
            className={inputCls}
            placeholder="Last Name"
          />
        </div>

        {/* 3 — Email */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Email</span>
          <input
            type="email"
            value={draft.email}
            onChange={e => onFieldChange(user.id, 'email', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* 4 — Phone */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Phone</span>
          <input
            value={draft.phone}
            onChange={e => onFieldChange(user.id, 'phone', e.target.value)}
            className={inputCls}
            placeholder="Phone"
          />
        </div>

        {/* 5 — Role */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Role</span>
          <select
            value={draft.role}
            onChange={e => onFieldChange(user.id, 'role', e.target.value)}
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

        {/* 6 — Region */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Region</span>
          <select
            value={draft.region}
            onChange={e => onFieldChange(user.id, 'region', e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {regions.map(r => (
              <option key={r.code} value={r.code}>{r.code}</option>
            ))}
          </select>
        </div>

        {/* 7 — Supervisor */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Supervisor</span>
          <select
            value={draft.supervisor_id}
            onChange={e => onFieldChange(user.id, 'supervisor_id', e.target.value)}
            className={inputCls}
          >
            <option value="">— None —</option>
            {supervisors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 8 — Category */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Category</span>
          <input
            value={draft.category}
            onChange={e => onFieldChange(user.id, 'category', e.target.value)}
            className={inputCls}
            placeholder="Category"
          />
        </div>

        {/* 9 — Verified (desktop only — hidden on mobile so 3×3 is preserved) */}
        <div className="hidden md:flex flex-col justify-center min-w-0">
          <button
            type="button"
            onClick={() => onFieldChange(user.id, 'verified', !draft.verified)}
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              draft.verified ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {draft.verified ? <><CheckCircle size={14} /> Verified</> : <><XCircle size={14} /> No</>}
          </button>
        </div>

        {/* 10 — Status (enable/disable) */}
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-xs text-gray-400 mb-0.5 md:hidden">Status</span>
          <button
            type="button"
            onClick={() => onFieldChange(user.id, 'active', !draft.active)}
            className={`flex items-center gap-1 text-sm font-medium ${
              draft.active ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'
            }`}
          >
            {draft.active ? <><UserX size={14} /> Disable</> : <><UserCheck size={14} /> Enable</>}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSupervisorId, setFilterSupervisorId] = useState('');
  const [sortField, setSortField] = useState('last_name');
  const [sortDir, setSortDir] = useState('asc');
  const [drafts, setDrafts] = useState({});
  const [saveQueue, setSaveQueue] = useState([]);
  const [saveQueueIdx, setSaveQueueIdx] = useState(0);

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

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }) => api.patch(`/api/users/${userId}`, payload).then(r => r.data),
  });

  const supervisorsWithReports = useMemo(() => {
    if (!data) return new Set();
    const s = new Set();
    for (const u of data) {
      if (u.supervisor_id) s.add(u.supervisor_id);
    }
    return s;
  }, [data]);

  function getEffectiveDraft(user) {
    return { ...getOriginal(user), ...(drafts[user.id] || {}) };
  }

  function handleFieldChange(userId, field, value) {
    setDrafts(prev => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [field]: value },
    }));
  }

  function isUserDirty(user) {
    const d = drafts[user.id];
    if (!d) return false;
    const orig = getOriginal(user);
    const eff = { ...orig, ...d };
    return Object.keys(orig).some(k => String(eff[k] ?? '') !== String(orig[k] ?? ''));
  }

  function handleSort(field) {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const filteredAndSortedUsers = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (filterSupervisorId) {
      result = result.filter(u => String(u.supervisor_id) === String(filterSupervisorId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        return fullName.includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q);
      });
    }
    result = [...result].sort((a, b) => {
      const av = String(a[sortField] ?? '').toLowerCase();
      const bv = String(b[sortField] ?? '').toLowerCase();
      let cmp = av < bv ? -1 : av > bv ? 1 : 0;
      if (cmp === 0 && sortField === 'last_name') {
        const af = String(a.first_name || '').toLowerCase();
        const bf = String(b.first_name || '').toLowerCase();
        cmp = af < bf ? -1 : af > bf ? 1 : 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [data, filterSupervisorId, searchQuery, sortField, sortDir]);

  const dirtyCount = useMemo(() => {
    if (!data) return 0;
    return data.filter(u => isUserDirty(u)).length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, drafts]);

  function handleSaveAll() {
    if (!data) return;
    const queue = data
      .filter(u => isUserDirty(u))
      .map(u => ({
        user: u,
        draft: getEffectiveDraft(u),
        changes: buildChanges(getOriginal(u), getEffectiveDraft(u), supervisors),
      }));
    if (queue.length === 0) return;
    setSaveQueue(queue);
    setSaveQueueIdx(0);
  }

  async function handleProceed() {
    const item = saveQueue[saveQueueIdx];
    if (!item) return;
    try {
      await updateMutation.mutateAsync({
        userId: item.user.id,
        payload: {
          ...item.draft,
          supervisor_id: item.draft.supervisor_id || null,
          region: item.draft.region || null,
          phone: item.draft.phone || null,
          last_name: item.draft.last_name || null,
          category: item.draft.category || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      setDrafts(prev => {
        const next = { ...prev };
        delete next[item.user.id];
        return next;
      });
      const name = [item.draft.first_name, item.draft.last_name].filter(Boolean).join(' ');
      addToast(`${name || item.user.email} updated`, 'success');
      advanceQueue();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update user', 'error');
    }
  }

  function advanceQueue() {
    const nextIdx = saveQueueIdx + 1;
    if (nextIdx >= saveQueue.length) {
      setSaveQueue([]);
      setSaveQueueIdx(0);
    } else {
      setSaveQueueIdx(nextIdx);
    }
  }

  const sortProps = { sortField, sortDir, onSort: handleSort };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <div className="flex items-center gap-2">
            {dirtyCount > 0 && (
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Save size={15} />
                Save Changes
                <span className="bg-white text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {dirtyCount}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <UserPlus size={16} />
              Add User
            </button>
          </div>
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
            <SortHeader label="First Name" field="first_name" {...sortProps} />
            <SortHeader label="Last Name" field="last_name" {...sortProps} />
            <SortHeader label="Email" field="email" {...sortProps} />
            <SortHeader label="Phone" field="phone" {...sortProps} />
            <SortHeader label="Role" field="role" {...sortProps} />
            <SortHeader label="Region" field="region" {...sortProps} />
            <SortHeader label="Supervisor" field="supervisor_id" {...sortProps} />
            <SortHeader label="Category" field="category" {...sortProps} />
            <div>Verified</div>
            <SortHeader label="Status" field="active" {...sortProps} />
          </div>

          {filteredAndSortedUsers.map(user => (
            <UserRow
              key={user.id}
              user={user}
              draft={getEffectiveDraft(user)}
              onFieldChange={handleFieldChange}
              supervisors={supervisors}
              regions={regions}
              hasDirectReports={supervisorsWithReports.has(user.id)}
              isDirty={isUserDirty(user)}
            />
          ))}
          {!isLoading && filteredAndSortedUsers.length === 0 && (
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

      {saveQueue.length > 0 && saveQueueIdx < saveQueue.length && (
        <ConfirmDialog
          item={saveQueue[saveQueueIdx]}
          onProceed={handleProceed}
          onSkip={advanceQueue}
          onCancel={() => { setSaveQueue([]); setSaveQueueIdx(0); }}
          isLoading={updateMutation.isPending}
          queuePos={saveQueueIdx + 1}
          queueTotal={saveQueue.length}
        />
      )}
    </div>
  );
}
