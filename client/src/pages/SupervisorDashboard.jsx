import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MapPin, ExternalLink, ChevronDown, ChevronUp, Download, RefreshCw } from 'lucide-react';
import api from '../lib/axios';
import Navbar from '../components/Navbar';

const TABS = ['Live View', 'Reports'];

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

function LiveView() {
  const [filters, setFilters] = useState({ rep_id: '', region: '', category: '', start_date: '', end_date: '' });
  const [searchName, setSearchName] = useState('');
  const [expanded, setExpanded] = useState(null);

  const { data = [], isLoading, refetch, isFetching } = useAllCheckins(filters);

  const filtered = useMemo(() => {
    if (!searchName.trim()) return data;
    return data.filter(c => c.rep_name?.toLowerCase().includes(searchName.toLowerCase()));
  }, [data, searchName]);

  function toggleRow(id) {
    setExpanded(prev => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <input
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder="Search rep name…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm col-span-2 sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.region}
            onChange={e => setFilters(f => ({ ...f, region: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
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
                {['Rep', 'Business', 'Contact', 'Address', 'Time', 'Accuracy', 'Maps', 'Photo'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
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
                      {c.checked_in_at ? format(new Date(c.checked_in_at), 'MMM d, h:mm a') : '—'}
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
                  </tr>
                  {expanded === c.id && (
                    <tr key={`${c.id}-detail`}>
                      <td colSpan={8} className="px-4 py-4 bg-blue-50 border-b border-blue-100">
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
                            <p><span className="font-medium">Address:</span> {c.address_resolved || '—'}</p>
                            <p><span className="font-medium">Time:</span> {c.checked_in_at ? format(new Date(c.checked_in_at), "PPpp") : '—'}</p>
                            {c.notes && <p><span className="font-medium">Notes:</span> {c.notes}</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
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

function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('rep');
  const [generated, setGenerated] = useState(false);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['report-checkins', startDate, endDate],
    queryFn: () => {
      const q = new URLSearchParams(Object.fromEntries(Object.entries({ start_date: startDate, end_date: endDate }).filter(([, v]) => v)));
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
    const rows = [
      ['Rep Name', 'Region', 'Category', 'Business Name', 'Contact', 'Address', 'Latitude', 'Longitude', 'Maps URL', 'Date', 'Time', 'GPS Accuracy', 'Notes'],
      ...data.map(c => [
        c.rep_name, c.region, c.category, c.location_name, c.contact_name,
        c.address_resolved || '',
        c.gps_latitude || '', c.gps_longitude || '',
        c.google_maps_url || '',
        c.checked_in_at ? format(new Date(c.checked_in_at), 'yyyy-MM-dd') : '',
        c.checked_in_at ? format(new Date(c.checked_in_at), 'HH:mm:ss') : '',
        c.gps_accuracy || '', c.notes || '',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkins-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
            <input
              type="date"
              value={endDate}
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
          <div className="flex items-end">
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

      {generated && data.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 font-medium">{data.length} check-in(s) found</p>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 font-medium border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Check-ins</th>
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
                                    {c.checked_in_at ? format(new Date(c.checked_in_at), 'MMM d, h:mm a') : '—'}
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
        </>
      )}

      {generated && data.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
          <MapPin size={36} className="mx-auto mb-2 opacity-40" />
          <p>No check-ins found for the selected date range</p>
        </div>
      )}
    </div>
  );
}

export default function SupervisorDashboard() {
  const [tab, setTab] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Supervisor Dashboard</h1>

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

        {tab === 0 && <LiveView />}
        {tab === 1 && <Reports />}
      </div>
    </div>
  );
}
