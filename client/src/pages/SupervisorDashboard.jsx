import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function formatTz(dateStr, timezone, opts) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...opts,
  }).format(new Date(dateStr));
}
import { MapPin, ExternalLink, ChevronDown, ChevronUp, Download, RefreshCw, Trash2 } from 'lucide-react';
import api from '../lib/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const TABS = ['Live View', 'Reports', 'Team'];

function useAllCheckins(params) {
  return useQuery({
    queryKey: ['all-checkins', params],
    queryFn: () => {
      const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
      return api.get(`/api/checkins/all?${q}`).then(r => r.data.data);
    },
    refetchInterval: 60000,
  });
}

function PhotoThumb({ url }) {
  if (!url) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <img src={url} alt="" className="w-10 h-10 rounded object-cover cursor-pointer" />
  );
}

function LiveView({ isAdmin }) {
  const queryClient = useQueryClient();
  const [supervisorId, setSupervisorId] = useState('');
  const [filters, setFilters] = useState({ rep_id: '', region: '', category: '', start_date: '', end_date: '' });
  const [expanded, setExpanded] = useState(null);

  const checkinsParams = { ...filters, ...(supervisorId ? { filter_supervisor_id: supervisorId } : {}) };
  const { data = [], isLoading, refetch, isFetching } = useAllCheckins(checkinsParams);

  const { data: supervisors = [] } = useQuery({
    queryKey: ['supervisors'],
    queryFn: () => api.get('/api/users/supervisors').then(r => r.data.data),
    enabled: isAdmin,
  });

  const { data: reps = [] } = useQuery({
    queryKey: ['reps-list', supervisorId],
    queryFn: () => {
      const q = supervisorId ? `?supervisor_id=${supervisorId}` : '';
      return api.get(`/api/users/reps${q}`).then(r => r.data.data);
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.get('/api/regions').then(r => r.data.data),
    staleTime: Infinity,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/checkins/${id}`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-checkins'] }),
  });

  function handleSupervisorChange(id) {
    setSupervisorId(id);
    setFilters(f => ({ ...f, rep_id: '' }));
  }

  function toggleRow(id) {
    setExpanded(prev => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {isAdmin && (
            <select
              value={supervisorId}
              onChange={e => handleSupervisorChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Supervisors</option>
              {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <select
            value={filters.rep_id}
            onChange={e => setFilters(f => ({ ...f, rep_id: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Reps</option>
            {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select
            value={filters.region}
            onChange={e => setFilters(f => ({ ...f, region: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All States</option>
            {regions.map(r => (
              <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="Retail">Retail</option>
            <option value="Wholesale">Wholesale</option>
          </select>
          <input
            type="date"
            value={filters.start_date}
            onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
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
                {['Rep', 'Business', 'Contact', 'Address', 'Time', 'Accuracy', 'Maps', 'Photo', ...(isAdmin ? ['Delete'] : [])].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(c => (
                <>
                  <tr
                    key={c.id}
                    onClick={() => toggleRow(c.id)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <div>{c.rep_name}</div>
                      <div className="text-xs text-gray-400">{c.region}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-[120px] truncate">{c.location_name}</td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{c.contact_name}</td>
                    <td className="px-3 py-3 text-gray-500 max-w-[160px] truncate text-xs">{c.address_resolved || '—'}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {c.checked_in_at ? formatTz(c.checked_in_at, c.timezone, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {c.gps_accuracy ? `±${Math.round(c.gps_accuracy)}m` : '—'}
                    </td>
                    <td className="px-3 py-3">
                      {c.google_maps_url ? (
                        <a href={c.google_maps_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-500 hover:text-blue-700">
                          <ExternalLink size={14} />
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <PhotoThumb url={c.photo_url} />
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this check-in?')) deleteMutation.mutate(c.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                  {expanded === c.id && (
                    <tr key={`${c.id}-detail`}>
                      <td colSpan={isAdmin ? 9 : 8} className="px-4 py-4 bg-blue-50 border-b border-blue-100">
                        <div className="flex gap-4">
                          {c.photo_url && (
                            <img src={c.photo_url} alt="" className="w-40 rounded-lg object-cover shrink-0" />
                          )}
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Rep:</span> {c.rep_name} ({c.rep_email})</p>
                            <p><span className="font-medium">Region:</span> {c.region || '—'}</p>
                            <p><span className="font-medium">Category:</span> {c.category || '—'}</p>
                            <p><span className="font-medium">Business:</span> {c.location_name}</p>
                            <p><span className="font-medium">Contact:</span> {c.contact_name}</p>
                            {c.contact_email && <p><span className="font-medium">Contact Email:</span> {c.contact_email}</p>}
                            {c.contact_phone && <p><span className="font-medium">Contact Phone:</span> {c.contact_phone}</p>}
                            <p><span className="font-medium">Address:</span> {c.address_resolved || '—'}</p>
                            <p><span className="font-medium">Time:</span> {c.checked_in_at ? formatTz(c.checked_in_at, c.timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}</p>
                            {c.notes && <p><span className="font-medium">Notes:</span> {c.notes}</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {!isLoading && data.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No check-ins found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Reports({ isAdmin }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [repId, setRepId] = useState('');
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');
  const [groupBy, setGroupBy] = useState('rep');
  const [generated, setGenerated] = useState(false);

  const { data: supervisors = [] } = useQuery({
    queryKey: ['supervisors'],
    queryFn: () => api.get('/api/users/supervisors').then(r => r.data.data),
    enabled: isAdmin,
  });

  const { data: reps = [] } = useQuery({
    queryKey: ['reps-list', supervisorId],
    queryFn: () => {
      const q = supervisorId ? `?supervisor_id=${supervisorId}` : '';
      return api.get(`/api/users/reps${q}`).then(r => r.data.data);
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.get('/api/regions').then(r => r.data.data),
    staleTime: Infinity,
  });

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['report-checkins', startDate, endDate, supervisorId, repId, region, category],
    queryFn: () => {
      const q = new URLSearchParams(Object.fromEntries(
        Object.entries({
          start_date: startDate,
          end_date: endDate,
          rep_id: repId,
          region,
          category,
          ...(isAdmin && supervisorId ? { filter_supervisor_id: supervisorId } : {}),
        }).filter(([, v]) => v)
      ));
      return api.get(`/api/checkins/all?${q}`).then(r => r.data.data);
    },
    enabled: false,
  });

  const [expandedGroup, setExpandedGroup] = useState(null);

  const grouped = useMemo(() => {
    if (!data.length) return [];
    const map = {};
    for (const c of data) {
      const key = groupBy === 'rep' ? c.rep_name : groupBy === 'region' ? c.region : c.category;
      if (!map[key]) map[key] = { name: key, checkins: [], locations: new Set() };
      map[key].checkins.push(c);
      if (c.location_name) map[key].locations.add(c.location_name);
    }
    return Object.values(map).sort((a, b) => b.checkins.length - a.checkins.length);
  }, [data, groupBy]);

  function handleGenerate() {
    if (!startDate || !endDate) return;
    setGenerated(false);
    refetch().then(() => setGenerated(true));
  }

  function exportCsv() {
    const selectedRep = reps.find(r => String(r.id) === String(repId));
    const selectedSup = supervisors.find(s => String(s.id) === String(supervisorId));
    const parts = [
      isAdmin && selectedSup ? selectedSup.name.replace(/\s+/g, '-') : null,
      selectedRep ? selectedRep.name.replace(/\s+/g, '-') : (!selectedSup ? 'all-reps' : null),
      region || null,
      category || null,
    ].filter(Boolean);
    const label = parts.length ? parts.join('-') : 'global';
    const rows = [
      ['Rep Name', 'Region', 'Category', 'Business Name', 'Contact Name', 'Contact Email', 'Contact Phone', 'Address', 'Latitude', 'Longitude', 'Maps URL', 'Date', 'Time', 'GPS Accuracy', 'Notes'],
      ...data.map(c => [
        c.rep_name, c.region, c.category, c.location_name, c.contact_name,
        c.contact_email || '', c.contact_phone || '',
        c.address_resolved || '',
        c.gps_latitude || '', c.gps_longitude || '',
        c.google_maps_url || '',
        c.checked_in_at ? formatTz(c.checked_in_at, c.timezone, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
        c.checked_in_at ? formatTz(c.checked_in_at, c.timezone, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '',
        c.gps_accuracy || '', c.notes || '',
      ]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `checkins-${label}-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Admin-only: Team / Supervisor filter */}
          {isAdmin && (
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Team / Supervisor</label>
              <select
                value={supervisorId}
                onChange={e => { setSupervisorId(e.target.value); setRepId(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Teams (Global Report)</option>
                {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rep</label>
            <select
              value={repId}
              onChange={e => setRepId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Reps</option>
              {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Region (State)</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All States</option>
              {regions.map(r => (
                <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rep">Individual Rep</option>
              <option value="region">Region</option>
              <option value="category">Category</option>
            </select>
          </div>
          <div className="flex items-end sm:col-span-3">
            <button
              onClick={handleGenerate}
              disabled={!startDate || !endDate || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {isLoading ? 'Loading…' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {generated && data.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
          <MapPin size={36} className="mx-auto mb-2 opacity-40" />
          <p>No check-ins found for the selected filters and date range</p>
        </div>
      )}

      {generated && data.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 font-medium">{data.length} check-in{data.length !== 1 ? 's' : ''} found</p>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 font-medium border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          {/* Summary Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Summary</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Group</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check-ins</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unique Locations</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grouped.map(g => (
                    <>
                      <tr
                        key={g.name}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedGroup(prev => prev === g.name ? null : g.name)}
                      >
                        <td className="px-4 py-3 font-medium">{g.name || '(none)'}</td>
                        <td className="px-4 py-3">{g.checkins.length}</td>
                        <td className="px-4 py-3">{g.locations.size}</td>
                        <td className="px-4 py-3 text-gray-400">
                          {expandedGroup === g.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                      </tr>
                      {expandedGroup === g.name && (
                        <tr key={`${g.name}-detail`}>
                          <td colSpan={4} className="px-4 py-3 bg-gray-50">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left pb-2">Time</th>
                                  <th className="text-left pb-2">Business</th>
                                  <th className="text-left pb-2">Contact</th>
                                  <th className="text-left pb-2">Address</th>
                                  <th className="text-left pb-2">Maps</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {g.checkins.map(c => (
                                  <tr key={c.id}>
                                    <td className="py-1.5 pr-3 whitespace-nowrap">
                                      {c.checked_in_at ? formatTz(c.checked_in_at, c.timezone, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}
                                    </td>
                                    <td className="py-1.5 pr-3">{c.location_name}</td>
                                    <td className="py-1.5 pr-3">{c.contact_name}</td>
                                    <td className="py-1.5 pr-3 max-w-[160px] truncate">{c.address_resolved || '—'}</td>
                                    <td className="py-1.5">
                                      {c.google_maps_url
                                        ? <a href={c.google_maps_url} target="_blank" rel="noreferrer" className="text-blue-500"><ExternalLink size={12} /></a>
                                        : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Detailed</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Rep', 'Date / Time', 'Business', 'Contact', 'Email', 'Phone', 'Address', 'Notes', 'Maps'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        <div>{c.rep_name}</div>
                        {c.region && <div className="text-xs text-gray-400">{c.region}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">
                        {c.checked_in_at
                          ? formatTz(c.checked_in_at, c.timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 max-w-[140px] truncate">{c.location_name || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700">{c.contact_name || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{c.contact_email || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{c.contact_phone || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[180px] truncate">{c.address_resolved || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[140px] truncate">{c.notes || '—'}</td>
                      <td className="px-3 py-2.5">
                        {c.google_maps_url
                          ? <a href={c.google_maps_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><ExternalLink size={13} /></a>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrgTreeNode({ user, childrenMap, depth }) {
  const children = childrenMap[user.id] || [];
  return (
    <div className={depth > 0 ? 'ml-5 border-l-2 border-gray-100 pl-3' : ''}>
      <div className="flex items-center gap-2 py-1.5">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
          user.role === 'supervisor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {user.role === 'supervisor' ? 'Sup' : 'Rep'}
        </span>
        <span className={`text-sm text-gray-900 ${!user.active ? 'line-through text-gray-400' : ''}`}>{user.name}</span>
        {user.region && <span className="text-xs text-gray-400">· {user.region}</span>}
        {!user.active && <span className="text-xs text-red-400 font-medium">Disabled</span>}
      </div>
      {children.map(child => (
        <OrgTreeNode key={child.id} user={child} childrenMap={childrenMap} depth={depth + 1} />
      ))}
    </div>
  );
}

function Team({ currentUser }) {
  const isAdmin = currentUser?.role === 'admin';

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/api/users/team').then(r => r.data.data),
  });

  const childrenMap = useMemo(() => {
    const map = {};
    for (const u of teamMembers) {
      const pid = u.supervisor_id || '__root__';
      if (!map[pid]) map[pid] = [];
      map[pid].push(u);
    }
    return map;
  }, [teamMembers]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // For supervisors: root is current user, their direct/indirect reports populate the tree
  // For admins: top-level nodes are supervisors with no supervisor_id
  const rootNodes = isAdmin
    ? (childrenMap['__root__'] || []).filter(u => u.role === 'supervisor')
    : (childrenMap[currentUser?.id] || []);

  const unassigned = isAdmin
    ? (childrenMap['__root__'] || []).filter(u => u.role === 'rep')
    : [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        {!isAdmin && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-purple-100 text-purple-700">Sup</span>
              <span className="font-semibold text-gray-900">{currentUser?.name} (You)</span>
            </div>
          </div>
        )}

        {rootNodes.length === 0 && unassigned.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            {isAdmin ? 'No org structure defined yet' : 'No team members assigned yet'}
          </p>
        ) : (
          <>
            {rootNodes.map(node => (
              <OrgTreeNode key={node.id} user={node} childrenMap={childrenMap} depth={0} />
            ))}
          </>
        )}
      </div>

      {unassigned.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Unassigned Reps</p>
          {unassigned.map(u => (
            <div key={u.id} className="flex items-center gap-2 py-1.5">
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700">Rep</span>
              <span className={`text-sm text-gray-900 ${!u.active ? 'line-through text-gray-400' : ''}`}>{u.name}</span>
              {u.region && <span className="text-xs text-gray-400">· {u.region}</span>}
              {!u.active && <span className="text-xs text-red-400 font-medium">Disabled</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin ? 'Admin Dashboard' : 'Supervisor Dashboard'}
          </p>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === i
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && <LiveView isAdmin={isAdmin} />}
        {tab === 1 && <Reports isAdmin={isAdmin} />}
        {tab === 2 && <Team currentUser={user} />}
      </div>
    </div>
  );
}
