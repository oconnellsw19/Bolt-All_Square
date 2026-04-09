import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';

interface EditCourseModalProps {
  courseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface AdvertisementType {
  id: string;
  name: string;
  description: string;
}

interface Hole {
  id: string;
  hole_number: number;
  hole_name: string | null;
  photo_url: string | null;
}

export function EditCourseModal({ courseId, onClose, onSuccess }: EditCourseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adTypes, setAdTypes] = useState<AdvertisementType[]>([]);
  const [selectedAdTypes, setSelectedAdTypes] = useState<string[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
  const [holePhotoUploading, setHolePhotoUploading] = useState<string | null>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);
  const holePhotoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_holes: 18,
    contact_email: '',
    contact_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
  });

  useEffect(() => {
    loadCourseData();
    loadAdTypes();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      setFormData({
        name: course.name || '',
        description: course.description || '',
        total_holes: course.total_holes || 18,
        contact_email: course.contact_email || '',
        contact_phone: course.contact_phone || '',
        address_line1: course.address_line1 || '',
        address_line2: course.address_line2 || '',
        city: course.city || '',
        state: course.state || '',
        zip_code: course.zip_code || '',
      });

      setCoverPhotoUrl(course.cover_photo_url || null);

      const { data: courseAdTypes } = await supabase
        .from('course_advertisement_types')
        .select('advertisement_type_id')
        .eq('course_id', courseId);

      setSelectedAdTypes(courseAdTypes?.map((cat) => cat.advertisement_type_id) || []);

      const { data: holesData } = await supabase
        .from('holes')
        .select('id, hole_number, hole_name, photo_url')
        .eq('course_id', courseId)
        .order('hole_number');

      setHoles(holesData || []);
    } catch (err) {
      console.error('Error loading course:', err);
    }
  };

  const loadAdTypes = async () => {
    try {
      const { data } = await supabase
        .from('advertisement_types')
        .select('*')
        .order('name');
      setAdTypes(data || []);
    } catch (err) {
      console.error('Error loading ad types:', err);
    }
  };

  const toggleAdType = (adTypeId: string) => {
    setSelectedAdTypes((prev) =>
      prev.includes(adTypeId)
        ? prev.filter((id) => id !== adTypeId)
        : [...prev, adTypeId]
    );
  };

  const uploadPhoto = async (file: File, path: string): Promise<string> => {
    const { error: uploadError } = await supabase.storage
      .from('course-photos')
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('course-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverPhotoUploading(true);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `courses/${courseId}/cover.${ext}`;
      const url = await uploadPhoto(file, path);

      await supabase.from('courses').update({ cover_photo_url: url }).eq('id', courseId);
      setCoverPhotoUrl(url);
    } catch (err) {
      setError('Failed to upload cover photo: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCoverPhotoUploading(false);
    }
  };

  const handleRemoveCoverPhoto = async () => {
    setError('');
    try {
      await supabase.from('courses').update({ cover_photo_url: null }).eq('id', courseId);
      setCoverPhotoUrl(null);
    } catch {
      setError('Failed to remove cover photo');
    }
  };

  const handleHolePhotoChange = async (holeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHolePhotoUploading(holeId);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `courses/${courseId}/holes/${holeId}.${ext}`;
      const url = await uploadPhoto(file, path);

      await supabase.from('holes').update({ photo_url: url }).eq('id', holeId);
      setHoles((prev) =>
        prev.map((h) => (h.id === holeId ? { ...h, photo_url: url } : h))
      );
    } catch (err) {
      setError('Failed to upload hole photo: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setHolePhotoUploading(null);
    }
  };

  const handleRemoveHolePhoto = async (holeId: string) => {
    setError('');
    try {
      await supabase.from('holes').update({ photo_url: null }).eq('id', holeId);
      setHoles((prev) =>
        prev.map((h) => (h.id === holeId ? { ...h, photo_url: null } : h))
      );
    } catch {
      setError('Failed to remove hole photo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('courses')
        .update(formData)
        .eq('id', courseId);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from('course_advertisement_types')
        .delete()
        .eq('course_id', courseId);

      if (deleteError) throw deleteError;

      if (selectedAdTypes.length > 0) {
        const courseAdTypes = selectedAdTypes.map((adTypeId) => ({
          course_id: courseId,
          advertisement_type_id: adTypeId,
        }));

        const { error: insertError } = await supabase
          .from('course_advertisement_types')
          .insert(courseAdTypes);

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">Edit Course</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Cover Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Cover Photo
            </label>
            <div className="relative">
              {coverPhotoUrl ? (
                <div className="relative group rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={coverPhotoUrl}
                    alt="Course cover"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => coverPhotoInputRef.current?.click()}
                      className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-gray-100 transition"
                    >
                      <Upload size={14} />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCoverPhoto}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-red-700 transition"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverPhotoInputRef.current?.click()}
                  disabled={coverPhotoUploading}
                  className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-50 transition group"
                >
                  {coverPhotoUploading ? (
                    <>
                      <Loader2 size={32} className="text-amber-500 animate-spin" />
                      <span className="text-sm text-gray-500">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={32} className="text-gray-400 group-hover:text-amber-500 transition" />
                      <span className="text-sm font-medium text-gray-600 group-hover:text-amber-600 transition">
                        Upload cover photo
                      </span>
                      <span className="text-xs text-gray-400">JPG, PNG, or WebP up to 10MB</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={coverPhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleCoverPhotoChange}
              />
            </div>
          </div>

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Holes
            </label>
            <input
              type="number"
              value={formData.total_holes}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Number of holes cannot be changed after creation</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 1
            </label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Hole Photos */}
          {holes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hole Preview Photos
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Upload a preview photo for each hole to show sponsors what they're sponsoring.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {holes.map((hole) => (
                  <div key={hole.id} className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-gray-600">
                      Hole {hole.hole_number}
                      {hole.hole_name && ` — ${hole.hole_name}`}
                    </span>
                    <div className="relative group">
                      {hole.photo_url ? (
                        <div className="relative rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={hole.photo_url}
                            alt={`Hole ${hole.hole_number}`}
                            className="w-full h-28 object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => holePhotoInputRefs.current[hole.id]?.click()}
                              className="bg-white text-gray-800 p-1.5 rounded-lg hover:bg-gray-100 transition"
                              title="Replace photo"
                            >
                              <Upload size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveHolePhoto(hole.id)}
                              className="bg-red-600 text-white p-1.5 rounded-lg hover:bg-red-700 transition"
                              title="Remove photo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => holePhotoInputRefs.current[hole.id]?.click()}
                          disabled={holePhotoUploading === hole.id}
                          className="w-full h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-amber-400 hover:bg-amber-50 transition group/btn"
                        >
                          {holePhotoUploading === hole.id ? (
                            <Loader2 size={20} className="text-amber-500 animate-spin" />
                          ) : (
                            <>
                              <ImageIcon size={20} className="text-gray-400 group-hover/btn:text-amber-500 transition" />
                              <span className="text-xs text-gray-400 group-hover/btn:text-amber-600 transition">
                                Add photo
                              </span>
                            </>
                          )}
                        </button>
                      )}
                      <input
                        ref={(el) => { holePhotoInputRefs.current[hole.id] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => handleHolePhotoChange(hole.id, e)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advertisement Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Advertisement Types
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Select which types of advertisements you'll allow sponsors to purchase
            </p>
            <div className="space-y-2">
              {adTypes.map((adType) => (
                <label
                  key={adType.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAdTypes.includes(adType.id)}
                    onChange={() => toggleAdType(adType.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{adType.name}</p>
                    <p className="text-sm text-gray-600">{adType.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
