import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, TrendingUp, Calendar, MapPin } from 'lucide-react';

interface DashboardStats {
  totalCourses: number;
  activeSponsorships: number;
  pendingRequests: number;
  totalRevenue: number;
}

interface CourseManagerDashboardProps {
  onNavigate?: (view: string) => void;
}

export function CourseManagerDashboard({ onNavigate }: CourseManagerDashboardProps) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    activeSponsorships: 0,
    pendingRequests: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('manager_id', profile.id);

      const courseIds = courses?.map((c) => c.id) || [];

      if (courseIds.length > 0) {
        const { data: sponsorships } = await supabase
          .from('sponsorships')
          .select('*, holes!inner(course_id)')
          .in('holes.course_id', courseIds);

        const now = new Date();
        const active = sponsorships?.filter((s) => {
          const start = new Date(s.start_date);
          const end = new Date(s.end_date);
          return s.status === 'approved' && start <= now && end >= now;
        }).length || 0;
        const pending = sponsorships?.filter((s) => s.status === 'pending').length || 0;
        const revenue =
          sponsorships
            ?.filter((s) => {
              if (s.status === 'completed') return true;
              const start = new Date(s.start_date);
              const end = new Date(s.end_date);
              return s.status === 'approved' && start <= now && end >= now;
            })
            .reduce((sum, s) => sum + parseFloat(s.course_amount || '0'), 0) || 0;

        setStats({
          totalCourses: courses?.length || 0,
          activeSponsorships: active,
          pendingRequests: pending,
          totalRevenue: revenue,
        });
      } else {
        setStats({
          totalCourses: 0,
          activeSponsorships: 0,
          pendingRequests: 0,
          totalRevenue: 0,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Courses',
      value: stats.totalCourses,
      icon: MapPin,
      color: 'bg-blue-500',
      navigate: null,
    },
    {
      label: 'Active Sponsorships',
      value: stats.activeSponsorships,
      icon: TrendingUp,
      color: 'bg-green-500',
      navigate: 'sponsorships',
    },
    {
      label: 'Pending Requests',
      value: stats.pendingRequests,
      icon: Calendar,
      color: 'bg-yellow-500',
      navigate: 'approvals',
    },
    {
      label: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-600',
      navigate: null,
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isClickable = !!stat.navigate;
          return (
            <div
              key={index}
              onClick={() => stat.navigate && onNavigate?.(stat.navigate)}
              className={`bg-white rounded-lg shadow-md p-6 ${isClickable ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  {isClickable && (
                    <p className="text-xs text-green-600 mt-1 font-medium">View all →</p>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate?.('courses')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
          >
            <h4 className="font-medium text-gray-800 mb-1">Create New Course</h4>
            <p className="text-sm text-gray-600">Add a new golf course to your profile</p>
          </button>
          <button
            onClick={() => onNavigate?.('approvals')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
          >
            <h4 className="font-medium text-gray-800 mb-1">Review Requests</h4>
            <p className="text-sm text-gray-600">Approve or deny sponsorship requests</p>
          </button>
          <button
            onClick={() => onNavigate?.('outings')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
          >
            <h4 className="font-medium text-gray-800 mb-1">Create Outing</h4>
            <p className="text-sm text-gray-600">Set up a new outing event</p>
          </button>
        </div>
      </div>
    </div>
  );
}
