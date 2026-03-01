import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

function formatTz(dateStr, timezone, opts) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...opts,
  }).format(new Date(dateStr));
}
import { PlusCircle, MapPin, User, Clock, Crosshair, Image, FileDown, Loader } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';

function CheckInCard({ checkin, onClick }) {
  const time = checkin.checked_in_at
    ? formatTz(checkin.checked_in_at, checkin.timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  return (
    <button
      onClick={() => onClick(checkin)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md hover:border-blue-200 transition-all w-full"
    >
      <div className="flex gap-3">
        {checkin.photo_url ? (
          <img
            src={checkin.photo_url}
            alt=""
            className="w-16 h-16 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <Image size={20} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{checkin.location_name}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <Clock size={11} />
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <User size={11} />
            <span>{checkin.contact_name}</span>
          </div>
          {checkin.address_resolved && (
            <div className="flex items-start gap-1 text-xs text-gray-500 mt-0.5">
              <MapPin size={11} className="mt-0.5 shrink-0" />
              <span className="truncate">{checkin.address_resolved}</span>
            </div>
          )}
          {checkin.gps_accuracy && (
            <div className="flex items-center gap-1 text-xs text-blue-500 mt-0.5">
              <Crosshair size={11} />
              <span>±{Math.round(checkin.gps_accuracy)}m accuracy</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function CheckInDetail({ checkin }) {
  if (!checkin) return null;
  const time = checkin.checked_in_at
    ? formatTz(checkin.checked_in_at, checkin.timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  return (
    <div className="space-y-4">
      {checkin.photo_url && (
        <img src={checkin.photo_url} alt="Check-in" className="w-full rounded-lg object-cover max-h-64" />
      )}
      <div className="space-y-2 text-sm">
        <Row label="Business" value={checkin.location_name} />
        <Row label="Contact" value={checkin.contact_name} />
        {checkin.contact_email && <Row label="Contact Email" value={checkin.contact_email} />}
        {checkin.contact_phone && <Row label="Contact Phone" value={checkin.contact_phone} />}
        <Row label="Time" value={time} />
        {checkin.address_resolved && <Row label="Address" value={checkin.address_resolved} />}
        {checkin.gps_accuracy && <Row label="GPS Accuracy" value={`±${Math.round(checkin.gps_accuracy)} meters`} />}
        {checkin.notes && <Row label="Notes" value={checkin.notes} />}
        {checkin.google_maps_url && (
          <div className="flex gap-2">
            <span className="font-medium text-gray-600 w-28 shrink-0">Maps</span>
            <a
              href={checkin.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              View on Google Maps
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-gray-600 w-28 shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

function escapeCSV(val) {
  if (val == null) return '';
  const s = String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function exportCSV(rows, repName) {
  const headers = ['Date', 'Time', 'Business', 'Contact Name', 'Contact Email', 'Contact Phone', 'Address', 'Notes', 'Maps Link'];
  const lines = [headers.join(',')];
  for (const c of rows) {
    const tz = c.timezone;
    const date = c.checked_in_at ? formatTz(c.checked_in_at, tz, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
    const time = c.checked_in_at ? formatTz(c.checked_in_at, tz, { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
    lines.push([
      escapeCSV(date),
      escapeCSV(time),
      escapeCSV(c.location_name),
      escapeCSV(c.contact_name),
      escapeCSV(c.contact_email),
      escapeCSV(c.contact_phone),
      escapeCSV(c.address_resolved),
      escapeCSV(c.notes),
      escapeCSV(c.google_maps_url),
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `checkins-${repName.replace(/\s+/g, '-')}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportModal({ isOpen, onClose, repName }) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(today);
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    if (!startDate) { setError('Please select a start date.'); return; }
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const res = await api.get(`/api/checkins/my?${params}`);
      setRows(res.data.data);
    } catch {
      setError('Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setRows(null);
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Export Report">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              max={endDate || today}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          onClick={generate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
        >
          {loading ? <><Loader size={14} className="animate-spin" /> Generating…</> : 'Generate Report'}
        </button>

        {rows !== null && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{rows.length} check-in{rows.length !== 1 ? 's' : ''} found</p>
              {rows.length > 0 && (
                <button
                  onClick={() => exportCSV(rows, repName)}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FileDown size={13} /> Export CSV
                </button>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">No check-ins in this date range.</p>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                {rows.map(c => {
                  const time = c.checked_in_at
                    ? formatTz(c.checked_in_at, c.timezone, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                    : '';
                  return (
                    <div key={c.id} className="px-3 py-2.5 bg-white hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900 truncate">{c.location_name}</p>
                        <p className="text-xs text-gray-400 shrink-0">{time}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{c.contact_name}</p>
                      {c.address_resolved && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{c.address_resolved}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function RepDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'supervisor' || user?.role === 'admin') {
      navigate('/supervisor', { replace: true });
    }
  }, [user, navigate]);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-checkins', month, year],
    queryFn: () => api.get(`/api/checkins/my?month=${month}&year=${year}`).then(r => r.data.data),
    refetchOnMount: 'always',
  });

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your check-in history</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportOpen(true)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-2.5 rounded-lg transition-colors text-sm"
            >
              <FileDown size={16} />
              Report
            </button>
            <Link
              to="/checkin/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
            >
              <PlusCircle size={16} />
              New Check-In
            </Link>
          </div>
        </div>

        {!isLoading && data && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-blue-600">{data.length}</span>
            <span className="text-sm text-gray-500">
              check-in{data.length !== 1 ? 's' : ''} in {months[month - 1]} {year}
            </span>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {!isLoading && data?.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MapPin size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No check-ins this month</p>
            <p className="text-sm mt-1">Tap "New Check-In" to get started</p>
          </div>
        )}

        <div className="grid gap-3">
          {data?.map(c => (
            <CheckInCard key={c.id} checkin={c} onClick={setSelected} />
          ))}
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Check-In Details">
        <CheckInDetail checkin={selected} />
      </Modal>

      <ReportModal isOpen={reportOpen} onClose={() => setReportOpen(false)} repName={user?.name || ''} />
    </div>
  );
}
