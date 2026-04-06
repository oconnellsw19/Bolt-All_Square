import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, DollarSign, MapPin } from 'lucide-react';
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
}

interface Pricing {
  hole_id: string;
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
  const [adTypes, setAdTypes] = useState<AdvertisementType[]>([]);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);

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

      const { data: courseAdTypes } = await supabase
        .from('course_advertisement_types')
        .select('advertisement_type_id')
        .eq('course_id', courseId);

      const adTypeIds = courseAdTypes?.map((cat) => cat.advertisement_type_id) || [];

      if (adTypeIds.length > 0) {
        const { data: adTypesData } = await supabase
          .from('advertisement_types')
          .select('*')
          .in('id', adTypeIds);

        setAdTypes(adTypesData || []);
      }

      const holeIds = holesData?.map((h) => h.id) || [];
      if (holeIds.length > 0) {
        const { data: pricingData } = await supabase
          .from('pricing')
          .select('*')
          .in('hole_id', holeIds);

        setPricing(pricingData || []);
      }
    } catch (error) {
      console.error('Error loading course details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPricingForHole = (holeId: string, adTypeId: string) => {
    return pricing.find((p) => p.hole_id === holeId && p.advertisement_type_id === adTypeId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading course details...</div>
      </div>
    );
  }

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
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <DollarSign size={20} />
          Set Pricing
        </button>
      </div>

      {adTypes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No advertisement types selected</h3>
          <p className="text-gray-600">
            Edit your course to select which advertisement types sponsors can purchase
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {holes.map((hole) => (
            <div key={hole.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {hole.photo_url ? (
                <div className="relative">
                  <img
                    src={hole.photo_url}
                    alt={`Hole ${hole.hole_number}`}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end px-6 py-4">
                    <h3 className="text-xl font-bold text-white">
                      Hole {hole.hole_number}
                      {hole.hole_name && <span className="font-normal ml-2">- {hole.hole_name}</span>}
                    </h3>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">
                    Hole {hole.hole_number}
                    {hole.hole_name && <span className="font-normal ml-2">- {hole.hole_name}</span>}
                  </h3>
                </div>
              )}

              <div className="p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Available Advertisements</h4>

                {adTypes.length === 0 ? (
                  <p className="text-gray-600 text-sm">No advertisement types available</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {adTypes.map((adType) => {
                      const holePricing = getPricingForHole(hole.id, adType.id);
                      const hasPricing = !!holePricing;

                      return (
                        <div
                          key={adType.id}
                          className={`border-2 rounded-lg p-4 ${
                            hasPricing
                              ? 'border-green-200 bg-green-50'
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
            </div>
          ))}
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
