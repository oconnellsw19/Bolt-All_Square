import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, DollarSign, MapPin, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { PricingModal } from './PricingModal';

interface Hole {
  id: string;
  hole_number: number;
  hole_name: string | null;
  photo_url: string | null;
}

interface AdvertisementType {
  id: string;
  name: string;
  description: string;
  dimensions: string;
  is_hole_specific: boolean;
  has_quantity_pricing: boolean;
}

interface QuantityTier {
  id: string;
  advertisement_type_id: string;
  tier_name: string;
  quantity: number;
  daily_price: number;
  weekly_price: number;
  monthly_price: number;
  annual_price: number;
}

interface Pricing {
  hole_id: string | null;
  course_id: string | null;
  advertisement_type_id: string;
  daily_price: number;
  weekly_price: number;
  monthly_price: number;
  annual_price: number;
}

interface CourseDetailViewProps {
  courseId: string;
  courseName: string;
  onBack: () => void;
}

export function CourseDetailView({ courseId, courseName, onBack }: CourseDetailViewProps) {
  const [holes, setHoles] = useState<Hole[]>([]);
  const [allAdTypes, setAllAdTypes] = useState<AdvertisementType[]>([]);
  const [enabledAdTypeIds, setEnabledAdTypeIds] = useState<Set<string>>(new Set());
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [expandedHoles, setExpandedHoles] = useState<Set<string>>(new Set());
  const [togglingAdType, setTogglingAdType] = useState<string | null>(null);
  const [quantityTiers, setQuantityTiers] = useState<QuantityTier[]>([]);
  const [expandedCourseAds, setExpandedCourseAds] = useState<Set<string>>(new Set());

  const toggleHole = (holeId: string) => {
    setExpandedHoles((prev) => {
      const next = new Set(prev);
      if (next.has(holeId)) {
        next.delete(holeId);
      } else {
        next.add(holeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedHoles(new Set(holes.map((h) => h.id)));
  };

  const collapseAll = () => {
    setExpandedHoles(new Set());
  };

  useEffect(() => {
    loadCourseDetails();
  }, [courseId]);

  const loadCourseDetails = async () => {
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('cover_photo_url')
        .eq('id', courseId)
        .maybeSingle();

      setCoverPhotoUrl(courseData?.cover_photo_url || null);

      const { data: holesData } = await supabase
        .from('holes')
        .select('id, hole_number, hole_name, photo_url')
        .eq('course_id', courseId)
        .order('hole_number');

      setHoles(holesData || []);

      // Load ALL advertisement types
      const { data: allAdTypesData } = await supabase
        .from('advertisement_types')
        .select('*')
        .order('name');

      setAllAdTypes(allAdTypesData || []);

      // Load which ad types are enabled for this course
      const { data: courseAdTypes } = await supabase
        .from('course_advertisement_types')
        .select('advertisement_type_id')
        .eq('course_id', courseId);

      const enabledIds = new Set(courseAdTypes?.map((cat) => cat.advertisement_type_id) || []);
      setEnabledAdTypeIds(enabledIds);

      const holeIds = holesData?.map((h) => h.id) || [];

      // Load hole-level pricing
      let allPricing: Pricing[] = [];
      if (holeIds.length > 0) {
        const { data: pricingData } = await supabase
          .from('pricing')
          .select('*')
          .in('hole_id', holeIds);

        allPricing = pricingData || [];
      }

      // Load course-level pricing (for non-hole-specific ads like Website Banner)
      const { data: coursePricingData } = await supabase
        .from('pricing')
        .select('*')
        .eq('course_id', courseId)
        .is('hole_id', null);

      if (coursePricingData) {
        allPricing = [...allPricing, ...coursePricingData];
      }

      setPricing(allPricing);

      // Load quantity pricing tiers
      const { data: quantityTiersData } = await supabase
        .from('quantity_pricing_tiers')
        .select('*')
        .eq('course_id', courseId)
        .order('quantity');

      setQuantityTiers(quantityTiersData || []);
    } catch (error) {
      console.error('Error loading course details:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdType = async (adTypeId: string) => {
    setTogglingAdType(adTypeId);
    try {
      const isEnabled = enabledAdTypeIds.has(adTypeId);
      if (isEnabled) {
        // Remove from course_advertisement_types
        const { error } = await supabase
          .from('course_advertisement_types')
          .delete()
          .eq('course_id', courseId)
          .eq('advertisement_type_id', adTypeId);

        if (error) throw error;

        setEnabledAdTypeIds((prev) => {
          const next = new Set(prev);
          next.delete(adTypeId);
          return next;
        });
      } else {
        // Add to course_advertisement_types
        const { error } = await supabase
          .from('course_advertisement_types')
          .insert({ course_id: courseId, advertisement_type_id: adTypeId });

        if (error) throw error;

        setEnabledAdTypeIds((prev) => {
          const next = new Set(prev);
          next.add(adTypeId);
          return next;
        });
      }
    } catch (error) {
      console.error('Error toggling ad type:', error);
    } finally {
      setTogglingAdType(null);
    }
  };

  const getPricingForHole = (holeId: string, adTypeId: string) => {
    return pricing.find((p) => p.hole_id === holeId && p.advertisement_type_id === adTypeId);
  };

  const getCourseLevelPricing = (adTypeId: string) => {
    return pricing.find((p) => p.hole_id === null && p.advertisement_type_id === adTypeId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading course details...</div>
      </div>
    );
  }

  // Split enabled ad types into hole-specific and course-level
  const enabledAdTypes = allAdTypes.filter((at) => enabledAdTypeIds.has(at.id));
  const enabledHoleAdTypes = enabledAdTypes.filter((at) => at.is_hole_specific);
  const enabledCourseLevelAdTypes = enabledAdTypes.filter((at) => !at.is_hole_specific);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={20} />
        Back to courses
      </button>

      {coverPhotoUrl && (
        <div className="rounded-xl overflow-hidden mb-6 shadow-md">
          <img
            src={coverPhotoUrl}
            alt={`${courseName} cover`}
            className="w-full h-56 object-cover"
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{courseName}</h2>
          <p className="text-gray-600">Available holes to sponsor with advertisement types and pricing</p>
        </div>
        <button
          onClick={() => setShowPricingModal(true)}
          className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition flex items-center gap-2"
        >
          <DollarSign size={20} />
          Set Pricing
        </button>
      </div>

      {/* Advertisement Type Toggles */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Advertisement Types</h3>
        <p className="text-sm text-gray-500 mb-4">Toggle which ad types are available for sponsors to purchase</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allAdTypes.map((adType) => {
            const isEnabled = enabledAdTypeIds.has(adType.id);
            const isToggling = togglingAdType === adType.id;

            return (
              <button
                key={adType.id}
                onClick={() => toggleAdType(adType.id)}
                disabled={isToggling}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition text-left ${
                  isEnabled
                    ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                } ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
              >
                {isEnabled ? (
                  <ToggleRight size={28} className="text-amber-600 flex-shrink-0" />
                ) : (
                  <ToggleLeft size={28} className="text-gray-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`font-medium text-sm ${isEnabled ? 'text-amber-800' : 'text-gray-500'}`}>
                    {adType.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{adType.dimensions}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Course-Level Advertisements (e.g., Website Banner Ad, Physical Cart Sign) */}
      {enabledCourseLevelAdTypes.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Course-Wide Advertisements</h3>
          <p className="text-sm text-gray-500 mb-4">These ads apply to the entire course, not individual holes</p>
          <div className="space-y-4">
            {enabledCourseLevelAdTypes.map((adType) => {
              const adQuantityTiers = quantityTiers.filter((t) => t.advertisement_type_id === adType.id);

              if (adType.has_quantity_pricing) {
                const isExpanded = expandedCourseAds.has(adType.id);
                // Quantity-based pricing display (collapsible)
                return (
                  <div key={adType.id} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedCourseAds((prev) => {
                        const next = new Set(prev);
                        if (next.has(adType.id)) { next.delete(adType.id); } else { next.add(adType.id); }
                        return next;
                      })}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
                        <div>
                          <h5 className="font-semibold text-gray-800">{adType.name}</h5>
                          <p className="text-xs text-gray-500">{adType.dimensions}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {adQuantityTiers.length} tier{adQuantityTiers.length !== 1 ? 's' : ''} configured
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {adQuantityTiers.length > 0 ? (
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {adQuantityTiers.map((tier) => (
                              <div key={tier.id} className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                                <p className="font-semibold text-amber-800 text-sm mb-1">{tier.tier_name}</p>
                                <p className="text-xs text-amber-600 mb-2">{tier.quantity} carts</p>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Daily:</span>
                                    <span className="font-medium">${tier.daily_price}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Weekly:</span>
                                    <span className="font-medium">${tier.weekly_price}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Monthly:</span>
                                    <span className="font-medium">${tier.monthly_price}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Annual:</span>
                                    <span className="font-medium">${tier.annual_price}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-xs text-gray-500">No pricing tiers set</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // Standard course-level pricing display
              const coursePricing = getCourseLevelPricing(adType.id);
              const hasPricing = !!coursePricing;

              return (
                <div
                  key={adType.id}
                  className={`border-2 rounded-lg p-4 ${
                    hasPricing
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <h5 className="font-semibold text-gray-800 mb-1">{adType.name}</h5>
                  <p className="text-xs text-gray-600 mb-3">{adType.dimensions}</p>

                  {hasPricing ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily:</span>
                        <span className="font-medium text-gray-800">
                          ${coursePricing.daily_price}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Weekly:</span>
                        <span className="font-medium text-gray-800">
                          ${coursePricing.weekly_price}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly:</span>
                        <span className="font-medium text-gray-800">
                          ${coursePricing.monthly_price}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Annual:</span>
                        <span className="font-medium text-gray-800">
                          ${coursePricing.annual_price}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500">No pricing set</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {enabledAdTypes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No advertisement types enabled</h3>
          <p className="text-gray-600">
            Toggle on advertisement types above to make them available for sponsors
          </p>
        </div>
      ) : enabledHoleAdTypes.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2 mb-2">
            <button
              onClick={expandAll}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Expand All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Collapse All
            </button>
          </div>

          {holes.map((hole) => {
            const isExpanded = expandedHoles.has(hole.id);
            const pricedCount = enabledHoleAdTypes.filter((at) => getPricingForHole(hole.id, at.id)).length;

            return (
              <div key={hole.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => toggleHole(hole.id)}
                  className="w-full text-left"
                >
                  {hole.photo_url && isExpanded ? (
                    <div className="relative">
                      <img
                        src={hole.photo_url}
                        alt={`Hole ${hole.hole_number}`}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between px-6 py-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          Hole {hole.hole_number}
                          {hole.hole_name && <span className="font-normal ml-2">- {hole.hole_name}</span>}
                        </h3>
                        <span className="text-sm text-white/80">
                          {pricedCount}/{enabledHoleAdTypes.length} ads priced
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        Hole {hole.hole_number}
                        {hole.hole_name && <span className="font-normal ml-2">- {hole.hole_name}</span>}
                      </h3>
                      <span className="text-sm text-white/80">
                        {pricedCount}/{enabledHoleAdTypes.length} ads priced
                      </span>
                    </div>
                  )}
                </button>

                {isExpanded && (
                  <div className="p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">Available Advertisements</h4>

                    {enabledHoleAdTypes.length === 0 ? (
                      <p className="text-gray-600 text-sm">No advertisement types available</p>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {enabledHoleAdTypes.map((adType) => {
                          const holePricing = getPricingForHole(hole.id, adType.id);
                          const hasPricing = !!holePricing;

                          return (
                            <div
                              key={adType.id}
                              className={`border-2 rounded-lg p-4 ${
                                hasPricing
                                  ? 'border-amber-200 bg-amber-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <h5 className="font-semibold text-gray-800 mb-1">{adType.name}</h5>
                              <p className="text-xs text-gray-600 mb-3">{adType.dimensions}</p>

                              {hasPricing ? (
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Daily:</span>
                                    <span className="font-medium text-gray-800">
                                      ${holePricing.daily_price}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Weekly:</span>
                                    <span className="font-medium text-gray-800">
                                      ${holePricing.weekly_price}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Monthly:</span>
                                    <span className="font-medium text-gray-800">
                                      ${holePricing.monthly_price}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Annual:</span>
                                    <span className="font-medium text-gray-800">
                                      ${holePricing.annual_price}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  <p className="text-xs text-gray-500">No pricing set</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showPricingModal && (
        <PricingModal
          courseId={courseId}
          onClose={() => setShowPricingModal(false)}
          onSuccess={() => {
            setShowPricingModal(false);
            loadCourseDetails();
          }}
        />
      )}
    </div>
  );
}
