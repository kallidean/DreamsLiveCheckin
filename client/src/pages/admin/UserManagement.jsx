import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Save } from 'lucide-react';
import api from '../../lib/axios';
import Navbar from '../../components/Navbar';
import { useToast } from '../../components/Toast';

function UserRow({ user }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [edits, setEdits] = useState({
    role: user.role,
    region: user.region || '',
    category: user.category || '',
    verified: user.verified,
  });

  const mutation = useMutation({
    mutationFn: (data) => api.patch(`/api/users/${user.id}`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast(`${user.name} updated successfully`, 'success');
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Failed to update user', 'error');
    },
  });

  function handleSave() {
    mutation.mutate(edits);
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{user.name}</div>
        <div className="text-xs text-gray-500">{user.email}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{user.phone || '—'}</td>
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
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
        >
          <Save size={14} />
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

export default function UserManagement() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then(r => r.data.data),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">User Management</h1>

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
    </div>
  );
}
