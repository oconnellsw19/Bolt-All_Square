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

      console.log('Courses:', courses, 'Error:', coursesError);

      const courseIds = courses?.map((c) => c.id) || [];

      if (courseIds.length === 0) {
        console.log('No courses found for manager');
        setSponsorships([]);
        setLoading(false);
        return;
      }

      const { data: holes, error: holesError } = await supabase
        .from('holes')
        .select('id')
        .in('course_id', courseIds);

      console.log('Holes:', holes, 'Error:', holesError);

      const holeIds = holes?.map((h) => h.id) || [];

      if (holeIds.length === 0) {
        console.log('No holes found for courses');
        setSponsorships([]);
        setLoading(false);
        return;
      }

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

      console.log('Sponsorships query result:', { data, error, holeIds });

      if (error) {
        console.error('Query error details:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('First sponsorship structure:', JSON.stringify(data[0], null, 2));
      }

      setSponsorships(data || []);
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
      console.log('Attempting to approve sponsorship:', selectedSponsorship.id);

      const { data, error } = await supabase
        .from('sponsorships')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approval_message: approvalMessage || null,
        })
        .eq('id', selectedSponsorship.id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('No rows were updated');
        alert('Failed to approve sponsorship. You may not have permission to update this sponsorship.');
        return;
      }

      console.log('Successfully approved sponsorship');
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
      console.log('Attempting to deny sponsorship:', selectedSponsorship.id);

      const { data, error } = await supabase
        .from('sponsorships')
        .update({
          status: 'denied',
          denied_at: new Date().toISOString(),
          denial_reason: denialReason,
        })
        .eq('id', selectedSponsorship.id)
        .select();

      console.log('Deny update result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('No rows were updated');
        alert('Failed to deny sponsorship. You may not have permission to update this sponsorship.');
        return;
      }

      console.log('Successfully denied sponsorship');
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
            console.log('Rendering sponsorship:', {
              id: sponsorship.id,
              hasHole: !!sponsorship.hole,
              hasSponsor: !!sponsorship.sponsor,
              hasAdType: !!sponsorship.advertisement_type,
              sponsorship
            });

            const hole = sponsorship.hole || {};
            const sponsor = sponsorship.sponsor || {};
            const adType = sponsorship.advertisement_type || {};
            const course = hole.course || {};

            return (
              <div key={sponsorship.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {course.name || 'Unknown Course'} - Hole {hole.hole_number || 'N/A'}
                        {hole.hole_name && (
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
                        {sponsor.company_name || sponsor.full_name || 'Unknown Sponsor'}
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
                    <p className="font-medium text-gray-800">${sponsorship.total_amount.toFixed(2)}</p>
                  </div>
                </div>

                {sponsorship.artwork.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Files</p>
                    <div className="flex flex-wrap gap-2">
                      {sponsorship.artwork.map((file) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        >
                          {file.mime_type?.startsWith('image/') ? (
                            <Image size={16} className="text-gray-600" />
                          ) : (
                            <FileText size={16} className="text-gray-600" />
                          )}
                          <span className="text-sm text-gray-700">{file.file_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => openApprovalModal(sponsorship, 'approve')}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
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
                {selectedSponsorship.hole?.course?.name || 'Unknown Course'} - Hole {selectedSponsorship.hole?.hole_number || 'N/A'}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    ? 'bg-green-600 hover:bg-green-700'
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
