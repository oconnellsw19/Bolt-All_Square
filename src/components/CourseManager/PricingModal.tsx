import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, DollarSign } from 'lucide-react';

interface Hole {
  id: string;
  hole_number: number;
}

interface AdvertisementType {
  id: string;
  name: string;
}

interface PricingModalProps {
  courseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface PricingData {
  hole_id: string;
  advertisement_type_id: string;
  daily_price: number;
  weekly_price: number;
  monthly_price: number;
  annual_price: number;
}

export function PricingModal({ courseId, onClose, onSuccess }: PricingModalProps) {
  const [holes, setHoles] = useState<Hole[]>([]);
  const [adTypes, setAdTypes] = useState<AdvertisementType[]>([]);
  const [selectedHole, setSelectedHole] = useState<string>('');
  const [selectedAdType, setSelectedAdType] = useState<string>('');
  const [pricing, setPricing] = useState<PricingData>({
    hole_id: '',
    advertisement_type_id: '',
    daily_price: 50,
    weekly_price: 300,
    monthly_price: 1000,
    annual_price: 10000,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [courseId]);

  useEffect(() => {
    if (selectedHole && selectedAdType) {
      loadExistingPricing();
    }
  }, [selectedHole, selectedAdType]);

  const loadData = async () => {
    try {
      const { data: holesData } = await supabase
        .from('holes')
        .select('id, hole_number')
        .eq('course_id', courseId)
        .order('hole_number');

      setHoles(holesData || []);

      const { data: courseAdTypes } = await supabase
        .from('course_advertisement_types')
        .select('advertisement_type_id')
        .eq('course_id', courseId);

      const adTypeIds = courseAdTypes?.map((cat) => cat.advertisement_type_id) || [];

      if (adTypeIds.length > 0) {
        const { data: adTypesData } = await supabase
          .from('advertisement_types')
          .select('id, name')
          .in('id', adTypeIds);

        setAdTypes(adTypesData || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const loadExistingPricing = async () => {
    try {
      const { data } = await supabase
        .from('pricing')
        .select('*')
        .eq('hole_id', selectedHole)
        .eq('advertisement_type_id', selectedAdType)
        .maybeSingle();

      if (data) {
        setPricing({
          hole_id: data.hole_id,
          advertisement_type_id: data.advertisement_type_id,
          daily_price: parseFloat(data.daily_price),
          weekly_price: parseFloat(data.weekly_price),
          monthly_price: parseFloat(data.monthly_price),
          annual_price: parseFloat(data.annual_price),
        });
      } else {
        setPricing({
          hole_id: selectedHole,
          advertisement_type_id: selectedAdType,
          daily_price: 50,
          weekly_price: 300,
          monthly_price: 1000,
          annual_price: 10000,
        });
      }
    } catch (err) {
      console.error('Error loading pricing:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: upsertError } = await supabase
        .from('pricing')
        .upsert({
          hole_id: selectedHole,
          advertisement_type_id: selectedAdType,
          daily_price: pricing.daily_price,
          weekly_price: pricing.weekly_price,
          monthly_price: pricing.monthly_price,
          annual_price: pricing.annual_price,
        });

      if (upsertError) throw upsertError;

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save pricing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">Configure Sponsorship Pricing</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Hole
              </label>
              <select
                value={selectedHole}
                onChange={(e) => setSelectedHole(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Choose a hole</option>
                {holes.map((hole) => (
                  <option key={hole.id} value={hole.id}>
                    Hole {hole.hole_number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advertisement Type
              </label>
              <select
                value={selectedAdType}
                onChange={(e) => setSelectedAdType(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Choose type</option>
                {adTypes.map((adType) => (
                  <option key={adType.id} value={adType.id}>
                    {adType.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedHole && selectedAdType && (
            <div className="space-y-4 pt-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <DollarSign size={20} />
                  Set Pricing Tiers
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Define pricing for different sponsorship durations. You receive 75% of each payment.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Daily Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing.daily_price}
                      onChange={(e) =>
                        setPricing({ ...pricing, daily_price: parseFloat(e.target.value) || 0 })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You earn: ${((pricing.daily_price || 0) * 0.75).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weekly Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing.weekly_price}
                      onChange={(e) =>
                        setPricing({ ...pricing, weekly_price: parseFloat(e.target.value) || 0 })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You earn: ${((pricing.weekly_price || 0) * 0.75).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing.monthly_price}
                      onChange={(e) =>
                        setPricing({ ...pricing, monthly_price: parseFloat(e.target.value) || 0 })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You earn: ${((pricing.monthly_price || 0) * 0.75).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Annual Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing.annual_price}
                      onChange={(e) =>
                        setPricing({ ...pricing, annual_price: parseFloat(e.target.value) || 0 })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You earn: ${((pricing.annual_price || 0) * 0.75).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedHole || !selectedAdType}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Pricing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
