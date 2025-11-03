import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HomePage } from "@/pages/HomePage";
import { VerifyDoc } from "@/components/VerifyDoc";
import { RegisterIssuer } from "@/components/RegisterIssuer";
import { IssuerDashboard } from "@/components/IssuerDashboard";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { IssueDocument } from "@/components/IssueDocument";
import { ProfilePage } from "@/pages/ProfilePage";
import { UploadModal } from "@/components/ui/upload-modal";
import { ToastNotifications, useToasts } from "@/components/ui/toast-notifications";
import { useAuthContext } from "@/contexts/AuthContext";

const Index = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStage, setUploadStage] = useState<'building' | 'anchoring' | 'complete'>('building');
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToasts();
  
  // Use the authentication context
  const { user, profile, userType, loading: authLoading, signOut } = useAuthContext();
  const isLoggedIn = !!user;

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  const handleLogin = async (loginResult?: any) => {
    // Navigate based on user type from the login result or current auth state
    const detectedUserType = loginResult?.userType || userType;
    
    // Always navigate to unified dashboard; render will choose owner vs issuer
    setCurrentPage('dashboard');
    showSuccess('Login successful', 'Welcome back to TrustDoc!');
  };

  const handleRegister = (userData: any) => {
    // Unified dashboard; rendering chooses by role
    setCurrentPage('dashboard');
    if (userData.userType === 'owner') {
      showSuccess('Registration successful', 'Your owner account has been created');
    } else {
      showSuccess('Registration successful', 'Your issuer account has been created');
    }
  };

  const handleLogout = async () => {
    try {
      // Sign out from Supabase Auth
      await signOut();
      setCurrentPage('home');
      showInfo('Logged out', 'You have been successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      showError('Logout failed', 'Please try again');
    }
  };

  const handleUpload = () => {
    setShowUploadModal(true);
    setUploadStage('building');
    
    // Simulate upload process
    setTimeout(() => {
      setUploadStage('anchoring');
      
      setTimeout(() => {
        setUploadStage('complete');
        showSuccess('Documents uploaded successfully', 'Your documents have been anchored to the Polygon blockchain');
        
        setTimeout(() => {
          setShowUploadModal(false);
        }, 2000);
      }, 3000);
    }, 2000);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'verify':
        return (
          <VerifyDoc 
            onVerify={() => showInfo('Verification started', 'Processing document verification...')}
            onManualVerify={() => showInfo('Manual verification started', 'Checking signature on blockchain...')}
          />
        );
      case 'register':
        return (
          <RegisterIssuer 
            onRegister={handleRegister}
            onLogin={handleLogin}
          />
        );
      case 'login':
        return (
          <RegisterIssuer 
            onRegister={handleRegister}
            onLogin={handleLogin}
            defaultTab="existing"
          />
        );
      case 'dashboard':
        return isLoggedIn ? (
          userType === 'owner' ? (
            <OwnerDashboard wallet={null} network={null} issuerId={null} onLogout={handleLogout} />
          ) : (
            <IssuerDashboard onLogout={handleLogout} onNavigate={handleNavigation} />
          )
        ) : (
          <HomePage onNavigate={handleNavigation} />
        );
      case 'issue':
        return isLoggedIn && userType !== 'owner' ? (
          <IssueDocument onUploadComplete={() => {
            showSuccess('Document issued', 'Your document has been successfully issued and anchored on the blockchain');
          }} />
        ) : (
          <HomePage onNavigate={handleNavigation} />
        );
      case 'profile':
        return isLoggedIn ? (
          <ProfilePage onLogout={handleLogout} />
        ) : (
          <HomePage onNavigate={handleNavigation} />
        );
      
      default:
        return <HomePage onNavigate={handleNavigation} />;
    }
  };

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        <Header 
          currentPage={currentPage}
          onNavigate={handleNavigation}
          wallet={null}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          isOwner={userType === 'owner'}
          isLoadingOwner={false}
        />
        <main className="flex-1">
          {renderCurrentPage()}
        </main>
        <Footer />
      </div>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        stage={uploadStage}
      />

      {/* Toast Notifications */}
      <ToastNotifications toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default Index;