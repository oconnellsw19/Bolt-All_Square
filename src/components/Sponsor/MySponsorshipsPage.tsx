import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, Clock, XCircle, Calendar, MapPin, Tag, DollarSign, AlertCircle, Zap } from 'lucide-react';

interface Sponsorship {
  id: string;
  start_date: string;
  end_date: string;
  duration_type: string;
  total_amount: number;
  status: string;
  payment_status: string;
  artwork_status: string;
  approval_message: string | null;
  created_at: string;
  approved_at: string | null;
  holes: {
    hole_number: number;
    hole_name: string | null;
    courses: {
      name: string;
      city: string;
      state: string;
    };
  };
  advertisement_types: {
    name: string;
    dimensions: string;
  };
}

type DisplayStatus = 'pending' | 'approved' | 'active' | 'completed' | 'denied' | 'cancelled';

function getDisplayStatus(s: Sponsorship): DisplayStatus {
  if (s.status === 'pending') return 'pending';
  if (s.status === 'denied') return 'denied';
  if (s.status === 'cancelled') return 'cancelled';

  if (s.status === 'approved' || s.status === 'active' || s.status === 'completed') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);

    if (today > end) return 'completed';
    if (today >= start) return 'active';
    return 'approved';
  }

  return 'pending';
}

const STATUS_CONFIG: Record<DisplayStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending Review', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
  active: { label: 'Active', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Zap },
  completed: { label: 'Completed / Expired', color: 'text-gray-700 bg-gray-50 border-gray-200', icon: CheckCircle },
  denied: { label: 'Denied', color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: XCircle },
};

const FILTER_TABS: { key: 'all' | DisplayStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed / Expired' },
];

const ARTWORK_STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting Artwork',
  submitted: 'Artwork Submitted',
  approved: 'Artwork Approved',
  in_production: 'In Production',
  shipped: 'Shipped',
  delivered: 'Delivered',
  installed: 'Installed',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface MySponsorshipsPageProps {
  initialFilter?: 'all' | DisplayStatus;
}

export function MySponsorshipsPage({ initialFilter = 'all' }: MySponsorshipsPageProps) {
  const { profile } = useAuth();
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | DisplayStatus>(initialFilter);

  useEffect(() => {
    loadSponsorships();
  }, [profile]);

  const loadSponsorships = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sponsorships')
        .select(`
          id, start_date, end_date, duration_type, total_amount,
          status, payment_status, artwork_status, approval_message,
          created_at, approved_at,
          holes (
            hole_number, hole_name,
            courses ( name, city, state )
          ),
          advertisement_types ( name, dimensions )
        `)
        .eq('sponsor_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSponsorships((data as unknown as Sponsorship[]) || []);
    } catch (err) {
      console.error('Error loading sponsorships:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sponsorships.filter((s) => {
    if (filter === 'all') return true;
    return getDisplayStatus(s) === filter;
  });

  const counts: Record<'all' | DisplayStatus, number> = {
    all: sponsorships.length,
    approved: sponsorships.filter((s) => getDisplayStatus(s) === 'approved').length,
    active: sponsorships.filter((s) => getDisplayStatus(s) === 'active').length,
    pending: sponsorships.filter((s) => getDisplayStatus(s) === 'pending').length,
    completed: sponsorships.filter((s) => getDisplayStatus(s) === 'completed').length,
    denied: sponsorships.filter((s) => getDisplayStatus(s) === 'denied').length,
    cancelled: sponsorships.filter((s) => getDisplayStatus(s) === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading sponsorships...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">My Sponsorships</h2>
        <p className="text-gray-600">Track your sponsorship requests and active placements</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              filter === tab.key
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-amber-500 hover:text-amber-600'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                filter === tab.key ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {filter === 'all' ? 'No sponsorships yet' : `No ${filter} sponsorships`}
          </h3>
          <p className="text-gray-500 text-sm">
            {filter === 'all'
              ? 'Browse the marketplace to find sponsorship opportunities at golf courses near you.'
              : `You don't have any ${filter} sponsorships at this time.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => {
            const displayStatus = getDisplayStatus(s);
            const statusCfg = STATUS_CONFIG[displayStatus];
            const StatusIcon = statusCfg.icon;
            const showArtwork = displayStatus === 'approved' || displayStatus === 'active';
            return (
              <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {s.holes?.courses?.name}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
                        <MapPin size={13} />
                        <span>{s.holes?.courses?.city}, {s.holes?.courses?.state}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${statusCfg.color}`}>
                      <StatusIcon size={14} />
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Tag size={15} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Hole</p>
                        <p className="text-sm font-medium text-gray-800">
                          Hole {s.holes?.hole_number}
                          {s.holes?.hole_name ? ` – ${s.holes.hole_name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Tag size={15} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Ad Type</p>
                        <p className="text-sm font-medium text-gray-800">{s.advertisement_types?.name}</p>
                        <p className="text-xs text-gray-400">{s.advertisement_types?.dimensions}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar size={15} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-sm font-medium text-gray-800">{capitalize(s.duration_type)}</p>
                        <p className="text-xs text-gray-400">{formatDate(s.start_date)} – {formatDate(s.end_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <DollarSign size={15} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-sm font-medium text-gray-800">${Number(s.total_amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{capitalize(s.payment_status)}</p>
                      </div>
                    </div>
                  </div>

                  {showArtwork && s.artwork_status && (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Artwork Status</span>
                        <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                          {ARTWORK_STATUS_LABELS[s.artwork_status] || s.artwork_status}
                        </span>
                      </div>
                    </div>
                  )}

                  {s.approval_message && showArtwork && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Message from course manager</p>
                      <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        {s.approval_message}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Submitted {formatDate(s.created_at)}
                      {s.approved_at ? ` · Approved ${formatDate(s.approved_at)}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
