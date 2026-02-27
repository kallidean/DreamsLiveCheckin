import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Save, Trash2, UserPlus, Eye, UserX, UserCheck } from 'lucide-react';
import api from '../../lib/axios';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

function CheckinsModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: checkins, isLoading } = useQuery({
    queryKey: ['user-checkins', user.id],
    queryFn: () => api.get(`/api/users/${user.id}/checkins`).then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (checkinId) => api.delete(`/api/checkins/${checkinId}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-checkins', user.id] });
      addToast('Check-in deleted', 'success');
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Failed to delete check-in', 'error');
    },
  });

  return (
    <Modal isOpen onClose={onClose} title={`Check-ins — ${user.name}`}>
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      )}
      {!isLoading && checkins?.length === 0 && (
        <p className="text-center text-gray-400 py-8">No check-ins found</p>
      )}
      <div className="space-y-3">
        {checkins?.map(c => (
          <div key={c.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-900">{c.location_name || 'Unknown location'}</p>
                <p className="text-xs text-gray-500">{new Date(c.checked_in_at).toLocaleString()}</p>
                {c.contact_name && <p className="text-xs text-gray-500">Contact: {c.contact_name}</p>}
                {c.address_resolved && <p className="text-xs text-gray-400 truncate">{c.address_resolved}</p>}
                {c.google_maps_url && (
                  <a href={c.google_maps_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                    View on Maps
                  </a>
                )}
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Delete this check-in?')) deleteMutation.mutate(c.id);
                }}
                disabled={deleteMutation.isPending}
                className="text-red-400 hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
            {c.photo_url && (
              <img src={c.photo_url} alt="Check-in" className="mt-2 rounded w-full max-h-40 object-cover" />
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function AddUserModal({ onClose }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'rep', region: '', category: '' });
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
    mutation.mutate(form);
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
            <input
              value={form.region}
              onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <input
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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

function UserRow({ user }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [edits, setEdits] = useState({
    email: user.email || '',
    role: user.role,
    phone: user.phone || '',
    region: user.region || '',
    category: user.category || '',
    verified: user.verified,
    active: user.active !== false,
  });
  const [showCheckins, setShowCheckins] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch(`/api/users/${user.id}`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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

  return (
    <>
      <tr className={`hover:bg-gray-50 ${!edits.active ? 'opacity-50' : ''}`}>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900">{user.name}</div>
          <input
            type="email"
            value={edits.email}
            onChange={e => setEdits(p => ({ ...p, email: e.target.value }))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5"
          />
          {!edits.active && <div className="text-xs text-red-500 font-medium mt-0.5">Disabled</div>}
        </td>
        <td className="px-4 py-3">
          <input
            value={edits.phone}
            onChange={e => setEdits(p => ({ ...p, phone: e.target.value }))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Phone"
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={edits.role}
            onChange={e => setEdits(p => ({ ...p, role: e.target.value }))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="rep">rep</option>
            <option value="supervisor">supervisor</option>
            <option value="admin">admin</option>
          </select>
        </td>
        <td className="px-4 py-3">
          <input
            value={edits.region}
            onChange={e => setEdits(p => ({ ...p, region: e.target.value }))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Region"
          />
        </td>
        <td className="px-4 py-3">
          <input
            value={edits.category}
            onChange={e => setEdits(p => ({ ...p, category: e.target.value }))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Category"
          />
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => setEdits(p => ({ ...p, verified: !p.verified }))}
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              edits.verified ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {edits.verified
              ? <><CheckCircle size={16} /> Verified</>
              : <><XCircle size={16} /> Unverified</>
            }
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateMutation.mutate(edits)}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              <Save size={14} />
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setShowCheckins(true)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <Eye size={14} />
              Check-ins
            </button>
            <button
              onClick={handleToggleActive}
              className={`flex items-center gap-1 text-sm font-medium ${
                edits.active ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'
              }`}
            >
              {edits.active ? <><UserX size={14} /> Disable</> : <><UserCheck size={14} /> Enable</>}
            </button>
          </div>
        </td>
      </tr>
      {showCheckins && <CheckinsModal user={user} onClose={() => setShowCheckins(false)} />}
    </>
  );
}

export default function UserManagement() {
  const [showAddUser, setShowAddUser] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then(r => r.data.data),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus size={16} />
            Add User
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name / Email', 'Phone', 'Role', 'Region', 'Category', 'Verified', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.map(user => (
                  <UserRow key={user.id} user={user} />
                ))}
                {!isLoading && (!data || data.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} />}
    </div>
  );
}
