import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, TrendingUp, Calendar, MapPin, Clock, ArrowRight } from 'lucide-react';

interface Sponsorship {
  id: string;
  sponsor_id: string;
  hole_id: string | null;
  course_id: string | null;
  start_date: string;
  end_date: string;
  total_amount: string;
  course_amount: string;
  status: string;
  upcoming_dismissed: boolean;
  advertisement_type_id: string;
}

interface AdType {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
  company_name: string | null;
}

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
  const [upcomingSponsorships, setUpcomingSponsorships] = useState<Sponsorship[]>([]);
  const [adTypes, setAdTypes] = useState<AdType[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
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

      // Load ad types and profiles for upcoming widget
      const [{ data: adTypesData }, { data: profilesData }] = await Promise.all([
        supabase.from('advertisement_types').select('id, name'),
        supabase.from('profiles').select('id, full_name, company_name'),
      ]);
      setAdTypes(adTypesData || []);
      setProfiles(profilesData || []);

      if (courseIds.length > 0) {
        const { data: holes } = await supabase
          .from('holes')
          .select('id, course_id')
          .in('course_id', courseIds);

        const holeIds = holes?.map((h) => h.id) || [];

        // Fetch hole-level sponsorships
        let holeSponsorships: Sponsorship[] = [];
        if (holeIds.length > 0) {
          const { data } = await supabase
            .from('sponsorships')
            .select('*')
            .in('hole_id', holeIds);
          holeSponsorships = data || [];
        }

        // Fetch course-level sponsorships
        const { data: courseSpons } = await supabase
          .from('sponsorships')
          .select('*')
          .in('course_id', courseIds)
          .is('hole_id', null);

        const allSponsorships = [...holeSponsorships, ...(courseSpons || [])];

        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const active = allSponsorships.filter((s) => {
          const start = new Date(s.start_date);
          const end = new Date(s.end_date);
          return (s.status === 'approved' || s.status === 'active') && start <= now && end >= now;
        }).length;

        const pending = allSponsorships.filter((s) => s.status === 'pending').length;

        const revenue = allSponsorships
          .filter((s) => {
            if (s.status === 'completed') return true;
            const start = new Date(s.start_date);
            const end = new Date(s.end_date);
            return (s.status === 'approved' || s.status === 'active') && start <= now && end >= now;
          })
          .reduce((sum, s) => sum + parseFloat(s.course_amount || '0'), 0);

        // Get upcoming sponsorships (starting within 7 days, not dismissed)
        const upcoming = allSponsorships
          .filter((s) => {
            const start = new Date(s.start_date);
            return (
              (s.status === 'approved' || s.status === 'active') &&
              start > now &&
              start <= oneWeekFromNow &&
              !s.upcoming_dismissed
            );
          })
          .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

        setUpcomingSponsorships(upcoming);

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

  const getDaysUntilStart = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const diffMs = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const handleDismissUpcoming = async (sponsorshipId: string) => {
    try {
      const { error } = await supabase
        .from('sponsorships')
        .update({ upcoming_dismissed: true })
        .eq('id', sponsorshipId);

      if (error) throw error;
      setUpcomingSponsorships((prev) => prev.filter((s) => s.id !== sponsorshipId));
    } catch (error) {
      console.error('Error dismissing upcoming sponsorship:', error);
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
      color: 'bg-amber-500',
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
      color: 'bg-amber-600',
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
                    <p className="text-xs text-amber-600 mt-1 font-medium">View all →</p>
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

      {/* Upcoming Sponsorships Widget */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Clock size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Upcoming Sponsorships</h3>
              <p className="text-xs text-gray-500">Starting within the next 7 days</p>
            </div>
          </div>
          {upcomingSponsorships.length > 0 && (
            <button
              onClick={() => onNavigate?.('sponsorships')}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          )}
        </div>

        {upcomingSponsorships.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm">No sponsorships starting within the next 7 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSponsorships.slice(0, 5).map((s) => {
              const adType = adTypes.find((a) => a.id === s.advertisement_type_id);
              const sponsor = profiles.find((p) => p.id === s.sponsor_id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-bold text-purple-700">
                        {getDaysUntilStart(s.start_date)}
                      </p>
                      <p className="text-xs text-purple-500">
                        {new Date(s.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {sponsor?.company_name || sponsor?.full_name || 'Unknown'}{' '}
                        <span className="text-gray-500 font-normal">— {adType?.name || 'Unknown'}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {s.hole_id ? 'Hole sponsorship' : 'Course-wide'} &middot; ${parseFloat(s.total_amount || '0').toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismissUpcoming(s.id)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                    title="Mark as handled — removes from upcoming list but keeps sponsorship active"
                  >
                    Mark Handled
                  </button>
                </div>
              );
            })}
            {upcomingSponsorships.length > 5 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                +{upcomingSponsorships.length - 5} more upcoming
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate?.('courses')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition text-left"
          >
            <h4 className="font-medium text-gray-800 mb-1">Create New Course</h4>
            <p className="text-sm text-gray-600">Add a new golf course to your profile</p>
          </button>
          <button
            onClick={() => onNavigate?.('approvals')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition text-left"
          >
            <h4 className="font-medium text-gray-800 mb-1">Review Requests</h4>
            <p className="text-sm text-gray-600">Approve or deny sponsorship requests</p>
          </button>
          <button
            onClick={() => onNavigate?.('outings')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition text-left"
          >
            <h4 className="font-medium text-gray-800 mb-1">Create Outing</h4>
            <p className="text-sm text-gray-600">Set up a new outing event</p>
          </button>
        </div>
      </div>
    </div>
  );
}
