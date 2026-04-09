import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { SponsorshipBookingModal } from './SponsorshipBookingModal';

interface Course {
  id: string;
  name: string;
  description: string;
  city: string;
  state: string;
  zip_code: string;
  total_holes: number;
  contact_email: string;
  contact_phone: string;
  cover_photo_url: string | null;
}

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

interface CourseDetailsPageProps {
  courseId: string;
  onBack: () => void;
}

export function CourseDetailsPage({ courseId, onBack }: CourseDetailsPageProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [adTypes, setAdTypes] = useState<AdvertisementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHole, setSelectedHole] = useState<Hole | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [courseLevelBooking, setCourseLevelBooking] = useState(false);
  const [quantityTiers, setQuantityTiers] = useState<QuantityTier[]>([]);

  useEffect(() => {
    loadCourseDetails();
  }, [courseId]);

  const loadCourseDetails = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: holesData, error: holesError } = await supabase
        .from('holes')
        .select('id, hole_number, hole_name, photo_url')
        .eq('course_id', courseId)
        .order('hole_number');

      if (holesError) throw holesError;
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

  const handleHoleClick = (hole: Hole) => {
    setSelectedHole(hole);
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading course details...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Course not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-amber-600 hover:text-amber-700"
        >
          Go back
        </button>
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

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        {course.cover_photo_url ? (
          <img
            src={course.cover_photo_url}
            alt={`${course.name} cover`}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="h-64 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
            <MapPin size={96} className="text-white opacity-50" />
          </div>
        )}
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{course.name}</h1>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              {(course.city || course.state) && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin size={20} className="mt-0.5 flex-shrink-0" />
                  <span>
                    {[course.city, course.state].filter(Boolean).join(', ')}
                    {course.zip_code && ` ${course.zip_code}`}
                  </span>
                </div>
              )}
              {course.contact_phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={20} />
                  <span>{course.contact_phone}</span>
                </div>
              )}
              {course.contact_email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={20} />
                  <span>{course.contact_email}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-gray-700 font-medium mb-2">
                {course.total_holes} hole golf course
              </p>
              {course.description && (
                <p className="text-gray-600">{course.description}</p>
              )}
            </div>
          </div>

          {adTypes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Available Advertisement Types
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {adTypes.filter((at) => at.is_hole_specific).map((adType) => (
                  <div
                    key={adType.id}
                    className="p-3 border border-gray-200 rounded-lg"
                  >
                    <p className="font-medium text-sm text-gray-800">{adType.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{adType.dimensions}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course-Wide Advertisements */}
      {adTypes.filter((at) => !at.is_hole_specific).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Course-Wide Sponsorships</h2>
          <p className="text-gray-600 mb-6">
            These sponsorship opportunities apply to the entire course
          </p>
          <div className="space-y-4">
            {adTypes.filter((at) => !at.is_hole_specific).map((adType) => {
              const adQuantityTiers = quantityTiers.filter((t) => t.advertisement_type_id === adType.id);

              if (adType.has_quantity_pricing && adQuantityTiers.length > 0) {
                return (
                  <div key={adType.id} className="border-2 border-gray-200 rounded-lg p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <Globe size={24} className="text-amber-500 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800">{adType.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{adType.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{adType.dimensions}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Select a package:</p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {adQuantityTiers.map((tier) => (
                        <button
                          key={tier.id}
                          onClick={() => {
                            setCourseLevelBooking(true);
                            setSelectedHole(null);
                            setShowBookingModal(true);
                          }}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition text-left"
                        >
                          <p className="font-semibold text-gray-800">{tier.tier_name}</p>
                          <p className="text-xs text-gray-500 mb-2">{tier.quantity} carts</p>
                          <p className="text-amber-600 font-bold text-lg">${tier.monthly_price}<span className="text-xs text-gray-500 font-normal">/mo</span></p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={adType.id}
                  onClick={() => {
                    setCourseLevelBooking(true);
                    setSelectedHole(null);
                    setShowBookingModal(true);
                  }}
                  className="w-full p-5 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition text-left group"
                >
                  <div className="flex items-start gap-3">
                    <Globe size={24} className="text-amber-500 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-800 group-hover:text-amber-700">{adType.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{adType.description}</p>
                      <p className="text-xs text-gray-400 mt-2">{adType.dimensions}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hole Sponsorships */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Select a Hole to Sponsor</h2>
        <p className="text-gray-600 mb-6">
          Choose from the available holes below to view sponsorship options
        </p>

        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-3">
          {holes.map((hole) => (
            <button
              key={hole.id}
              onClick={() => handleHoleClick(hole)}
              className="relative aspect-square rounded-lg shadow-md hover:shadow-lg transition overflow-hidden group"
            >
              {hole.photo_url ? (
                <>
                  <img
                    src={hole.photo_url}
                    alt={`Hole ${hole.hole_number}`}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 group-hover:from-slate-800 group-hover:to-slate-900 transition" />
              )}
              <div className="relative flex flex-col items-center justify-center h-full text-white">
                <span className="text-2xl font-bold">{hole.hole_number}</span>
                {hole.hole_name && (
                  <span className="text-xs mt-1 opacity-90">{hole.hole_name}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {showBookingModal && (selectedHole || courseLevelBooking) && (
        <SponsorshipBookingModal
          courseId={courseId}
          courseName={course.name}
          hole={selectedHole}
          advertisementTypes={courseLevelBooking
            ? adTypes.filter((at) => !at.is_hole_specific)
            : adTypes.filter((at) => at.is_hole_specific)
          }
          quantityTiers={quantityTiers}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedHole(null);
            setCourseLevelBooking(false);
          }}
          onSuccess={() => {
            setShowBookingModal(false);
            setSelectedHole(null);
            setCourseLevelBooking(false);
          }}
        />
      )}
    </div>
  );
}
