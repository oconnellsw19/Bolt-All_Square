import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Package, TrendingUp, FileText } from 'lucide-react';

interface DashboardStats {
  totalSponsorships: number;
  awaitingProduction: number;
  totalRevenue: number;
  allSquareRevenue: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSponsorships: 0,
    awaitingProduction: 0,
    totalRevenue: 0,
    allSquareRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: sponsorships } = await supabase
        .from('sponsorships')
        .select('*');

      const awaitingProduction = sponsorships?.filter(
        (s) => s.status === 'approved' && s.artwork_status === 'approved'
      ).length || 0;

      const totalRevenue =
        sponsorships
          ?.filter((s) => s.payment_status === 'captured')
          .reduce((sum, s) => sum + parseFloat(s.total_amount || '0'), 0) || 0;

      const allSquareRevenue =
        sponsorships
          ?.filter((s) => s.payment_status === 'captured')
          .reduce((sum, s) => sum + parseFloat(s.allsquare_amount || '0'), 0) || 0;

      setStats({
        totalSponsorships: sponsorships?.length || 0,
        awaitingProduction,
        totalRevenue,
        allSquareRevenue,
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
      label: 'Total Sponsorships',
      value: stats.totalSponsorships,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      label: 'Awaiting Production',
      value: stats.awaitingProduction,
      icon: Package,
      color: 'bg-yellow-500',
    },
    {
      label: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-600',
    },
    {
      label: 'All Square Revenue (25%)',
      value: `$${stats.allSquareRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-green-700',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
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
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left">
            <h4 className="font-medium text-gray-800 mb-1">Review Artwork</h4>
            <p className="text-sm text-gray-600">Approve artwork submissions</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left">
            <h4 className="font-medium text-gray-800 mb-1">Manage Production</h4>
            <p className="text-sm text-gray-600">Track advertisement production status</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left">
            <h4 className="font-medium text-gray-800 mb-1">View All Sponsorships</h4>
            <p className="text-sm text-gray-600">Manage all sponsorship requests</p>
          </button>
        </div>
      </div>
    </div>
  );
}
