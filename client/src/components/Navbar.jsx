import { Link, useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-800',
  supervisor: 'bg-blue-100 text-blue-800',
  rep: 'bg-green-100 text-green-800',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-blue-700 font-bold text-lg tracking-tight">
          DreamsLive Check-In
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-gray-600 font-medium">{user.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
            {user.role}
          </span>
          {(user.role === 'supervisor' || user.role === 'admin') && (
            <Link
              to="/supervisor"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <ShieldCheck size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}
          {user.role === 'admin' && (
            <Link
              to="/admin/users"
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              <Users size={16} />
              <span className="hidden sm:inline">Users</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
