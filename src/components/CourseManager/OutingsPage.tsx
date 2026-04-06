import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar, Users } from 'lucide-react';
import { CreateOutingModal } from './CreateOutingModal';

interface Outing {
  id: string;
  name: string;
  description: string;
  event_date: string;
  registration_fee: number;
  registration_link: string;
  max_participants: number;
  courses: {
    name: string;
  };
  registrations?: { count: number }[];
}

export function OutingsPage() {
  const { profile } = useAuth();
  const [outings, setOutings] = useState<Outing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadOutings();
  }, [profile]);

  const loadOutings = async () => {
    if (!profile) return;

    try {
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('manager_id', profile.id);

      const courseIds = courses?.map((c) => c.id) || [];

      if (courseIds.length > 0) {
        const { data, error } = await supabase
          .from('outings')
          .select(`
            *,
            courses(name)
          `)
          .in('course_id', courseIds)
          .order('event_date', { ascending: true });

        if (error) throw error;

        const outingsWithCounts = await Promise.all(
          (data || []).map(async (outing) => {
            const { count } = await supabase
              .from('outing_registrations')
              .select('*', { count: 'exact', head: true })
              .eq('outing_id', outing.id);

            return { ...outing, registrationCount: count || 0 };
          })
        );

        setOutings(outingsWithCounts);
      }
    } catch (error) {
      console.error('Error loading outings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOutingCreated = () => {
    setShowCreateModal(false);
    loadOutings();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading outings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Outing Events</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <Plus size={20} />
          Create Outing
        </button>
      </div>

      {outings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No outings yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first outing event to start accepting registrations
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Create Your First Outing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outings.map((outing: any) => (
            <div key={outing.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="h-32 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <Calendar size={64} className="text-white opacity-50" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{outing.name}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {outing.courses.name}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    <span>{new Date(outing.event_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users size={16} />
                    <span>
                      {outing.registrationCount} registered
                      {outing.max_participants && ` / ${outing.max_participants} max`}
                    </span>
                  </div>
                  {outing.registration_fee > 0 && (
                    <div className="text-sm text-gray-600">
                      Fee: ${outing.registration_fee.toFixed(2)}
                    </div>
                  )}
                </div>
                {outing.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {outing.description}
                  </p>
                )}
                <button className="w-full border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateOutingModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleOutingCreated}
        />
      )}
    </div>
  );
}
