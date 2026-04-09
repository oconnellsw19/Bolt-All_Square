import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, MapPin, Edit, Trash2, Eye } from 'lucide-react';
import { CreateCourseModal } from './CreateCourseModal';
import { EditCourseModal } from './EditCourseModal';
import { CourseDetailView } from './CourseDetailView';

interface Course {
  id: string;
  name: string;
  city: string;
  state: string;
  total_holes: number;
  description: string;
}

export function CoursesPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);

  useEffect(() => {
    loadCourses();
  }, [profile]);

  const loadCourses = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('manager_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseCreated = () => {
    setShowCreateModal(false);
    loadCourses();
  };

  const handleCourseUpdated = () => {
    setShowEditModal(false);
    setSelectedCourseId(null);
    loadCourses();
  };

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`Are you sure you want to delete ${courseName}? This will also delete all holes and pricing data.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  if (viewingCourse) {
    return (
      <CourseDetailView
        courseId={viewingCourse.id}
        courseName={viewingCourse.name}
        onBack={() => setViewingCourse(null)}
      />
    );
  }

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
        <h2 className="text-2xl font-bold text-gray-800">My Courses</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition flex items-center gap-2"
        >
          <Plus size={20} />
          Add Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No courses yet</h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first golf course
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600 transition"
          >
            Add Your First Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="h-48 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                <MapPin size={64} className="text-white opacity-50" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{course.name}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {course.city}, {course.state} • {course.total_holes} holes
                </p>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {course.description || 'No description provided'}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setViewingCourse(course)}
                    className="w-full bg-amber-500 text-white px-3 py-2 rounded-lg hover:bg-amber-600 transition flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    View Holes & Pricing
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setShowEditModal(true);
                      }}
                      className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.name)}
                      className="p-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCourseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCourseCreated}
        />
      )}

      {showEditModal && selectedCourseId && (
        <EditCourseModal
          courseId={selectedCourseId}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCourseId(null);
          }}
          onSuccess={handleCourseUpdated}
        />
      )}
    </div>
  );
}
