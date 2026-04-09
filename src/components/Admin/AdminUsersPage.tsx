import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users,
  Building2,
  Briefcase,
  Shield,
  Search,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';

interface Profile {
  id: string;
  role: string;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
  manager_id: string;
  city: string;
  state: string;
}

interface Sponsorship {
  id: string;
  sponsor_id: string;
  hole_id: string | null;
  course_id: string | null;
  total_amount: string;
  allsquare_amount: string;
  status: string;
}

interface Hole {
  id: string;
  course_id: string;
}

type RoleFilter = 'all' | 'course_manager' | 'sponsor' | 'admin';

interface EditForm {
  full_name: string;
  company_name: string;
  phone: string;
}

export function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Edit state
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ full_name: '', company_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        { data: profilesData },
        { data: coursesData },
        { data: sponsorshipsData },
        { data: holesData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('courses').select('id, name, manager_id, city, state'),
        supabase.from('sponsorships').select('id, sponsor_id, hole_id, course_id, total_amount, allsquare_amount, status'),
        supabase.from('holes').select('id, course_id'),
      ]);

      setProfiles(profilesData || []);
      setCourses(coursesData || []);
      setSponsorships(sponsorshipsData || []);
      setHoles(holesData || []);
    } catch (error) {
      console.error('Error loading users data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (profile: Profile) => {
    setEditingUser(profile.id);
    setEditForm({
      full_name: profile.full_name || '',
      company_name: profile.company_name || '',
      phone: profile.phone || '',
    });
    setConfirmDelete(null);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({ full_name: '', company_name: '', phone: '' });
  };

  const handleSave = async (profileId: string) => {
    if (!editForm.full_name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim(),
          company_name: editForm.company_name.trim() || null,
          phone: editForm.phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      if (!error) {
        setProfiles(profiles.map(p =>
          p.id === profileId
            ? { ...p, full_name: editForm.full_name.trim(), company_name: editForm.company_name.trim() || null, phone: editForm.phone.trim() || null }
            : p
        ));
        setEditingUser(null);
        setSaveSuccess(profileId);
        setTimeout(() => setSaveSuccess(null), 2000);
      } else {
        console.error('Error saving profile:', error);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (!error) {
        setProfiles(profiles.filter(p => p.id !== profileId));
        setConfirmDelete(null);
        setExpandedUser(null);
      } else {
        console.error('Error deleting user:', error);
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setDeleting(false);
    }
  };

  const getCourseIdForSponsorship = (s: Sponsorship): string | null => {
    if (s.course_id) return s.course_id;
    if (s.hole_id) {
      const hole = holes.find((h) => h.id === s.hole_id);
      return hole?.course_id || null;
    }
    return null;
  };

  const getManagerStats = (userId: string) => {
    const userCourses = courses.filter((c) => c.manager_id === userId);
    const courseIds = userCourses.map((c) => c.id);
    const courseHoleIds = holes.filter((h) => courseIds.includes(h.course_id)).map((h) => h.id);

    const courseSponsorships = sponsorships.filter((s) => {
      if (s.course_id && courseIds.includes(s.course_id)) return true;
      if (s.hole_id && courseHoleIds.includes(s.hole_id)) return true;
      return false;
    });

    const totalRevenue = courseSponsorships.reduce(
      (sum, s) => sum + parseFloat(s.total_amount || '0'), 0
    );
    const activeCount = courseSponsorships.filter(
      (s) => s.status === 'active' || s.status === 'approved'
    ).length;

    return {
      courses: userCourses,
      totalSponsorships: courseSponsorships.length,
      totalRevenue,
      activeCount,
    };
  };

  const getSponsorStats = (userId: string) => {
    const userSponsorships = sponsorships.filter((s) => s.sponsor_id === userId);
    const totalSpent = userSponsorships.reduce(
      (sum, s) => sum + parseFloat(s.total_amount || '0'), 0
    );
    const allSquareRevenue = userSponsorships.reduce(
      (sum, s) => sum + parseFloat(s.allsquare_amount || '0'), 0
    );
    const activeCount = userSponsorships.filter(
      (s) => s.status === 'active' || s.status === 'approved'
    ).length;

    const coursesSponsored = new Set<string>();
    userSponsorships.forEach((s) => {
      const cId = getCourseIdForSponsorship(s);
      if (cId) coursesSponsored.add(cId);
    });

    return {
      totalSponsorships: userSponsorships.length,
      totalSpent,
      allSquareRevenue,
      activeCount,
      coursesSponsored: coursesSponsored.size,
    };
  };

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  const filteredProfiles = profiles.filter((p) => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(q) ||
        p.company_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const managerCount = profiles.filter((p) => p.role === 'course_manager').length;
  const sponsorCount = profiles.filter((p) => p.role === 'sponsor').length;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;

  const roleIcons: Record<string, typeof Users> = {
    course_manager: Building2,
    sponsor: Briefcase,
    admin: Shield,
  };

  const roleColors: Record<string, { bg: string; text: string; badge: string }> = {
    course_manager: { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700' },
    sponsor: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
    admin: { bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Users</h2>
          <p className="text-gray-500 text-sm">{profiles.length} total users on the platform</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg">
            <Building2 size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{managerCount}</p>
            <p className="text-sm text-gray-500">Course Managers</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Briefcase size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{sponsorCount}</p>
            <p className="text-sm text-gray-500">Sponsors</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-lg">
            <Shield size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{adminCount}</p>
            <p className="text-sm text-gray-500">Admins</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[
            { value: 'all' as RoleFilter, label: 'All' },
            { value: 'course_manager' as RoleFilter, label: 'Managers' },
            { value: 'sponsor' as RoleFilter, label: 'Sponsors' },
            { value: 'admin' as RoleFilter, label: 'Admins' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRoleFilter(value)}
              className={`px-4 py-2 text-sm font-medium transition ${
                roleFilter === value
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {filteredProfiles.map((profile) => {
          const isExpanded = expandedUser === profile.id;
          const colors = roleColors[profile.role] || roleColors.admin;
          const RoleIcon = roleIcons[profile.role] || Shield;
          const isEditing = editingUser === profile.id;
          const isConfirmingDelete = confirmDelete === profile.id;

          return (
            <div key={profile.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => {
                  if (!isEditing && !isConfirmingDelete) {
                    setExpandedUser(isExpanded ? null : profile.id);
                    setEditingUser(null);
                    setConfirmDelete(null);
                  }
                }}
                className="w-full p-4 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`${colors.bg} p-2.5 rounded-lg`}>
                      <RoleIcon size={20} className={colors.text} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{profile.full_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                          {profile.role.replace('_', ' ')}
                        </span>
                        {saveSuccess === profile.id && (
                          <span className="text-xs text-emerald-600 font-medium">Saved!</span>
                        )}
                      </div>
                      {profile.company_name && (
                        <p className="text-sm text-gray-500">{profile.company_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {profile.role === 'course_manager' && (
                      <div className="text-right text-sm">
                        <p className="font-semibold text-gray-800">
                          {fmt(getManagerStats(profile.id).totalRevenue)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {getManagerStats(profile.id).courses.length} course{getManagerStats(profile.id).courses.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                    {profile.role === 'sponsor' && (
                      <div className="text-right text-sm">
                        <p className="font-semibold text-gray-800">
                          {fmt(getSponsorStats(profile.id).totalSpent)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {getSponsorStats(profile.id).totalSponsorships} sponsorship{getSponsorStats(profile.id).totalSponsorships !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 p-5 bg-gray-50">
                  {/* Action buttons */}
                  {profile.role !== 'admin' && !isEditing && !isConfirmingDelete && (
                    <div className="flex gap-2 mb-5">
                      <button
                        onClick={() => startEditing(profile)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition"
                      >
                        <Pencil size={14} />
                        Edit Contact Info
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(profile.id); setEditingUser(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                      >
                        <Trash2 size={14} />
                        Remove User
                      </button>
                    </div>
                  )}

                  {/* Delete Confirmation */}
                  {isConfirmingDelete && (
                    <div className="mb-5 bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-800 mb-1">Remove {profile.full_name}?</h4>
                          <p className="text-sm text-red-600 mb-3">
                            This will permanently remove this {profile.role === 'course_manager' ? 'course manager' : 'sponsor'} and their profile from the platform.
                            {profile.role === 'course_manager' && getManagerStats(profile.id).courses.length > 0 && (
                              <span className="font-medium"> Their courses and associated sponsorships may be affected.</span>
                            )}
                            {profile.role === 'sponsor' && getSponsorStats(profile.id).totalSponsorships > 0 && (
                              <span className="font-medium"> Their sponsorship records will remain but the sponsor profile will be removed.</span>
                            )}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(profile.id)}
                              disabled={deleting}
                              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                              {deleting ? 'Removing...' : 'Yes, Remove User'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit Form */}
                  {isEditing && (
                    <div className="mb-5 bg-white border border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Pencil size={16} className="text-amber-600" />
                        Edit Contact Information
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                          <input
                            type="text"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                          <input
                            type="text"
                            value={editForm.company_name}
                            onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Company name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Phone number"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(profile.id)}
                          disabled={saving || !editForm.full_name.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition disabled:opacity-50"
                        >
                          <Save size={14} />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Contact Info */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Contact Information</h4>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-600">
                          <span className="font-medium">Name:</span> {profile.full_name}
                        </p>
                        {profile.company_name && (
                          <p className="text-gray-600">
                            <span className="font-medium">Company:</span> {profile.company_name}
                          </p>
                        )}
                        {profile.phone && (
                          <p className="text-gray-600 flex items-center gap-1">
                            <Phone size={14} /> {profile.phone}
                          </p>
                        )}
                        <p className="text-gray-600">
                          <span className="font-medium">Joined:</span>{' '}
                          {new Date(profile.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Role-specific info */}
                    {profile.role === 'course_manager' && (() => {
                      const stats = getManagerStats(profile.id);
                      return (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Manager Stats</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Courses</span>
                              <span className="font-medium">{stats.courses.length}</span>
                            </div>
                            {stats.courses.map((c) => (
                              <p key={c.id} className="text-gray-500 pl-4 text-xs">
                                {c.name} - {[c.city, c.state].filter(Boolean).join(', ')}
                              </p>
                            ))}
                            <div className="flex justify-between pt-2">
                              <span className="text-gray-600">Total Revenue</span>
                              <span className="font-semibold text-gray-800">{fmt(stats.totalRevenue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Sponsorships</span>
                              <span className="font-medium">{stats.totalSponsorships}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Active Sponsorships</span>
                              <span className="font-medium">{stats.activeCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {profile.role === 'sponsor' && (() => {
                      const stats = getSponsorStats(profile.id);
                      return (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Sponsor Stats</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Spent</span>
                              <span className="font-semibold text-gray-800">{fmt(stats.totalSpent)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-emerald-600">Revenue to All Square</span>
                              <span className="font-semibold text-emerald-600">{fmt(stats.allSquareRevenue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Sponsorships</span>
                              <span className="font-medium">{stats.totalSponsorships}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Active Sponsorships</span>
                              <span className="font-medium">{stats.activeCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Courses Sponsored</span>
                              <span className="font-medium">{stats.coursesSponsored}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {profile.role === 'admin' && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Admin Account</h4>
                        <p className="text-sm text-gray-500">Platform administrator with full access.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredProfiles.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No users found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search term' : 'No users matching the selected filter'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
