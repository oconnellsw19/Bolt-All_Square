import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import { RegisterPage } from './components/Auth/RegisterPage';
import { Navigation } from './components/Layout/Navigation';
import { CourseManagerDashboard } from './components/CourseManager/CourseManagerDashboard';
import { CoursesPage } from './components/CourseManager/CoursesPage';
import { ApprovalsPage } from './components/CourseManager/ApprovalsPage';
import { SponsorshipsPage } from './components/CourseManager/SponsorshipsPage';
import { OutingsPage } from './components/CourseManager/OutingsPage';
import { SponsorDashboard } from './components/Sponsor/SponsorDashboard';
import { MarketplacePage } from './components/Sponsor/MarketplacePage';
import { CourseDetailsPage } from './components/Sponsor/CourseDetailsPage';
import { MySponsorshipsPage } from './components/Sponsor/MySponsorshipsPage';
import { AdminDashboard } from './components/Admin/AdminDashboard';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [sponsorshipFilter, setSponsorshipFilter] = useState<string>('all');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return authView === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  const renderContent = () => {
    if (profile.role === 'course_manager') {
      switch (currentView) {
        case 'dashboard':
          return <CourseManagerDashboard onNavigate={setCurrentView} />;
        case 'courses':
          return <CoursesPage />;
        case 'approvals':
          return <ApprovalsPage />;
        case 'sponsorships':
          return <SponsorshipsPage />;
        case 'outings':
          return <OutingsPage />;
        default:
          return <CourseManagerDashboard onNavigate={setCurrentView} />;
      }
    } else if (profile.role === 'sponsor') {
      if (currentView === 'course-details' && selectedCourseId) {
        return (
          <CourseDetailsPage
            courseId={selectedCourseId}
            onBack={() => {
              setCurrentView('marketplace');
              setSelectedCourseId(null);
            }}
          />
        );
      }

      switch (currentView) {
        case 'dashboard':
          return (
            <SponsorDashboard
              onNavigate={(view, filter) => {
                if (filter) setSponsorshipFilter(filter);
                setCurrentView(view);
              }}
            />
          );
        case 'marketplace':
          return (
            <MarketplacePage
              onViewCourse={(courseId) => {
                setSelectedCourseId(courseId);
                setCurrentView('course-details');
              }}
            />
          );
        case 'my-sponsorships':
          return (
            <MySponsorshipsPage
              initialFilter={sponsorshipFilter as 'all' | 'pending' | 'approved' | 'active' | 'completed' | 'denied' | 'cancelled'}
            />
          );
        default:
          return <SponsorDashboard onNavigate={setCurrentView} />;
      }
    } else if (profile.role === 'admin') {
      switch (currentView) {
        case 'dashboard':
          return <AdminDashboard />;
        case 'sponsorships':
          return <div className="text-gray-600">Sponsorships management coming soon</div>;
        case 'advertisements':
          return <div className="text-gray-600">Advertisement management coming soon</div>;
        case 'settings':
          return <div className="text-gray-600">Settings coming soon</div>;
        default:
          return <AdminDashboard />;
      }
    }

    return <div>Unknown role</div>;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentView={currentView} onNavigate={setCurrentView} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {renderContent()}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
