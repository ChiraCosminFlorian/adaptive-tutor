import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useState } from 'react';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide navbar on auth pages and landing
  const hiddenPaths = ['/login', '/register', '/'];
  if (hiddenPaths.includes(location.pathname)) return null;

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AdaptIQ
          </span>
        </Link>

        {/* Desktop links */}
        {isAuthenticated && (
          <div className="hidden items-center gap-6 md:flex">
            <Link
              to="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-indigo-400 ${
                location.pathname === '/dashboard' ? 'text-indigo-400' : 'text-gray-400'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/bkt"
              className={`text-sm font-medium transition-colors hover:text-indigo-400 ${
                location.pathname === '/bkt' ? 'text-indigo-400' : 'text-gray-400'
              }`}
            >
              BKT Analysis
            </Link>
            <Link
              to="/profile"
              className={`text-sm font-medium transition-colors hover:text-indigo-400 ${
                location.pathname === '/profile' ? 'text-indigo-400' : 'text-gray-400'
              }`}
            >
              Profile
            </Link>
          </div>
        )}

        {/* Right side */}
        {isAuthenticated && (
          <div className="hidden items-center gap-4 md:flex">
            <span className="text-sm text-gray-400">
              {user?.username || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              Logout
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        {isAuthenticated && (
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col gap-1 md:hidden"
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-5 bg-gray-400 transition-transform ${mobileOpen ? 'translate-y-1.5 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-5 bg-gray-400 transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-gray-400 transition-transform ${mobileOpen ? '-translate-y-1.5 -rotate-45' : ''}`} />
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {isAuthenticated && mobileOpen && (
        <div className="border-t border-gray-800 bg-gray-950 px-4 pb-4 pt-2 md:hidden">
          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm text-gray-300 hover:text-indigo-400"
          >
            Dashboard
          </Link>
          <Link
            to="/bkt"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm text-gray-300 hover:text-indigo-400"
          >
            BKT Analysis
          </Link>
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm text-gray-300 hover:text-indigo-400"
          >
            Profile
          </Link>
          <div className="mt-2 flex items-center justify-between border-t border-gray-800 pt-3">
            <span className="text-sm text-gray-500">{user?.username}</span>
            <button
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
