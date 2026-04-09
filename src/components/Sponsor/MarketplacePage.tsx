import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, MapPin, Phone, Mail } from 'lucide-react';

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
}

interface MarketplacePageProps {
  onViewCourse?: (courseId: string) => void;
}

export function MarketplacePage({ onViewCourse }: MarketplacePageProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = courses.filter(
        (course) =>
          course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.zip_code?.includes(searchTerm)
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses(courses);
    }
  }, [searchTerm, courses]);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
      setFilteredCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading courses...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Find Golf Courses</h2>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by course name, city, state, or zip code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No courses found</h3>
          <p className="text-gray-600">
            {searchTerm
              ? 'Try adjusting your search criteria'
              : 'No golf courses are currently available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
            >
              <div className="h-48 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <MapPin size={64} className="text-white opacity-50" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{course.name}</h3>
                <div className="space-y-2 mb-4">
                  {(course.city || course.state) && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                      <span>
                        {[course.city, course.state].filter(Boolean).join(', ')}
                        {course.zip_code && ` ${course.zip_code}`}
                      </span>
                    </div>
                  )}
                  {course.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={16} />
                      <span>{course.contact_phone}</span>
                    </div>
                  )}
                  {course.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={16} />
                      <span>{course.contact_email}</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {course.total_holes} holes
                </p>
                {course.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>
                )}
                <button
                  onClick={() => onViewCourse?.(course.id)}
                  className="w-full bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition"
                >
                  View Sponsorship Options
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
