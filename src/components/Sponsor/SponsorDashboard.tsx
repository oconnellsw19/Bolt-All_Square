import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Clock, CheckCircle, DollarSign } from 'lucide-react';

interface SponsorDashboardProps {
  onNavigate?: (view: string, filter?: string) => void;
}

interface DashboardStats {
  activeSponsorships: number;
  pendingSponsorships: number;
  completedSponsorships: number;
  totalSpent: number;
}

export function SponsorDashboard({ onNavigate }: SponsorDashboardProps) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeSponsorships: 0,
    pendingSponsorships: 0,
    completedSponsorships: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      const { data: sponsorships } = await supabase
        .from('sponsorships')
        .select('*')
        .eq('sponsor_id', profile.id);

      const active = sponsorships?.filter((s) => s.status === 'active').length || 0;
      const pending = sponsorships?.filter((s) => s.status === 'pending').length || 0;
      const completed = sponsorships?.filter((s) => s.status === 'completed').length || 0;
      const spent =
        sponsorships
          ?.filter((s) => s.payment_status === 'captured')
          .reduce((sum, s) => sum + parseFloat(s.total_amount || '0'), 0) || 0;

      setStats({
        activeSponsorships: active,
        pendingSponsorships: pending,
        completedSponsorships: completed,
        totalSpent: spent,
      });
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
      label: 'Active Sponsorships',
      value: stats.activeSponsorships,
      icon: CheckCircle,
      color: 'bg-amber-500',
      filter: 'active',
    },
    {
      label: 'Pending Approval',
      value: stats.pendingSponsorships,
      icon: Clock,
      color: 'bg-yellow-500',
      filter: 'pending',
    },
    {
      label: 'Completed',
      value: stats.completedSponsorships,
      icon: FileText,
      color: 'bg-blue-500',
      filter: 'completed',
    },
    {
      label: 'Total Spent',
      value: `$${stats.totalSpent.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-amber-600',
      filter: 'all',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Sponsor Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <button
              key={index}
              onClick={() => onNavigate?.('my-sponsorships', stat.filter)}
              className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow cursor-pointer w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate?.('marketplace')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition text-left"
          >
            <h4 className="font-medium text-gray-800 mb-1">Find Golf Courses</h4>
            <p className="text-sm text-gray-600">Browse available sponsorship opportunities</p>
          </button>
          <button
            onClick={() => onNavigate?.('my-sponsorships')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition text-left"
          >
            <h4 className="font-medium text-gray-800 mb-1">View My Sponsorships</h4>
            <p className="text-sm text-gray-600">Manage your active and pending sponsorships</p>
          </button>
        </div>
      </div>
    </div>
  );
}
