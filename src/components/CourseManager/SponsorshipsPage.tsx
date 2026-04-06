import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

interface Sponsorship {
  id: string;
  sponsor_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
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

type FilterType = 'all' | 'pending' | 'approved_inactive' | 'active' | 'expired';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
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

      if (courseIds.length > 0) {
        const { data: holes } = await supabase
          .from('holes')
          .select('id')
          .in('course_id', courseIds);

        const holeIds = holes?.map((h) => h.id) || [];

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
          setSponsorships(data || []);
        }
      }
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

  const now = new Date();

  const isActive = (s: Sponsorship) => {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    return s.status === 'approved' && start <= now && end >= now;
  };

  const isExpired = (s: Sponsorship) => {
    const end = new Date(s.end_date);
    return s.status === 'approved' && end < now;
  };

  const isApprovedInactive = (s: Sponsorship) => {
    return s.status === 'approved' && !isActive(s) && !isExpired(s);
  };

  const filteredSponsorships = sponsorships.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'active') return isActive(s);
    if (filter === 'expired') return isExpired(s);
    if (filter === 'approved_inactive') return isApprovedInactive(s);
    return s.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sponsorships...</div>
      </div>
    );
  }

  const getDisplayStatus = (s: Sponsorship): { label: string; className: string } => {
    if (isActive(s)) return { label: 'Active', className: 'bg-blue-100 text-blue-800' };
    if (isExpired(s)) return { label: 'Expired', className: 'bg-orange-100 text-orange-800' };
    if (isApprovedInactive(s)) return { label: 'Approved / Inactive', className: 'bg-green-100 text-green-700' };

    const map: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sponsorships</h2>
        <div className="flex gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-lg transition text-sm ${
                filter === value
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
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
              : `No ${getFilterLabel(filter).toLowerCase()} sponsorships`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sponsor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course & Hole
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advertisement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSponsorships.map((sponsorship) => (
                <tr key={sponsorship.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {sponsorship.profiles?.full_name || 'Unknown'}
                    </div>
                    {sponsorship.profiles?.company_name && (
                      <div className="text-sm text-gray-500">
                        {sponsorship.profiles.company_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {sponsorship.holes?.courses?.name || 'Unknown Course'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Hole {sponsorship.holes?.hole_number || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sponsorship.advertisement_types?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sponsorship.start_date).toLocaleDateString()} -{' '}
                    {new Date(sponsorship.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${sponsorship.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(sponsorship)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {sponsorship.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(sponsorship.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
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
