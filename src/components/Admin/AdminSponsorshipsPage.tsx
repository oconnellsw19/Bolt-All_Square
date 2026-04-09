import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Clock,
  Search,
  Filter,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';

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
  quantity: number | null;
  approval_message: string | null;
  denial_reason: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  company_name: string | null;
}

interface Course {
  id: string;
  name: string;
}

interface Hole {
  id: string;
  course_id: string;
  hole_number: number;
}

interface AdType {
  id: string;
  name: string;
}

type FilterType = 'all' | 'pending' | 'approved' | 'active' | 'denied' | 'completed' | 'cancelled';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'denied', label: 'Denied' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AdminSponsorshipsPage() {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [adTypes, setAdTypes] = useState<AdType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSponsorship, setSelectedSponsorship] = useState<Sponsorship | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        { data: sponsorshipsData },
        { data: profilesData },
        { data: coursesData },
        { data: holesData },
        { data: adTypesData },
      ] = await Promise.all([
        supabase.from('sponsorships').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, company_name'),
        supabase.from('courses').select('id, name'),
        supabase.from('holes').select('id, course_id, hole_number'),
        supabase.from('advertisement_types').select('id, name'),
      ]);

      setSponsorships(sponsorshipsData || []);
      setProfiles(profilesData || []);
      setCourses(coursesData || []);
      setHoles(holesData || []);
      setAdTypes(adTypesData || []);
    } catch (error) {
      console.error('Error loading sponsorships data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCourseForSponsorship = (s: Sponsorship) => {
    if (s.course_id) return courses.find((c) => c.id === s.course_id);
    if (s.hole_id) {
      const hole = holes.find((h) => h.id === s.hole_id);
      if (hole) return courses.find((c) => c.id === hole.course_id);
    }
    return null;
  };

  const getHoleForSponsorship = (s: Sponsorship) => {
    if (s.hole_id) return holes.find((h) => h.id === s.hole_id);
    return null;
  };

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    denied: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  const filteredSponsorships = sponsorships.filter((s) => {
    // Status filter
    if (filter !== 'all' && s.status !== filter) return false;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const sponsor = profiles.find((p) => p.id === s.sponsor_id);
      const course = getCourseForSponsorship(s);
      const adType = adTypes.find((a) => a.id === s.advertisement_type_id);

      return (
        sponsor?.full_name?.toLowerCase().includes(q) ||
        sponsor?.company_name?.toLowerCase().includes(q) ||
        course?.name?.toLowerCase().includes(q) ||
        adType?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const totalRevenue = filteredSponsorships.reduce(
    (sum, s) => sum + parseFloat(s.total_amount || '0'), 0
  );
  const allSquareRevenue = filteredSponsorships.reduce(
    (sum, s) => sum + parseFloat(s.allsquare_amount || '0'), 0
  );
  const pendingCount = sponsorships.filter((s) => s.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sponsorships...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">All Sponsorships</h2>
          <p className="text-gray-500 text-sm">
            {sponsorships.length} total sponsorships &middot; {pendingCount} pending review
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg">
            <DollarSign size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{fmt(totalRevenue)}</p>
            <p className="text-xs text-gray-500">
              {filter === 'all' ? 'Total' : FILTERS.find((f) => f.value === filter)?.label} Revenue
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-lg">
            <DollarSign size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-700">{fmt(allSquareRevenue)}</p>
            <p className="text-xs text-gray-500">All Square Revenue</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <div className="bg-yellow-100 p-3 rounded-lg">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{pendingCount}</p>
            <p className="text-xs text-gray-500">Awaiting Approval</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by sponsor, course, or ad type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-2 text-sm font-medium transition ${
                filter === value
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sponsorships Table */}
      {filteredSponsorships.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No sponsorships found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try a different search term' : `No ${filter === 'all' ? '' : filter + ' '}sponsorships`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Sponsor</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Course</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Ad Type</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Location</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Duration</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">AS Rev</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSponsorships.map((s) => {
                  const sponsor = profiles.find((p) => p.id === s.sponsor_id);
                  const course = getCourseForSponsorship(s);
                  const hole = getHoleForSponsorship(s);
                  const adType = adTypes.find((a) => a.id === s.advertisement_type_id);

                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800">
                          {sponsor?.company_name || sponsor?.full_name || 'Unknown'}
                        </p>
                        {sponsor?.company_name && (
                          <p className="text-xs text-gray-400">{sponsor.full_name}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{course?.name || '---'}</td>
                      <td className="py-3 px-4 text-gray-700">{adType?.name || '---'}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {hole ? `Hole ${hole.hole_number}` : 'Course-wide'}
                        {s.quantity && ` (${s.quantity} units)`}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <p className="capitalize">{s.duration_type}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' - '}
                          {new Date(s.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-800">
                        {fmt(parseFloat(s.total_amount || '0'))}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">
                        {fmt(parseFloat(s.allsquare_amount || '0'))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          statusColors[s.status] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {new Date(s.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedSponsorship(selectedSponsorship?.id === s.id ? null : s)}
                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                          title="View details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
            Showing {filteredSponsorships.length} of {sponsorships.length} sponsorships
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSponsorship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800">Sponsorship Details</h3>
              <button
                onClick={() => setSelectedSponsorship(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {(() => {
              const s = selectedSponsorship;
              const sponsor = profiles.find((p) => p.id === s.sponsor_id);
              const course = getCourseForSponsorship(s);
              const hole = getHoleForSponsorship(s);
              const adType = adTypes.find((a) => a.id === s.advertisement_type_id);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Sponsor</p>
                      <p className="font-medium text-gray-800">{sponsor?.company_name || sponsor?.full_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Course</p>
                      <p className="font-medium text-gray-800">{course?.name || '---'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ad Type</p>
                      <p className="font-medium text-gray-800">{adType?.name || '---'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-medium text-gray-800">
                        {hole ? `Hole ${hole.hole_number}` : 'Course-wide'}
                        {s.quantity && ` (${s.quantity} units)`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-medium text-gray-800 capitalize">{s.duration_type}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        statusColors[s.status] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Total Amount</p>
                      <p className="text-lg font-bold text-gray-800">{fmt(parseFloat(s.total_amount || '0'))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">All Square</p>
                      <p className="text-lg font-bold text-emerald-600">{fmt(parseFloat(s.allsquare_amount || '0'))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Course Payout</p>
                      <p className="text-lg font-bold text-blue-600">{fmt(parseFloat(s.course_amount || '0'))}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Payment Status</p>
                      <p className="font-medium text-gray-800 capitalize">{s.payment_status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="font-medium text-gray-800">
                        {new Date(s.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {s.approval_message && (
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-xs text-amber-600 font-medium mb-1">Approval Message</p>
                      <p className="text-sm text-amber-800">{s.approval_message}</p>
                    </div>
                  )}

                  {s.denial_reason && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-xs text-red-600 font-medium mb-1">Denial Reason</p>
                      <p className="text-sm text-red-800">{s.denial_reason}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedSponsorship(null)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
