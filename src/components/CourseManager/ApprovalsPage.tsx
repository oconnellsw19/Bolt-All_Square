import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, FileText, Image } from 'lucide-react';

interface Sponsorship {
  id: string;
  start_date: string;
  end_date: string;
  duration_type: string;
  total_amount: number;
  status: string;
  created_at: string;
  sponsor: {
    full_name: string;
    company_name: string;
  } | null;
  hole: {
    hole_number: number;
    hole_name: string | null;
    course: {
      name: string;
    };
  } | null;
  advertisement_type: {
    name: string;
    description: string;
  } | null;
  artwork: Array<{
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    mime_type: string;
    created_at: string;
  }>;
}

export function ApprovalsPage() {
  const { profile } = useAuth();
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSponsorship, setSelectedSponsorship] = useState<Sponsorship | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'deny'>('approve');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadPendingSponsorships();
    }
  }, [profile]);

  const loadPendingSponsorships = async () => {
    try {
      setLoading(true);

      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('manager_id', profile?.id);

      const courseIds = courses?.map((c) => c.id) || [];

      if (courseIds.length === 0) {
        setSponsorships([]);
        setLoading(false);
        return;
      }

      const { data: holes } = await supabase
        .from('holes')
        .select('id')
        .in('course_id', courseIds);

      const holeIds = holes?.map((h) => h.id) || [];

      // Fetch hole-level pending sponsorships
      let holeSponsorships: Sponsorship[] = [];
      if (holeIds.length > 0) {
        const { data, error } = await supabase
          .from('sponsorships')
          .select(`
            *,
            sponsor:profiles!sponsorships_sponsor_id_fkey(full_name, company_name),
            hole:holes!sponsorships_hole_id_fkey(
              hole_number,
              hole_name,
              course:courses!holes_course_id_fkey(name)
            ),
            advertisement_type:advertisement_types!sponsorships_advertisement_type_id_fkey(name, description),
            artwork(id, file_url, file_name, file_type, mime_type, created_at)
          `)
          .in('hole_id', holeIds)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) throw error;
        holeSponsorships = data || [];
      }

      // Fetch course-level pending sponsorships
      const { data: courseData, error: courseError } = await supabase
        .from('sponsorships')
        .select(`
          *,
          sponsor:profiles!sponsorships_sponsor_id_fkey(full_name, company_name),
          advertisement_type:advertisement_types!sponsorships_advertisement_type_id_fkey(name, description),
          artwork(id, file_url, file_name, file_type, mime_type, created_at)
        `)
        .in('course_id', courseIds)
        .is('hole_id', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (courseError) throw courseError;
      const courseSponsorships = (courseData || []).map((s: any) => ({ ...s, hole: null }));

      // Merge and sort
      const all = [...holeSponsorships, ...courseSponsorships].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setSponsorships(all);
    } catch (error) {
      console.error('Error loading sponsorships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSponsorship) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase
        .from('sponsorships')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approval_message: approvalMessage || null,
        })
        .eq('id', selectedSponsorship.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('Failed to approve sponsorship. You may not have permission to update this sponsorship.');
        return;
      }

      setShowApprovalModal(false);
      setApprovalMessage('');
      setSelectedSponsorship(null);

      // Remove the approved sponsorship from the local state immediately
      setSponsorships(prev => prev.filter(s => s.id !== selectedSponsorship.id));
    } catch (error) {
      console.error('Error approving sponsorship:', error);
      alert(`Failed to approve sponsorship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedSponsorship || !denialReason.trim()) {
      alert('Please provide a reason for denial');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase
        .from('sponsorships')
        .update({
          status: 'denied',
          denied_at: new Date().toISOString(),
          denial_reason: denialReason,
        })
        .eq('id', selectedSponsorship.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('Failed to deny sponsorship. You may not have permission to update this sponsorship.');
        return;
      }

      setShowApprovalModal(false);
      setDenialReason('');
      setSelectedSponsorship(null);

      // Remove the denied sponsorship from the local state immediately
      setSponsorships(prev => prev.filter(s => s.id !== selectedSponsorship.id));
    } catch (error) {
      console.error('Error denying sponsorship:', error);
      alert(`Failed to deny sponsorship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const openApprovalModal = (sponsorship: Sponsorship, action: 'approve' | 'deny') => {
    setSelectedSponsorship(sponsorship);
    setActionType(action);
    setShowApprovalModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pending approvals...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Pending Approvals</h2>
        <p className="text-gray-600">Review and approve or deny sponsorship requests for your courses</p>
      </div>

{sponsorships.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Clock size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No pending approvals</h3>
          <p className="text-gray-600">All sponsorship requests have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sponsorships.map((sponsorship) => {
            const hole = sponsorship.hole || null;
            const sponsor = sponsorship.sponsor || { full_name: '', company_name: '' };
            const adType = sponsorship.advertisement_type || { name: '', description: '' };
            const course = hole?.course || { name: '' };
            const isCourseWide = !sponsorship.hole_id;

            return (
              <div key={sponsorship.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {isCourseWide
                          ? 'Course-Wide Sponsorship'
                          : `${course.name || 'Course'} - Hole ${hole?.hole_number || 'N/A'}`}
                        {hole?.hole_name && (
                          <span className="font-normal ml-2">({hole.hole_name})</span>
                        )}
                      </h3>
                      <p className="text-gray-600">
                        {adType.name || 'Unknown Type'} {adType.description && `- ${adType.description}`}
                      </p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                      Pending
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Sponsor</p>
                      <p className="font-medium text-gray-800">
                        {sponsor?.company_name || sponsor?.full_name || 'Unknown Sponsor'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium text-gray-800">
                        {new Date(sponsorship.start_date).toLocaleDateString()} -{' '}
                        {new Date(sponsorship.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-medium text-gray-800 capitalize">{sponsorship.duration_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="font-medium text-gray-800">${Number(sponsorship.total_amount).toFixed(2)}</p>
                    </div>
                  </div>

                {sponsorship.artwork.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Submitted Ad Image{sponsorship.artwork.length > 1 ? 's' : ''}</p>
                    <div className="flex flex-wrap gap-3">
                      {sponsorship.artwork.map((file) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block"
                        >
                          {file.mime_type?.startsWith('image/') ? (
                            <div className="relative">
                              <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 group-hover:border-amber-400 transition bg-white">
                                <img
                                  src={file.file_url}
                                  alt={file.file_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1 truncate max-w-[128px]">{file.file_name}</p>
                            </div>
                          ) : (
                            <div className="w-32 h-32 rounded-lg border-2 border-gray-200 group-hover:border-amber-400 transition bg-gray-50 flex flex-col items-center justify-center p-2">
                              <FileText size={28} className="text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 text-center truncate max-w-[112px]">{file.file_name}</p>
                              <p className="text-[10px] text-amber-600 mt-1">View PDF</p>
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => openApprovalModal(sponsorship, 'approve')}
                    className="flex-1 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} />
                    Approve
                  </button>
                  <button
                    onClick={() => openApprovalModal(sponsorship, 'deny')}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <XCircle size={20} />
                    Deny
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {showApprovalModal && selectedSponsorship && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {actionType === 'approve' ? 'Approve Sponsorship' : 'Deny Sponsorship'}
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Sponsor</p>
              <p className="font-medium text-gray-800 mb-2">
                {selectedSponsorship.sponsor?.company_name || selectedSponsorship.sponsor?.full_name || 'Unknown Sponsor'}
              </p>
              <p className="text-sm text-gray-600 mb-1">Details</p>
              <p className="font-medium text-gray-800">
                {selectedSponsorship.hole
                  ? `${selectedSponsorship.hole.course?.name || 'Course'} - Hole ${selectedSponsorship.hole.hole_number}`
                  : 'Course-Wide Sponsorship'}
              </p>
            </div>

            {actionType === 'approve' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Message (Optional)
                </label>
                <textarea
                  value={approvalMessage}
                  onChange={(e) => setApprovalMessage(e.target.value)}
                  rows={4}
                  placeholder="Add a message to send with the approval..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be visible to the sponsor
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Denial *
                </label>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Please explain why this request is being denied..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be sent to the sponsor
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalMessage('');
                  setDenialReason('');
                  setSelectedSponsorship(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={actionType === 'approve' ? handleApprove : handleDeny}
                disabled={processing}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Deny'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
