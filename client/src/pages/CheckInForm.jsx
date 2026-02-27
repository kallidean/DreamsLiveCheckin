import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, MapPin, RefreshCw, Loader, ArrowLeft, AlertTriangle } from 'lucide-react';
import api from '../lib/axios';
import Navbar from '../components/Navbar';
import { useToast } from '../components/Toast';

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_W = 800;
      let { width, height } = img;
      if (width > MAX_W) {
        height = Math.round((height * MAX_W) / width);
        width = MAX_W;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function gpsErrorMessage(err) {
  if (err.code === 1) return 'Location access denied. On iPhone, go to Settings → Privacy → Location Services → Safari → While Using.';
  if (err.code === 2) return 'Unable to determine your location. Please try moving to an area with better signal.';
  if (err.code === 3) return 'Location request timed out. Please try again.';
  return 'Could not get your location. Please try again.';
}

async function getPosition() {
  if (!navigator.geolocation) throw new Error('Geolocation not supported');
  // Try high accuracy first, fall back to low accuracy on timeout/unavailable
  try {
    return await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      })
    );
  } catch (err) {
    if (err.code === 1) throw err; // Permission denied — no point retrying
    return await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30000,
      })
    );
  }
}

export default function CheckInForm() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [coords, setCoords] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  function handleCaptureButton() {
    setGpsError('');
    // Must click synchronously — iOS Safari blocks programmatic clicks after any await
    fileInputRef.current.click();
    // Get GPS in background for the accuracy display
    setCapturing(true);
    getPosition()
      .then(pos => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      })
      .catch(err => setGpsError(gpsErrorMessage(err)))
      .finally(() => setCapturing(false));
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch {
      setGpsError('Failed to process photo. Please try again.');
    }
    e.target.value = '';
  }

  async function onSubmit(data) {
    setSubmitError('');
    if (!photo) {
      setSubmitError('Please capture a photo before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      // Get fresh GPS at submit time
      let freshCoords = null;
      try {
        const pos = await getPosition();
        freshCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      } catch (gpsErr) {
        setSubmitting(false);
        setSubmitError(gpsErrorMessage(gpsErr));
        return;
      }

      await api.post('/api/checkins', {
        business_name: data.business_name,
        contact_name: data.contact_name,
        notes: data.notes,
        photo,
        latitude: freshCoords.latitude,
        longitude: freshCoords.longitude,
        gps_accuracy: freshCoords.accuracy,
      });

      queryClient.invalidateQueries({ queryKey: ['my-checkins'] });
      addToast('Check-in submitted successfully', 'success');
      navigate('/');
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">New Check-In</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('business_name', { required: 'Business name is required' })}
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Sunrise Bakery"
              />
              {errors.business_name && (
                <p className="text-red-500 text-xs mt-1">{errors.business_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('contact_name', { required: 'Contact name is required' })}
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Person you spoke with"
              />
              {errors.contact_name && (
                <p className="text-red-500 text-xs mt-1">{errors.contact_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional notes about this visit…"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Photo & Location</h2>

            {gpsError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            )}

            {!photo ? (
              <button
                type="button"
                onClick={handleCaptureButton}
                disabled={capturing}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {capturing ? (
                  <><Loader size={18} className="animate-spin" /> Getting location…</>
                ) : (
                  <><Camera size={18} /> Capture Photo & Location</>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <img
                  src={photo}
                  alt="Preview"
                  className="w-full rounded-lg object-cover max-h-64"
                />
                {coords && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <MapPin size={12} />
                    <span>
                      Location captured — ±{Math.round(coords.accuracy)}m accuracy
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setCoords(null); setGpsError(''); }}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw size={14} /> Retake
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {submitError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-base"
          >
            {submitting ? (
              <><Loader size={18} className="animate-spin" /> Submitting…</>
            ) : (
              'Submit Check-In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
