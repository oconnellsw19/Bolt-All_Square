import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Check, Upload, FileText, Image as ImageIcon, CheckCircle, Trash2 } from 'lucide-react';

interface Hole {
  id: string;
  hole_number: number;
  hole_name: string | null;
}

interface AdvertisementType {
  id: string;
  name: string;
  description: string;
  dimensions: string;
}

interface Pricing {
  id: string;
  daily_price: number;
  weekly_price: number;
  monthly_price: number;
  annual_price: number;
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

interface SponsorshipBookingModalProps {
  courseId: string;
  courseName: string;
  hole: Hole | null;
  advertisementTypes: AdvertisementType[];
  quantityTiers?: QuantityTier[];
  onClose: () => void;
  onSuccess: () => void;
}

type DurationType = 'daily' | 'weekly' | 'monthly' | 'annual';

interface Tier {
  id: DurationType;
  name: string;
  description: string;
  price: number;
  duration: string;
  recommended?: boolean;
}

export function SponsorshipBookingModal({
  courseId,
  courseName,
  hole,
  advertisementTypes,
  quantityTiers = [],
  onClose,
  onSuccess,
}: SponsorshipBookingModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [selectedAdType, setSelectedAdType] = useState<AdvertisementType | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [selectedQuantityTier, setSelectedQuantityTier] = useState<QuantityTier | null>(null);
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(30);

  const isCourseLevel = !hole;

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

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const adTypeQuantityTiers = selectedAdType
    ? quantityTiers.filter((t) => t.advertisement_type_id === selectedAdType.id)
    : [];
  const hasQuantityPricing = adTypeQuantityTiers.length > 0;

  useEffect(() => {
    if (selectedAdType) {
      if (hasQuantityPricing && selectedQuantityTier) {
        setPricing({
          id: '',
          daily_price: selectedQuantityTier.daily_price,
          weekly_price: selectedQuantityTier.weekly_price,
          monthly_price: selectedQuantityTier.monthly_price,
          annual_price: selectedQuantityTier.annual_price,
        });
      } else if (!hasQuantityPricing) {
        loadPricing();
      }
    }
  }, [selectedAdType, hole?.id, selectedQuantityTier]);

  const loadPricing = async () => {
    if (!selectedAdType) return;

    try {
      let query = supabase
        .from('pricing')
        .select('*')
        .eq('advertisement_type_id', selectedAdType.id);

      if (isCourseLevel) {
        query = query.eq('course_id', courseId).is('hole_id', null);
      } else {
        query = query.eq('hole_id', hole.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        setPricing(data);
      } else {
        setPricing({
          id: '',
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

  const getTiers = (): Tier[] => {
    if (!pricing) return [];

    return [
      {
        id: 'daily',
        name: 'Daily',
        description: 'Perfect for special events or testing the waters',
        price: pricing.daily_price,
        duration: '1 day',
      },
      {
        id: 'weekly',
        name: 'Weekly',
        description: 'Great for short-term campaigns',
        price: pricing.weekly_price,
        duration: '7 days',
      },
      {
        id: 'monthly',
        name: 'Monthly',
        description: 'Most popular for consistent visibility',
        price: pricing.monthly_price,
        duration: '30 days',
        recommended: true,
      },
      {
        id: 'annual',
        name: 'Annual',
        description: 'Best value for year-round brand presence',
        price: pricing.annual_price,
        duration: '365 days',
      },
    ];
  };

  const calculateEndDate = (start: string, duration: DurationType): string => {
    const startDateObj = new Date(start);
    const days = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      annual: 365,
    };
    startDateObj.setDate(startDateObj.getDate() + days[duration]);
    return startDateObj.toISOString().split('T')[0];
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isUnder10MB = file.size <= 10 * 1024 * 1024;
      return (isImage || isPDF) && isUnder10MB;
    });

    // Generate preview URLs for image files
    const newPreviews = validFiles.map(file =>
      file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    );

    setUploadedFiles([...uploadedFiles, ...validFiles]);
    setPreviewUrls([...previewUrls, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedAdType || !selectedTier || !startDate || !termsAccepted) {
      setError('Please complete all fields and accept terms');
      return;
    }

    if (uploadedFiles.length === 0) {
      setError('Please upload at least one ad image');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endDate = calculateEndDate(startDate, selectedTier.id);
      const totalAmount = selectedTier.price;
      const feeRate = platformFeePercent / 100;
      const courseAmount = totalAmount * (1 - feeRate);
      const allsquareAmount = totalAmount * feeRate;

      const sponsorshipRecord: any = {
        sponsor_id: profile?.id,
        advertisement_type_id: selectedAdType.id,
        start_date: startDate,
        end_date: endDate,
        duration_type: selectedTier.id,
        total_amount: totalAmount,
        course_amount: courseAmount,
        allsquare_amount: allsquareAmount,
        status: 'pending',
        payment_status: 'pending',
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      };

      if (isCourseLevel) {
        sponsorshipRecord.course_id = courseId;
      } else {
        sponsorshipRecord.hole_id = hole!.id;
      }

      if (selectedQuantityTier) {
        sponsorshipRecord.quantity = selectedQuantityTier.quantity;
        sponsorshipRecord.quantity_pricing_tier_id = selectedQuantityTier.id;
      }

      const { data: sponsorshipData, error: sponsorshipError } = await supabase
        .from('sponsorships')
        .insert(sponsorshipRecord)
        .select()
        .single();

      if (sponsorshipError) throw sponsorshipError;

      // Upload files
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${sponsorshipData.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `sponsorships/${sponsorshipData.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('artwork')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('artwork').getPublicUrl(filePath);

        const fileType = file.type.startsWith('image/') ? 'logo' : 'pdf';

        const { error: artworkError } = await supabase.from('artwork').insert({
          sponsorship_id: sponsorshipData.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
        });

        if (artworkError) throw artworkError;
      }

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      setStep(6); // success step
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sponsorship request');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Choose ad type
  const renderStep1 = () => {
    if (selectedAdType && hasQuantityPricing) {
      return (
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Step 1: Choose Package — {selectedAdType.name}
          </h4>
          <button
            onClick={() => {
              setSelectedAdType(null);
              setSelectedQuantityTier(null);
            }}
            className="text-sm text-amber-600 hover:text-amber-700 mb-4 inline-block"
          >
            ← Back to ad types
          </button>
          <div className="grid md:grid-cols-2 gap-4">
            {adTypeQuantityTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => {
                  setSelectedQuantityTier(tier);
                  setStep(2);
                }}
                className={`p-5 border-2 rounded-lg text-left transition ${
                  selectedQuantityTier?.id === tier.id
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-lg text-gray-800">{tier.tier_name}</h5>
                    <p className="text-sm text-gray-600 mt-1">{tier.quantity} carts with your sign</p>
                    <div className="mt-3 text-sm text-gray-500 space-y-0.5">
                      <p>Daily: <span className="font-medium text-gray-700">${tier.daily_price}</span></p>
                      <p>Monthly: <span className="font-medium text-gray-700">${tier.monthly_price}</span></p>
                      <p>Annual: <span className="font-medium text-gray-700">${tier.annual_price}</span></p>
                    </div>
                  </div>
                  {selectedQuantityTier?.id === tier.id && (
                    <Check className="text-amber-600" size={24} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Step 1: Choose Advertisement Type
        </h4>
        <div className="space-y-3">
          {advertisementTypes.map((adType) => {
            const adTiers = quantityTiers.filter((t) => t.advertisement_type_id === adType.id);
            const isQuantityBased = adTiers.length > 0;

            return (
              <button
                key={adType.id}
                onClick={() => {
                  setSelectedAdType(adType);
                  if (!isQuantityBased) {
                    setStep(2);
                  }
                }}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  selectedAdType?.id === adType.id
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-gray-800">{adType.name}</h5>
                    <p className="text-sm text-gray-600 mt-1">{adType.description}</p>
                    <p className="text-xs text-gray-500 mt-2">{adType.dimensions}</p>
                    {isQuantityBased && (
                      <p className="text-xs text-amber-600 font-medium mt-2">
                        {adTiers.length} packages available — click to view
                      </p>
                    )}
                  </div>
                  {selectedAdType?.id === adType.id && !isQuantityBased && (
                    <Check className="text-amber-600" size={24} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Step 2: Choose tier
  const renderStep2 = () => {
    const tiers = getTiers();

    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Step 2: Choose Sponsorship Duration
        </h4>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => {
                setSelectedTier(tier);
                setStep(3);
              }}
              className={`p-6 border-2 rounded-lg text-left transition relative ${
                selectedTier?.id === tier.id
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    RECOMMENDED
                  </span>
                </div>
              )}
              <div className="text-center">
                <h5 className="font-bold text-xl text-gray-800 mb-2">{tier.name}</h5>
                <div className="text-3xl font-bold text-amber-600 mb-2">
                  ${tier.price.toFixed(2)}
                </div>
                <p className="text-sm text-gray-600 mb-3">{tier.duration}</p>
                <p className="text-xs text-gray-500">{tier.description}</p>
              </div>
              {selectedTier?.id === tier.id && (
                <Check className="absolute top-4 right-4 text-amber-600" size={24} />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Step 3: Upload ad image
  const renderStep3 = () => (
    <div>
      <h4 className="text-lg font-semibold text-gray-800 mb-4">
        Step 3: Upload Your Ad Image
      </h4>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          Upload the image or file you'd like displayed for your{' '}
          <span className="font-semibold">{selectedAdType?.name}</span> sponsorship.
          The course manager will review this when approving your request.
        </p>
        {selectedAdType?.dimensions && (
          <p className="text-sm text-blue-700 mt-1">
            Recommended dimensions: <span className="font-semibold">{selectedAdType.dimensions}</span>
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-amber-400 transition cursor-pointer">
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload-step3"
          />
          <label htmlFor="file-upload-step3" className="cursor-pointer">
            <Upload size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-medium mb-1">
              Click to upload your ad image
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, SVG, or PDF — max 10MB per file
            </p>
          </label>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Uploaded Files ({uploadedFiles.length})
          </p>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Image preview thumbnail */}
                {file.type.startsWith('image/') && previewUrls[index] ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-white">
                    <img
                      src={previewUrls[index]}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gray-200 flex items-center justify-center">
                    <FileText size={24} className="text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadedFiles.length === 0 && (
        <p className="text-sm text-amber-600 font-medium">
          At least one image is required to continue.
        </p>
      )}
    </div>
  );

  // Step 4: Select date, review, accept terms
  const renderStep4 = () => {
    const endDate = startDate && selectedTier ? calculateEndDate(startDate, selectedTier.id) : null;

    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Step 4: Select Start Date & Review
        </h4>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h5 className="font-semibold text-gray-800 mb-3">Sponsorship Summary</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Course:</span>
              <span className="font-medium">{courseName}</span>
            </div>
            {!isCourseLevel && (
              <div className="flex justify-between">
                <span className="text-gray-600">Hole:</span>
                <span className="font-medium">#{hole!.hole_number}{hole!.hole_name ? ` – ${hole!.hole_name}` : ''}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Advertisement:</span>
              <span className="font-medium">{selectedAdType?.name}</span>
            </div>
            {selectedQuantityTier && (
              <div className="flex justify-between">
                <span className="text-gray-600">Package:</span>
                <span className="font-medium">{selectedQuantityTier.tier_name} ({selectedQuantityTier.quantity} carts)</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{selectedTier?.name} ({selectedTier?.duration})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Start Date:</span>
              <span className="font-medium">{startDate ? formatDate(startDate) : <span className="text-gray-400 italic">Not selected</span>}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">End Date:</span>
              <span className="font-medium">{endDate ? formatDate(endDate) : <span className="text-gray-400 italic">—</span>}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ad Image:</span>
              <span className="font-medium text-green-600">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-800 font-semibold">Total Amount:</span>
              <span className="text-amber-600 font-bold text-lg">
                ${selectedTier?.price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-700">
              I accept the terms and conditions. I understand that this sponsorship request
              is subject to approval by the course manager. Payment will be collected upon
              approval.
            </span>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-2">{error}</div>
        )}
      </div>
    );
  };

  // Step 5: Final summary + submit
  const renderStep5 = () => {
    const endDate = startDate && selectedTier ? calculateEndDate(startDate, selectedTier.id) : null;

    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Step 5: Submit Request
        </h4>

        <div className="bg-gray-50 rounded-lg p-5 mb-6 border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-amber-600" />
            Final Request Summary
          </h5>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Course</span>
              <span className="font-medium text-gray-800">{courseName}</span>
            </div>
            {!isCourseLevel && (
              <div className="flex justify-between">
                <span className="text-gray-500">Hole</span>
                <span className="font-medium text-gray-800">#{hole!.hole_number}{hole!.hole_name ? ` – ${hole!.hole_name}` : ''}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Advertisement Type</span>
              <span className="font-medium text-gray-800">{selectedAdType?.name}</span>
            </div>
            {selectedQuantityTier && (
              <div className="flex justify-between">
                <span className="text-gray-500">Package</span>
                <span className="font-medium text-gray-800">{selectedQuantityTier.tier_name} ({selectedQuantityTier.quantity} carts)</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Ad Dimensions</span>
              <span className="font-medium text-gray-800">{selectedAdType?.dimensions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="font-medium text-gray-800">{selectedTier?.name} ({selectedTier?.duration})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Start Date</span>
              <span className="font-medium text-gray-800">{startDate ? formatDate(startDate) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">End Date</span>
              <span className="font-medium text-gray-800">{endDate ? formatDate(endDate) : '—'}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-200">
              <span className="text-gray-800 font-semibold">Total Amount</span>
              <span className="text-amber-600 font-bold text-lg">${selectedTier?.price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Image preview in summary */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Ad Image{uploadedFiles.length > 1 ? 's' : ''}</p>
          <div className="flex flex-wrap gap-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="relative">
                {file.type.startsWith('image/') && previewUrls[index] ? (
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={previewUrls[index]}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center justify-center">
                    <FileText size={20} className="text-gray-500" />
                    <span className="text-[10px] text-gray-500 mt-1 truncate max-w-[72px]">{file.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            By submitting, your request and uploaded image will be sent to the course manager for review. You will be notified once approved.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
        )}
      </div>
    );
  };

  // Step 6: Success confirmation
  const renderStep6 = () => (
    <div className="text-center py-8">
      <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-green-600" />
      </div>
      <h4 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted!</h4>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Your sponsorship request and ad image have been sent to the course manager for review.
        You'll be notified once it's approved.
      </p>
      <div className="bg-gray-50 rounded-lg p-4 max-w-sm mx-auto text-sm text-left space-y-1.5">
        <div className="flex justify-between">
          <span className="text-gray-500">Ad Type</span>
          <span className="font-medium text-gray-800">{selectedAdType?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Amount</span>
          <span className="font-medium text-amber-600">${selectedTier?.price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Files</span>
          <span className="font-medium text-gray-800">{uploadedFiles.length} uploaded</span>
        </div>
      </div>
    </div>
  );

  const totalSteps = 5;

  return (
    <>
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in-down">
          <div className="flex items-center gap-3 bg-amber-500 text-white px-6 py-3.5 rounded-xl shadow-lg text-sm font-medium">
            <CheckCircle size={18} />
            Request Submitted
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {isCourseLevel ? 'Course-Wide Sponsorship' : `Sponsor Hole #${hole!.hole_number}`}
              </h3>
              <p className="text-sm text-gray-600">{courseName}</p>
            </div>
            <button
              onClick={step === 6 ? onSuccess : onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6">
            {/* Step indicator */}
            {step <= totalSteps && (
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s, i) => (
                    <div key={s} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          step >= s ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {s}
                      </div>
                      {i < 4 && (
                        <div className={`w-14 h-1 transition-colors ${step > s ? 'bg-amber-500' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            {step === 6 && renderStep6()}

            <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
              {step > 1 && step <= 5 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
              )}
              {step < 4 && step !== 6 && (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={() => {
                    if (uploadedFiles.length === 0) {
                      setError('Please upload at least one ad image');
                      return;
                    }
                    setError('');
                    setStep(4);
                  }}
                  disabled={uploadedFiles.length === 0}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              )}
              {step === 4 && (
                <button
                  onClick={() => {
                    if (!startDate) {
                      setError('Please select a start date');
                      return;
                    }
                    if (!termsAccepted) {
                      setError('Please accept the terms and conditions');
                      return;
                    }
                    setError('');
                    setStep(5);
                  }}
                  disabled={!startDate || !termsAccepted}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review Request
                </button>
              )}
              {step === 5 && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              )}
              {step === 6 && (
                <button
                  onClick={onSuccess}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
