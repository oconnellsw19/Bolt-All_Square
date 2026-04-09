import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, DollarSign, Plus, Trash2 } from 'lucide-react';

interface Hole {
  id: string;
  hole_number: number;
}

interface AdvertisementType {
  id: string;
  name: string;
  is_hole_specific: boolean;
  has_quantity_pricing: boolean;
}

interface PricingModalProps {
  courseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface PricingData {
  hole_id: string | null;
  course_id: string | null;
  advertisement_type_id: string;
  daily_price: number;
  weekly_price: number;
  monthly_price: number;
  annual_price: number;
}

interface QuantityTier {
  id?: string;
  tier_name: string;
  quantity: number;
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
    hole_id: null,
    course_id: null,
    advertisement_type_id: '',
    daily_price: 50,
    weekly_price: 300,
    monthly_price: 1000,
    annual_price: 10000,
  });
  const [quantityTiers, setQuantityTiers] = useState<QuantityTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(30);

  // Load course-specific platform fee
  useEffect(() => {
    const loadFee = async () => {
      const { data } = await supabase
        .from('courses')
        .select('platform_fee_percent')
        .eq('id', courseId)
        .single();
      if (data?.platform_fee_percent != null) {
        setPlatformFeePercent(data.platform_fee_percent);
      }
    };
    loadFee();
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const selectedAdTypeObj = adTypes.find((at) => at.id === selectedAdType);
  const isCourseLevel = selectedAdTypeObj && !selectedAdTypeObj.is_hole_specific;
  const hasQuantityPricing = selectedAdTypeObj?.has_quantity_pricing || false;

  useEffect(() => {
    if (selectedAdType) {
      if (hasQuantityPricing) {
        loadQuantityTiers();
      } else if (selectedHole || isCourseLevel) {
        loadExistingPricing();
      }
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
          .select('id, name, is_hole_specific, has_quantity_pricing')
          .in('id', adTypeIds);

        setAdTypes(adTypesData || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const loadExistingPricing = async () => {
    try {
      let query = supabase
        .from('pricing')
        .select('*')
        .eq('advertisement_type_id', selectedAdType);

      if (isCourseLevel) {
        query = query.eq('course_id', courseId).is('hole_id', null);
      } else {
        query = query.eq('hole_id', selectedHole);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        setPricing({
          hole_id: data.hole_id,
          course_id: data.course_id,
          advertisement_type_id: data.advertisement_type_id,
          daily_price: parseFloat(data.daily_price),
          weekly_price: parseFloat(data.weekly_price),
          monthly_price: parseFloat(data.monthly_price),
          annual_price: parseFloat(data.annual_price),
        });
      } else {
        setPricing({
          hole_id: isCourseLevel ? null : selectedHole,
          course_id: isCourseLevel ? courseId : null,
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

  const loadQuantityTiers = async () => {
    try {
      const { data } = await supabase
        .from('quantity_pricing_tiers')
        .select('*')
        .eq('course_id', courseId)
        .eq('advertisement_type_id', selectedAdType)
        .order('quantity');

      if (data && data.length > 0) {
        setQuantityTiers(
          data.map((t) => ({
            id: t.id,
            tier_name: t.tier_name,
            quantity: t.quantity,
            daily_price: parseFloat(t.daily_price),
            weekly_price: parseFloat(t.weekly_price),
            monthly_price: parseFloat(t.monthly_price),
            annual_price: parseFloat(t.annual_price),
          }))
        );
      } else {
        // Default tiers
        setQuantityTiers([
          { tier_name: '5 Carts', quantity: 5, daily_price: 25, weekly_price: 150, monthly_price: 500, annual_price: 5000 },
          { tier_name: '10 Carts', quantity: 10, daily_price: 40, weekly_price: 250, monthly_price: 850, annual_price: 8500 },
          { tier_name: '20 Carts', quantity: 20, daily_price: 70, weekly_price: 450, monthly_price: 1500, annual_price: 15000 },
          { tier_name: 'Full Fleet', quantity: 50, daily_price: 100, weekly_price: 650, monthly_price: 2200, annual_price: 22000 },
        ]);
      }
    } catch (err) {
      console.error('Error loading quantity tiers:', err);
    }
  };

  const addTier = () => {
    const lastTier = quantityTiers[quantityTiers.length - 1];
    const newQty = lastTier ? lastTier.quantity + 10 : 5;
    setQuantityTiers([
      ...quantityTiers,
      {
        tier_name: `${newQty} Carts`,
        quantity: newQty,
        daily_price: 0,
        weekly_price: 0,
        monthly_price: 0,
        annual_price: 0,
      },
    ]);
  };

  const removeTier = (index: number) => {
    setQuantityTiers(quantityTiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof QuantityTier, value: string | number) => {
    setQuantityTiers((prev) =>
      prev.map((tier, i) =>
        i === index ? { ...tier, [field]: typeof value === 'string' && field !== 'tier_name' ? parseFloat(value) || 0 : value } : tier
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (hasQuantityPricing) {
        // Save quantity tiers
        // Delete existing tiers for this course + ad type
        await supabase
          .from('quantity_pricing_tiers')
          .delete()
          .eq('course_id', courseId)
          .eq('advertisement_type_id', selectedAdType);

        if (quantityTiers.length > 0) {
          const tiersToInsert = quantityTiers.map((tier) => ({
            course_id: courseId,
            advertisement_type_id: selectedAdType,
            tier_name: tier.tier_name,
            quantity: tier.quantity,
            daily_price: tier.daily_price,
            weekly_price: tier.weekly_price,
            monthly_price: tier.monthly_price,
            annual_price: tier.annual_price,
          }));

          const { error: insertError } = await supabase
            .from('quantity_pricing_tiers')
            .insert(tiersToInsert);

          if (insertError) throw insertError;
        }
      } else {
        const pricingData = {
          daily_price: pricing.daily_price,
          weekly_price: pricing.weekly_price,
          monthly_price: pricing.monthly_price,
          annual_price: pricing.annual_price,
        };

        if (isCourseLevel) {
          await supabase
            .from('pricing')
            .delete()
            .eq('course_id', courseId)
            .eq('advertisement_type_id', selectedAdType)
            .is('hole_id', null);

          const { error: insertError } = await supabase
            .from('pricing')
            .insert({
              ...pricingData,
              advertisement_type_id: selectedAdType,
              course_id: courseId,
              hole_id: null,
            });

          if (insertError) throw insertError;
        } else {
          const { error: upsertError } = await supabase
            .from('pricing')
            .upsert({
              ...pricingData,
              advertisement_type_id: selectedAdType,
              hole_id: selectedHole,
            });

          if (upsertError) throw upsertError;
        }
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing');
    } finally {
      setLoading(false);
    }
  };

  const renderStandardPricing = () => (
    <div className="space-y-4 pt-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <DollarSign size={20} />
          Set Pricing Tiers
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Define pricing for different sponsorship durations. You receive {100 - platformFeePercent}% of each payment.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {(['daily', 'weekly', 'monthly', 'annual'] as const).map((period) => (
            <div key={period}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {period.charAt(0).toUpperCase() + period.slice(1)} Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricing[`${period}_price`]}
                onChange={(e) =>
                  setPricing({ ...pricing, [`${period}_price`]: parseFloat(e.target.value) || 0 })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderQuantityPricing = () => (
    <div className="space-y-4 pt-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <DollarSign size={20} />
            Quantity-Based Pricing
          </h4>
          <button
            type="button"
            onClick={addTier}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
          >
            <Plus size={16} />
            Add Tier
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Set pricing based on how many carts the sponsor wants. More carts = higher price. You receive {100 - platformFeePercent}% of each payment.
        </p>

        <div className="space-y-4">
          {quantityTiers.map((tier, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tier Name</label>
                    <input
                      type="text"
                      value={tier.tier_name}
                      onChange={(e) => updateTier(index, 'tier_name', e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent w-36"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1"># of Carts</label>
                    <input
                      type="number"
                      min="1"
                      value={tier.quantity}
                      onChange={(e) => updateTier(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent w-24"
                    />
                  </div>
                </div>
                {quantityTiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {(['daily', 'weekly', 'monthly', 'annual'] as const).map((period) => (
                  <div key={period}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {period.charAt(0).toUpperCase() + period.slice(1)} ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier[`${period}_price`]}
                      onChange={(e) => updateTier(index, `${period}_price`, e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Monthly earnings: ${((tier.monthly_price || 0) * (1 - platformFeePercent / 100)).toFixed(2)} ({100 - platformFeePercent}% of ${tier.monthly_price})
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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

          <div className={`grid ${isCourseLevel || hasQuantityPricing ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advertisement Type
              </label>
              <select
                value={selectedAdType}
                onChange={(e) => {
                  setSelectedAdType(e.target.value);
                  const newAdType = adTypes.find((at) => at.id === e.target.value);
                  if (newAdType && !newAdType.is_hole_specific) {
                    setSelectedHole('');
                  }
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Choose type</option>
                {adTypes.map((adType) => (
                  <option key={adType.id} value={adType.id}>
                    {adType.name}{!adType.is_hole_specific ? ' (Course-Wide)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {!isCourseLevel && !hasQuantityPricing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Hole
                </label>
                <select
                  value={selectedHole}
                  onChange={(e) => setSelectedHole(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Choose a hole</option>
                  {holes.map((hole) => (
                    <option key={hole.id} value={hole.id}>
                      Hole {hole.hole_number}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isCourseLevel && selectedAdType && !hasQuantityPricing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              This is a course-wide advertisement — pricing applies to the entire course, not individual holes.
            </div>
          )}

          {hasQuantityPricing && selectedAdType && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              This ad type uses quantity-based pricing — set different prices based on how many carts the sponsor wants to place signs on.
            </div>
          )}

          {hasQuantityPricing && selectedAdType
            ? renderQuantityPricing()
            : (isCourseLevel ? selectedAdType : selectedHole && selectedAdType)
              ? renderStandardPricing()
              : null
          }

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
              disabled={loading || !selectedAdType || (!isCourseLevel && !hasQuantityPricing && !selectedHole)}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Pricing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
