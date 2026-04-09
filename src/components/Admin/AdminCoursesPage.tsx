import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  MapPin,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Search,
  Percent,
  Save,
  Check,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  city: string;
  state: string;
  total_holes: number;
  contact_email: string;
  contact_phone: string;
  manager_id: string;
  created_at: string;
  platform_fee_percent: number;
}

interface Sponsorship {
  id: string;
  hole_id: string | null;
  course_id: string | null;
  advertisement_type_id: string;
  total_amount: string;
  course_amount: string;
  allsquare_amount: string;
  status: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  company_name: string | null;
  role: string;
}

interface Hole {
  id: string;
  course_id: string;
}

interface AdType {
  id: string;
  name: string;
}

interface CourseAdType {
  course_id: string;
  advertisement_type_id: string;
}

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [adTypes, setAdTypes] = useState<AdType[]>([]);
  const [courseAdTypes, setCourseAdTypes] = useState<CourseAdType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'date'>('revenue');
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [feeValue, setFeeValue] = useState<string>('');
  const [savingFee, setSavingFee] = useState(false);
  const [feeSaved, setFeeSaved] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        { data: coursesData },
        { data: sponsorshipsData },
        { data: profilesData },
        { data: holesData },
        { data: adTypesData },
        { data: courseAdTypesData },
      ] = await Promise.all([
        supabase.from('courses').select('id, name, city, state, total_holes, contact_email, contact_phone, manager_id, created_at, platform_fee_percent').order('name'),
        supabase.from('sponsorships').select('id, hole_id, course_id, advertisement_type_id, total_amount, course_amount, allsquare_amount, status, created_at'),
        supabase.from('profiles').select('id, full_name, company_name, role'),
        supabase.from('holes').select('id, course_id'),
        supabase.from('advertisement_types').select('id, name'),
        supabase.from('course_advertisement_types').select('course_id, advertisement_type_id'),
      ]);

      setCourses(coursesData || []);
      setSponsorships(sponsorshipsData || []);
      setProfiles(profilesData || []);
      setHoles(holesData || []);
      setAdTypes(adTypesData || []);
      setCourseAdTypes(courseAdTypesData || []);
    } catch (error) {
      console.error('Error loading admin courses data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFee = async (courseId: string) => {
    const numVal = parseFloat(feeValue);
    if (isNaN(numVal) || numVal < 0 || numVal > 100) return;

    setSavingFee(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ platform_fee_percent: numVal })
        .eq('id', courseId);

      if (!error) {
        setCourses(courses.map(c =>
          c.id === courseId ? { ...c, platform_fee_percent: numVal } : c
        ));
        setEditingFee(null);
        setFeeSaved(courseId);
        setTimeout(() => setFeeSaved(null), 2000);
      }
    } catch (err) {
      console.error('Error updating fee:', err);
    } finally {
      setSavingFee(false);
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

  const getCourseStats = (courseId: string) => {
    const courseSponsorships = sponsorships.filter(
      (s) => getCourseIdForSponsorship(s) === courseId
    );
    const totalRevenue = courseSponsorships.reduce(
      (sum, s) => sum + parseFloat(s.total_amount || '0'), 0
    );
    const allSquareRevenue = courseSponsorships.reduce(
      (sum, s) => sum + parseFloat(s.allsquare_amount || '0'), 0
    );
    const courseRevenue = courseSponsorships.reduce(
      (sum, s) => sum + parseFloat(s.course_amount || '0'), 0
    );
    const pendingCount = courseSponsorships.filter((s) => s.status === 'pending').length;
    const activeCount = courseSponsorships.filter(
      (s) => s.status === 'active' || s.status === 'approved'
    ).length;
    const uniqueSponsors = new Set(
      courseSponsorships.map((s) => s.advertisement_type_id)
    ).size;

    return {
      sponsorships: courseSponsorships,
      totalRevenue,
      allSquareRevenue,
      courseRevenue,
      pendingCount,
      activeCount,
      totalCount: courseSponsorships.length,
      uniqueAdTypes: uniqueSponsors,
    };
  };

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

  const filteredCourses = courses
    .filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'revenue') {
        return getCourseStats(b.id).totalRevenue - getCourseStats(a.id).totalRevenue;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalPlatformRevenue = sponsorships.reduce(
    (sum, s) => sum + parseFloat(s.total_amount || '0'), 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading courses...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">All Courses</h2>
          <p className="text-gray-500 text-sm">{courses.length} registered courses on the platform</p>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses by name, city, or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'revenue' | 'date')}
          className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-amber-500"
        >
          <option value="revenue">Sort by Revenue</option>
          <option value="name">Sort by Name</option>
          <option value="date">Sort by Date Added</option>
        </select>
      </div>

      {/* Course Cards */}
      <div className="space-y-4">
        {filteredCourses.map((course) => {
          const stats = getCourseStats(course.id);
          const manager = profiles.find((p) => p.id === course.manager_id);
          const courseHoles = holes.filter((h) => h.course_id === course.id);
          const enabledAdTypes = courseAdTypes
            .filter((cat) => cat.course_id === course.id)
            .map((cat) => adTypes.find((at) => at.id === cat.advertisement_type_id))
            .filter(Boolean);
          const isExpanded = expandedCourse === course.id;
          const revenuePct = totalPlatformRevenue > 0
            ? (stats.totalRevenue / totalPlatformRevenue) * 100
            : 0;

          return (
            <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                className="w-full p-5 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <Building2 size={24} className="text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{course.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {(course.city || course.state) && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {[course.city, course.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span>{course.total_holes} holes</span>
                        <span>Manager: {manager?.full_name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-800">{fmt(stats.totalRevenue)}</p>
                      <p className="text-xs text-emerald-600">AS: {fmt(stats.allSquareRevenue)}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stats.activeCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {stats.activeCount} active
                      </span>
                      {stats.pendingCount > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          {stats.pendingCount} pending
                        </span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {/* Revenue bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 rounded-full h-1.5 transition-all"
                      style={{ width: `${Math.max(revenuePct, 1)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {revenuePct.toFixed(1)}% of platform revenue &middot; {stats.totalCount} total sponsorships
                  </p>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 p-5 bg-gray-50">
                  {/* Platform Fee Control */}
                  <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-50 p-2 rounded-lg">
                          <Percent size={20} className="text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">Platform Fee</h4>
                          <p className="text-xs text-gray-500">All Square's commission on sponsorships for this course</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {editingFee === course.id ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={feeValue}
                                onChange={(e) => setFeeValue(e.target.value)}
                                className="w-24 px-3 py-1.5 pr-8 border border-amber-300 rounded-lg text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveFee(course.id);
                                  if (e.key === 'Escape') setEditingFee(null);
                                }}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                            </div>
                            <button
                              onClick={() => handleSaveFee(course.id)}
                              disabled={savingFee}
                              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              <Save size={14} />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingFee(null)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-800">
                              {course.platform_fee_percent}%
                            </span>
                            {feeSaved === course.id ? (
                              <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                                <Check size={16} /> Saved
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingFee(course.id);
                                  setFeeValue(String(course.platform_fee_percent));
                                }}
                                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition"
                              >
                                Adjust Fee
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 text-xs text-gray-500">
                      <span>Course keeps <strong className="text-gray-700">{(100 - course.platform_fee_percent).toFixed(1)}%</strong> of each sponsorship</span>
                      <span>·</span>
                      <span>All Square earns <strong className="text-emerald-600">{course.platform_fee_percent}%</strong> commission</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Course Details */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Course Details</h4>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-600">
                          <span className="font-medium">Manager:</span> {manager?.full_name || 'Unknown'}
                        </p>
                        {course.contact_email && (
                          <p className="text-gray-600 flex items-center gap-1">
                            <Mail size={14} /> {course.contact_email}
                          </p>
                        )}
                        {course.contact_phone && (
                          <p className="text-gray-600 flex items-center gap-1">
                            <Phone size={14} /> {course.contact_phone}
                          </p>
                        )}
                        <p className="text-gray-600">
                          <span className="font-medium">Holes configured:</span> {courseHoles.length} / {course.total_holes}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Joined:</span>{' '}
                          {new Date(course.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Enabled Ad Types */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Enabled Ad Types</h4>
                      {enabledAdTypes.length === 0 ? (
                        <p className="text-sm text-gray-400">No ad types enabled</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {enabledAdTypes.map((at) => (
                            <span
                              key={at!.id}
                              className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700"
                            >
                              {at!.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Revenue Breakdown */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Revenue Breakdown</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Revenue</span>
                          <span className="font-semibold text-gray-800">{fmt(stats.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-600">All Square ({course.platform_fee_percent}%)</span>
                          <span className="font-semibold text-emerald-600">{fmt(stats.allSquareRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Course Payout ({100 - course.platform_fee_percent}%)</span>
                          <span className="font-semibold text-blue-600">{fmt(stats.courseRevenue)}</span>
                        </div>
                        <hr className="my-1" />
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Sponsorships</span>
                          <span className="font-medium">{stats.activeCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending</span>
                          <span className="font-medium">{stats.pendingCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total All-Time</span>
                          <span className="font-medium">{stats.totalCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Sponsorships for this course */}
                  {stats.sponsorships.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-700 mb-3">Recent Sponsorships</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Ad Type</th>
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Status</th>
                              <th className="text-right py-2 px-2 text-gray-500 font-medium">Total</th>
                              <th className="text-right py-2 px-2 text-gray-500 font-medium">AS Rev</th>
                              <th className="text-left py-2 px-2 text-gray-500 font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.sponsorships.slice(0, 5).map((s) => {
                              const adType = adTypes.find((a) => a.id === s.advertisement_type_id);
                              const statusColors: Record<string, string> = {
                                pending: 'bg-yellow-100 text-yellow-700',
                                approved: 'bg-blue-100 text-blue-700',
                                active: 'bg-green-100 text-green-700',
                                completed: 'bg-gray-100 text-gray-700',
                                denied: 'bg-red-100 text-red-700',
                                cancelled: 'bg-gray-100 text-gray-500',
                              };
                              return (
                                <tr key={s.id} className="border-b border-gray-100">
                                  <td className="py-2 px-2 text-gray-700">{adType?.name || '---'}</td>
                                  <td className="py-2 px-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[s.status] || 'bg-gray-100 text-gray-600'}`}>
                                      {s.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-right font-medium text-gray-800">
                                    {fmt(parseFloat(s.total_amount || '0'))}
                                  </td>
                                  <td className="py-2 px-2 text-right font-medium text-emerald-600">
                                    {fmt(parseFloat(s.allsquare_amount || '0'))}
                                  </td>
                                  <td className="py-2 px-2 text-gray-500">
                                    {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No courses found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search term' : 'No courses registered yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
