import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Home, Map, Calendar, FileText, Users, Settings, CheckSquare } from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Navigation({ currentView, onNavigate }: NavigationProps) {
  const { profile, signOut } = useAuth();

  const getNavItems = () => {
    switch (profile?.role) {
      case 'course_manager':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'courses', label: 'My Courses', icon: Map },
          { id: 'approvals', label: 'Ad Management', icon: CheckSquare },
          { id: 'sponsorships', label: 'Sponsorships', icon: FileText },
          { id: 'outings', label: 'Outings', icon: Calendar },
        ];
      case 'sponsor':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'marketplace', label: 'Find Courses', icon: Map },
          { id: 'my-sponsorships', label: 'My Sponsorships', icon: FileText },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'sponsorships', label: 'Sponsorships', icon: FileText },
          { id: 'advertisements', label: 'Advertisements', icon: Users },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-green-700">All Square</h1>
            <div className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                      currentView === item.id
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role.replace('_', ' ')}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Sign out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
