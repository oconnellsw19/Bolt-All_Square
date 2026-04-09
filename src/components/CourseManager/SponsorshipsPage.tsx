import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Eye, CheckSquare } from 'lucide-react';

interface Sponsorship {
  id: string;
  sponsor_id: string;
  hole_id: string | null;
  course_id: string | null;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  upcoming_dismissed: boolean;
  created_at: string;
  holes: {
    hole_number: number;
    course_id: string;
    courses: {
      name: string;
    };
  } | null;
  advertisement_types: {
    name: string;
  } | null;
  profiles: {
    full_name: string;
    company_name: string;
  } | null;
}

type FilterType = 'all' | 'pending' | 'upcoming' | 'approved_inactive' | 'active' | 'expired';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'approved_inactive', label: 'Approved Inactive' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

export function SponsorshipsPage() {
  const { profile } = useAuth();
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadSponsorships();
  }, [profile]);

  const loadSponsorships = async () => {
    if (!profile) return;

    try {
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('manager_id', profile.id);

      const courseIds = courses?.map((c) => c.id) || [];

      if (courseIds.length === 0) {
        setSponsorships([]);
        setLoading(false);
        return;
      }

      const { data: holes } = await supabase
        .from('holes')
        .select('id')
        .in('course_id', courseIds);

      const holeIds = holes?.map((h) => h.id) || [];

      // Fetch hole-level sponsorships
      let holeSponsorships: Sponsorship[] = [];
      if (holeIds.length > 0) {
        const { data, error } = await supabase
          .from('sponsorships')
          .select(`
            *,
            holes:holes!sponsorships_hole_id_fkey(
              hole_number,
              course_id,
              courses(name)
            ),
            advertisement_types:advertisement_types!sponsorships_advertisement_type_id_fkey(name),
            profiles:profiles!sponsorships_sponsor_id_fkey(full_name, company_name)
          `)
          .in('hole_id', holeIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        holeSponsorships = data || [];
      }

      // Fetch course-level sponsorships (hole_id is null, course_id is set)
      let courseSponsorships: Sponsorship[] = [];
      const { data: courseData, error: courseError } = await supabase
        .from('sponsorships')
        .select(`
          *,
          advertisement_types:advertisement_types!sponsorships_advertisement_type_id_fkey(name),
          profiles:profiles!sponsorships_sponsor_id_fkey(full_name, company_name)
        `)
        .in('course_id', courseIds)
        .is('hole_id', null)
        .order('created_at', { ascending: false });

      if (courseError) throw courseError;
      courseSponsorships = (courseData || []).map((s) => ({ ...s, holes: null }));

      // Merge and sort by created_at descending
      const all = [...holeSponsorships, ...courseSponsorships].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setSponsorships(all);
    } catch (error) {
      console.error('Error loading sponsorships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sponsorshipId: string) => {
    try {
      const { error } = await supabase
        .from('sponsorships')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', sponsorshipId);

      if (error) throw error;
      loadSponsorships();
    } catch (error) {
      console.error('Error approving sponsorship:', error);
    }
  };

  const handleDeny = async (sponsorshipId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('sponsorships')
        .update({
          status: 'denied',
          denied_at: new Date().toISOString(),
          denial_reason: reason,
        })
        .eq('id', sponsorshipId);

      if (error) throw error;
      loadSponsorships();
    } catch (error) {
      console.error('Error denying sponsorship:', error);
    }
  };

  const handleDismissUpcoming = async (sponsorshipId: string) => {
    try {
      const { error } = await supabase
        .from('sponsorships')
        .update({ upcoming_dismissed: true })
        .eq('id', sponsorshipId);

      if (error) throw error;
      setSponsorships((prev) =>
        prev.map((s) => (s.id === sponsorshipId ? { ...s, upcoming_dismissed: true } : s))
      );
    } catch (error) {
      console.error('Error dismissing upcoming sponsorship:', error);
    }
  };

  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const isUpcoming = (s: Sponsorship) => {
    const start = new Date(s.start_date);
    return (
      (s.status === 'approved' || s.status === 'active') &&
      start > now &&
      start <= oneWeekFromNow &&
      !s.upcoming_dismissed
    );
  };

  const isActive = (s: Sponsorship) => {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    return (s.status === 'approved' || s.status === 'active') && start <= now && end >= now;
  };

  const isExpired = (s: Sponsorship) => {
    const end = new Date(s.end_date);
    return (s.status === 'approved' || s.status === 'active') && end < now;
  };

  const isApprovedInactive = (s: Sponsorship) => {
    return (s.status === 'approved' || s.status === 'active') && !isActive(s) && !isExpired(s) && !isUpcoming(s);
  };

  const filteredSponsorships = sponsorships.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return isUpcoming(s);
    if (filter === 'active') return isActive(s);
    if (filter === 'expired') return isExpired(s);
    if (filter === 'approved_inactive') return isApprovedInactive(s);
    return s.status === filter;
  });

  // Sort upcoming by start_date ascending (soonest first)
  if (filter === 'upcoming') {
    filteredSponsorships.sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
  }

  const upcomingCount = sponsorships.filter(isUpcoming).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sponsorships...</div>
      </div>
    );
  }

  const getDisplayStatus = (s: Sponsorship): { label: string; className: string } => {
    if (isActive(s)) return { label: 'Active', className: 'bg-green-100 text-green-800' };
    if (isUpcoming(s)) return { label: 'Upcoming', className: 'bg-purple-100 text-purple-800' };
    if (isExpired(s)) return { label: 'Expired', className: 'bg-orange-100 text-orange-800' };
    if (isApprovedInactive(s)) return { label: 'Approved / Inactive', className: 'bg-blue-100 text-blue-700' };

    const map: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      denied: { label: 'Denied', className: 'bg-red-100 text-red-800' },
      completed: { label: 'Completed', className: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
    };

    return map[s.status] || { label: s.status.charAt(0).toUpperCase() + s.status.slice(1), className: 'bg-gray-100 text-gray-800' };
  };

  const getStatusBadge = (sponsorship: Sponsorship) => {
    const { label, className } = getDisplayStatus(sponsorship);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  const getFilterLabel = (f: FilterType) => {
    const match = FILTERS.find((x) => x.value === f);
    return match ? match.label : f;
  };

  const getDaysUntilStart = (startDate: string) => {
    const start = new Date(startDate);
    const diffMs = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sponsorships</h2>
        <div className="flex gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-lg transition text-sm relative ${
                filter === value
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
              {value === 'upcoming' && upcomingCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                  filter === 'upcoming' ? 'bg-white text-amber-600' : 'bg-purple-600 text-white'
                }`}>
                  {upcomingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filteredSponsorships.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Clock size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No sponsorships found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'No sponsorship requests yet'
              : filter === 'upcoming'
              ? 'No sponsorships starting within the next 7 days'
              : `No ${getFilterLabel(filter).toLowerCase()} sponsorships`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filter === 'upcoming' && (
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
              <p className="text-sm text-purple-700">
                Showing sponsorships starting within the next 7 days. Mark as handled to remove from this list.
              </p>
            </div>
          )}
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sponsor
                </th>
                <th className="w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course & Hole
                </th>
                <th className="w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advertisement
                </th>
                <th className="w-[20%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {filter === 'upcoming' ? 'Starts' : 'Duration'}
                </th>
                <th className="w-[10%] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="w-[12%] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-[12%] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSponsorships.map((sponsorship) => (
                <tr key={sponsorship.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {sponsorship.profiles?.company_name || sponsorship.profiles?.full_name || 'Unknown'}
                    </div>
                    {sponsorship.profiles?.company_name && sponsorship.profiles?.full_name && (
                      <div className="text-xs text-gray-500 truncate">
                        {sponsorship.profiles.full_name}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-900 truncate">
                      {sponsorship.holes?.courses?.name || 'Course-wide'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {sponsorship.holes ? `Hole ${sponsorship.holes.hole_number}` : 'All holes'}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-900 truncate">
                    {sponsorship.advertisement_types?.name || 'Unknown'}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-900">
                    {filter === 'upcoming' ? (
                      <div>
                        <p className="font-medium text-purple-700">{getDaysUntilStart(sponsorship.start_date)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(sponsorship.start_date).toLocaleDateString()} - {new Date(sponsorship.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <>
                        {new Date(sponsorship.start_date).toLocaleDateString()} -{' '}
                        {new Date(sponsorship.end_date).toLocaleDateString()}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 text-right">
                    ${sponsorship.total_amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {getStatusBadge(sponsorship)}
                  </td>
                  <td className="px-3 py-3 text-center text-sm">
                    {filter === 'upcoming' ? (
                      <button
                        onClick={() => handleDismissUpcoming(sponsorship.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                        title="Mark as handled — removes from upcoming list but keeps sponsorship active"
                      >
                        Mark Handled
                      </button>
                    ) : sponsorship.status === 'pending' ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleApprove(sponsorship.id)}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                          title="Approve"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => handleDeny(sponsorship.id, 'Denied by course manager')}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Deny"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    ) : (
                      <button className="p-1 text-gray-600 hover:bg-gray-50 rounded" title="View details">
                        <Eye size={20} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
