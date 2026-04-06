import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Check, Upload, FileText, Image as ImageIcon, CheckCircle } from 'lucide-react';

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

interface SponsorshipBookingModalProps {
  courseId: string;
  courseName: string;
  hole: Hole;
  advertisementTypes: AdvertisementType[];
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
  const [uploadProgress, setUploadProgress] = useState(false);
  const [createdSponsorshipId, setCreatedSponsorshipId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (selectedAdType) {
      loadPricing();
    }
  }, [selectedAdType, hole.id]);

  const loadPricing = async () => {
    if (!selectedAdType) return;

    try {
      const { data, error } = await supabase
        .from('pricing')
        .select('*')
        .eq('hole_id', hole.id)
        .eq('advertisement_type_id', selectedAdType.id)
        .maybeSingle();

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
    setUploadedFiles([...uploadedFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedAdType || !selectedTier || !startDate || !termsAccepted) {
      setError('Please complete all fields and accept terms');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endDate = calculateEndDate(startDate, selectedTier.id);
      const totalAmount = selectedTier.price;
      const courseAmount = totalAmount * 0.75;
      const allsquareAmount = totalAmount * 0.25;

      const { data: sponsorshipData, error: sponsorshipError } = await supabase
        .from('sponsorships')
        .insert({
          sponsor_id: profile?.id,
          hole_id: hole.id,
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
        })
        .select()
        .single();

      if (sponsorshipError) throw sponsorshipError;

      setCreatedSponsorshipId(sponsorshipData.id);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Failed to create sponsorship request');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!createdSponsorshipId) return;

    setUploadProgress(true);
    setError('');

    try {
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${createdSponsorshipId}-${Date.now()}.${fileExt}`;
        const filePath = `sponsorships/${createdSponsorshipId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('artwork')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('artwork').getPublicUrl(filePath);

        const fileType = file.type.startsWith('image/') ? 'logo' : 'pdf';

        const { error: artworkError } = await supabase.from('artwork').insert({
          sponsorship_id: createdSponsorshipId,
          file_url: publicUrl,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
        });

        if (artworkError) throw artworkError;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleSkipUpload = () => {
    onSuccess();
  };

  const renderStep1 = () => (
    <div>
      <h4 className="text-lg font-semibold text-gray-800 mb-4">
        Step 1: Choose Advertisement Type
      </h4>
      <div className="space-y-3">
        {advertisementTypes.map((adType) => (
          <button
            key={adType.id}
            onClick={() => {
              setSelectedAdType(adType);
              setStep(2);
            }}
            className={`w-full p-4 border-2 rounded-lg text-left transition ${
              selectedAdType?.id === adType.id
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h5 className="font-semibold text-gray-800">{adType.name}</h5>
                <p className="text-sm text-gray-600 mt-1">{adType.description}</p>
                <p className="text-xs text-gray-500 mt-2">{adType.dimensions}</p>
              </div>
              {selectedAdType?.id === adType.id && (
                <Check className="text-green-600" size={24} />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => {
    const tiers = getTiers();

    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Step 2: Choose Sponsorship Tier
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
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    RECOMMENDED
                  </span>
                </div>
              )}
              <div className="text-center">
                <h5 className="font-bold text-xl text-gray-800 mb-2">{tier.name}</h5>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ${tier.price.toFixed(2)}
                </div>
                <p className="text-sm text-gray-600 mb-3">{tier.duration}</p>
                <p className="text-xs text-gray-500">{tier.description}</p>
              </div>
              {selectedTier?.id === tier.id && (
                <Check className="absolute top-4 right-4 text-green-600" size={24} />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const endDate = startDate && selectedTier ? calculateEndDate(startDate, selectedTier.id) : null;

    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Step 3: Select Start Date & Review
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h5 className="font-semibold text-gray-800 mb-3">Sponsorship Summary</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Course:</span>
              <span className="font-medium">{courseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Hole:</span>
              <span className="font-medium">#{hole.hole_number}{hole.hole_name ? ` – ${hole.hole_name}` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Advertisement:</span>
              <span className="font-medium">{selectedAdType?.name}</span>
            </div>
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
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-800 font-semibold">Total Amount:</span>
              <span className="text-green-600 font-bold text-lg">
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

  const renderStep4 = () => {
    const endDate = startDate && selectedTier ? calculateEndDate(startDate, selectedTier.id) : null;

    return (
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Step 4: Submit Request
        </h4>

        <div className="bg-gray-50 rounded-lg p-5 mb-6 border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-green-600" />
            Final Request Summary
          </h5>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Course</span>
              <span className="font-medium text-gray-800">{courseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hole</span>
              <span className="font-medium text-gray-800">#{hole.hole_number}{hole.hole_name ? ` – ${hole.hole_name}` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Advertisement Type</span>
              <span className="font-medium text-gray-800">{selectedAdType?.name}</span>
            </div>
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
              <span className="text-green-600 font-bold text-lg">${selectedTier?.price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            By submitting, your request will be sent to the course manager for review. You will be notified once approved.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
        )}
      </div>
    );
  };

  const renderStep5 = () => (
    <div>
      <h4 className="text-lg font-semibold text-gray-800 mb-4">
        Upload Artwork (Optional)
      </h4>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">
          Your request has been submitted! Upload your logo or artwork now, or skip and do it later from your dashboard.
          Accepted formats: Images (PNG, JPG, SVG) and PDF files up to 10MB each.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Files
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition">
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-medium mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, SVG, PDF (max 10MB per file)
            </p>
          </label>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Selected Files</p>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon size={20} className="text-gray-600" />
                  ) : (
                    <FileText size={20} className="text-gray-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>
      )}
    </div>
  );

  const totalSteps = 5;

  return (
    <>
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in-down">
          <div className="flex items-center gap-3 bg-green-600 text-white px-6 py-3.5 rounded-xl shadow-lg text-sm font-medium">
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
                Sponsor Hole #{hole.hole_number}
              </h3>
              <p className="text-sm text-gray-600">{courseName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((s, i) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        step >= s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {s}
                    </div>
                    {i < 4 && (
                      <div className={`w-14 h-1 transition-colors ${step > s ? 'bg-green-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}

            <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
              {step > 1 && step < 5 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
              )}
              {step < 4 && (
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
                    if (!startDate) {
                      setError('Please select a start date');
                      return;
                    }
                    if (!termsAccepted) {
                      setError('Please accept the terms and conditions');
                      return;
                    }
                    setError('');
                    setStep(4);
                  }}
                  disabled={!startDate || !termsAccepted}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review Request
                </button>
              )}
              {step === 4 && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              )}
              {step === 5 && (
                <>
                  <button
                    onClick={handleSkipUpload}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleFileUpload}
                    disabled={uploadProgress || uploadedFiles.length === 0}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadProgress ? 'Uploading...' : 'Upload Files'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
