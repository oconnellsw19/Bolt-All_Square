import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  DollarSign,
  TrendingUp,
  FileText,
  Building2,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  city: string;
  state: string;
  manager_id: string;
}

interface Sponsorship {
  id: string;
  sponsor_id: string;
  hole_id: string | null;
  course_id: string | null;
  advertisement_type_id: string;
  start_date: string;
  end_date: string;
  duration_type: string;
  total_amount: string;
  course_amount: string;
  allsquare_amount: string;
  status: string;
  payment_status: string;
  created_at: string;
}

interface AdType {
  id: string;
  name: string;
}

interface CourseRevenue {
  courseId: string;
  courseName: string;
  location: string;
  totalRevenue: number;
  allSquareRevenue: number;
  courseRevenue: number;
  sponsorshipCount: number;
}

interface AdTypeRevenue {
  adTypeId: string;
  adTypeName: string;
  totalRevenue: number;
  allSquareRevenue: number;
  sponsorshipCount: number;
}

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'all';

interface AdminDashboardProps {
  onNavigate?: (view: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [adTypes, setAdTypes] = useState<AdType[]>([]);
  const [holes, setHoles] = useState<{ id: string; course_id: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; role: string; full_name: string; company_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [
        { data: sponsorshipsData },
        { data: coursesData },
        { data: adTypesData },
        { data: holesData },
        { data: profilesData },
      ] = await Promise.all([
        supabase.from('sponsorships').select('*').order('created_at', { ascending: false }),
        supabase.from('courses').select('id, name, city, state, manager_id'),
        supabase.from('advertisement_types').select('id, name'),
        supabase.from('holes').select('id, course_id'),
        supabase.from('profiles').select('id, role, full_name, company_name'),
      ]);

      setSponsorships(sponsorshipsData || []);
      setCourses(coursesData || []);
      setAdTypes(adTypesData || []);
      setHoles(holesData || []);
      setProfiles(profilesData || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = (period: TimePeriod): Date | null => {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d;
      }
      case 'month': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        return d;
      }
      case 'year': {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 1);
        return d;
      }
      case 'all':
        return null;
    }
  };

  const filteredSponsorships = (() => {
    const dateFilter = getDateFilter(timePeriod);
    if (!dateFilter) return sponsorships;
    return sponsorships.filter((s) => new Date(s.created_at) >= dateFilter);
  })();

  // Get course ID from a sponsorship (via hole or direct course_id)
  const getCourseIdForSponsorship = (s: Sponsorship): string | null => {
    if (s.course_id) return s.course_id;
    if (s.hole_id) {
      const hole = holes.find((h) => h.id === s.hole_id);
      return hole?.course_id || null;
    }
    return null;
  };

  // Stats
  const totalRevenue = filteredSponsorships.reduce(
    (sum, s) => sum + parseFloat(s.total_amount || '0'),
    0
  );
  const allSquareRevenue = filteredSponsorships.reduce(
    (sum, s) => sum + parseFloat(s.allsquare_amount || '0'),
    0
  );
  const courseRevenueTotal = filteredSponsorships.reduce(
    (sum, s) => sum + parseFloat(s.course_amount || '0'),
    0
  );
  const pendingCount = filteredSponsorships.filter((s) => s.status === 'pending').length;
  const activeCount = filteredSponsorships.filter(
    (s) => s.status === 'active' || s.status === 'approved'
  ).length;
  const totalSponsors = new Set(profiles.filter((p) => p.role === 'sponsor').map((p) => p.id)).size;
  const totalCourses = courses.length;

  // Per-course revenue
  const courseRevenueBreakdown: CourseRevenue[] = courses
    .map((course) => {
      const courseSponsorships = filteredSponsorships.filter(
        (s) => getCourseIdForSponsorship(s) === course.id
      );
      return {
        courseId: course.id,
        courseName: course.name,
        location: [course.city, course.state].filter(Boolean).join(', '),
        totalRevenue: courseSponsorships.reduce(
          (sum, s) => sum + parseFloat(s.total_amount || '0'),
          0
        ),
        allSquareRevenue: courseSponsorships.reduce(
          (sum, s) => sum + parseFloat(s.allsquare_amount || '0'),
          0
        ),
        courseRevenue: courseSponsorships.reduce(
          (sum, s) => sum + parseFloat(s.course_amount || '0'),
          0
        ),
        sponsorshipCount: courseSponsorships.length,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Per ad-type revenue
  const adTypeRevenueBreakdown: AdTypeRevenue[] = adTypes
    .map((adType) => {
      const adSponsorships = filteredSponsorships.filter(
        (s) => s.advertisement_type_id === adType.id
      );
      return {
        adTypeId: adType.id,
        adTypeName: adType.name,
        totalRevenue: adSponsorships.reduce(
          (sum, s) => sum + parseFloat(s.total_amount || '0'),
          0
        ),
        allSquareRevenue: adSponsorships.reduce(
          (sum, s) => sum + parseFloat(s.allsquare_amount || '0'),
          0
        ),
        sponsorshipCount: adSponsorships.length,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Recent sponsorships
  const recentSponsorships = filteredSponsorships.slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  const periodLabels: Record<TimePeriod, string> = {
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    year: 'Last 12 Months',
    all: 'All Time',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
          <p className="text-gray-500 text-sm">Platform overview and revenue analytics</p>
        </div>
        <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {(Object.keys(periodLabels) as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-4 py-2 text-sm font-medium transition ${
                timePeriod === period
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {periodLabels[period]}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Revenue</span>
            <div className="bg-amber-50 p-2 rounded-lg">
              <DollarSign size={18} className="text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{fmt(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">{filteredSponsorships.length} sponsorships</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">All Square Revenue</span>
            <div className="bg-amber-50 p-2 rounded-lg">
              <TrendingUp size={18} className="text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600">{fmt(allSquareRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">Per-course platform fees</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Course Payouts</span>
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{fmt(courseRevenueTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">After platform fees</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Pending Approval</span>
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Clock size={18} className="text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
          <p className="text-xs text-gray-400 mt-1">{activeCount} active</p>
        </div>
      </div>

      {/* Platform Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-lg">
            <Building2 size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{totalCourses}</p>
            <p className="text-sm text-gray-500">Registered Courses</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <Users size={22} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{totalSponsors}</p>
            <p className="text-sm text-gray-500">Sponsors</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <div className="bg-cyan-100 p-3 rounded-lg">
            <FileText size={22} className="text-cyan-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{adTypes.length}</p>
            <p className="text-sm text-gray-500">Ad Types Available</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue by Course */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Revenue by Course</h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('courses')}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                View All
              </button>
            )}
          </div>
          {courseRevenueBreakdown.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No course data yet</p>
          ) : (
            <div className="space-y-3">
              {courseRevenueBreakdown.map((cr) => {
                const pct = totalRevenue > 0 ? (cr.totalRevenue / totalRevenue) * 100 : 0;
                return (
                  <div key={cr.courseId}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{cr.courseName}</p>
                        <p className="text-xs text-gray-400">{cr.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800 text-sm">{fmt(cr.totalRevenue)}</p>
                        <p className="text-xs text-amber-600">AS: {fmt(cr.allSquareRevenue)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-amber-500 rounded-full h-2 transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cr.sponsorshipCount} sponsorship{cr.sponsorshipCount !== 1 ? 's' : ''} &middot; {pct.toFixed(1)}% of total
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue by Ad Type */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Revenue by Ad Type</h3>
          </div>
          {adTypeRevenueBreakdown.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No ad type data yet</p>
          ) : (
            <div className="space-y-3">
              {adTypeRevenueBreakdown.map((ar) => {
                const pct = totalRevenue > 0 ? (ar.totalRevenue / totalRevenue) * 100 : 0;
                const colors = [
                  'bg-amber-500',
                  'bg-blue-500',
                  'bg-purple-500',
                  'bg-orange-500',
                  'bg-cyan-500',
                  'bg-pink-500',
                ];
                const colorIdx =
                  adTypeRevenueBreakdown.indexOf(ar) % colors.length;
                return (
                  <div key={ar.adTypeId}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-800 text-sm">{ar.adTypeName}</p>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800 text-sm">{fmt(ar.totalRevenue)}</p>
                        <p className="text-xs text-amber-600">AS: {fmt(ar.allSquareRevenue)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${colors[colorIdx]} rounded-full h-2 transition-all`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ar.sponsorshipCount} sponsorship{ar.sponsorshipCount !== 1 ? 's' : ''} &middot; {pct.toFixed(1)}% of total
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sponsorships */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Sponsorships</h3>
          {onNavigate && (
            <button
              onClick={() => onNavigate('sponsorships')}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              View All
            </button>
          )}
        </div>
        {recentSponsorships.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No sponsorships yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Sponsor</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Course</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Ad Type</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Duration</th>
                  <th className="text-right py-3 px-2 text-gray-500 font-medium">Total</th>
                  <th className="text-right py-3 px-2 text-gray-500 font-medium">AS Rev</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSponsorships.map((s) => {
                  const sponsor = profiles.find((p) => p.id === s.sponsor_id);
                  const courseId = getCourseIdForSponsorship(s);
                  const course = courses.find((c) => c.id === courseId);
                  const adType = adTypes.find((a) => a.id === s.advertisement_type_id);
                  const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-100 text-yellow-700',
                    approved: 'bg-blue-100 text-blue-700',
                    active: 'bg-green-100 text-green-700',
                    completed: 'bg-gray-100 text-gray-700',
                    denied: 'bg-red-100 text-red-700',
                    cancelled: 'bg-gray-100 text-gray-500',
                  };

                  return (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <p className="font-medium text-gray-800">
                          {sponsor?.company_name || sponsor?.full_name || 'Unknown'}
                        </p>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{course?.name || '—'}</td>
                      <td className="py-3 px-2 text-gray-600">{adType?.name || '—'}</td>
                      <td className="py-3 px-2 text-gray-600 capitalize">{s.duration_type}</td>
                      <td className="py-3 px-2 text-right font-medium text-gray-800">
                        {fmt(parseFloat(s.total_amount || '0'))}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-amber-600">
                        {fmt(parseFloat(s.allsquare_amount || '0'))}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            statusColors[s.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-500 text-xs">
                        {new Date(s.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
