import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

function formatTz(dateStr, timezone, opts) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...opts,
  }).format(new Date(dateStr));
}
import { PlusCircle, MapPin, User, Clock, Crosshair, Image } from 'lucide-react';
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

  const { data, isLoading } = useQuery({
    queryKey: ['my-checkins', month, year],
    queryFn: () => api.get(`/api/checkins/my?month=${month}&year=${year}`).then(r => r.data.data),
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
          <Link
            to="/checkin/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <PlusCircle size={16} />
            New Check-In
          </Link>
        </div>

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
    </div>
  );
}
