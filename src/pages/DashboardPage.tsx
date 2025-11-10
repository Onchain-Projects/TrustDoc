import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { IssuerDashboard } from "@/components/IssuerDashboard";
import { useAuthContext } from "@/contexts/AuthContext";
import { ToastNotifications, useToasts } from "@/components/ui/toast-notifications";
import { OwnerDashboard } from "@/components/OwnerDashboard";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, userType, loading, signOut } = useAuthContext();
  const { toasts, removeToast, showInfo } = useToasts();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [loading, user, navigate]);

  const handleNavigate = (page: string) => {
    switch (page) {
      case "home":
        navigate("/");
        break;
      case "verify":
        navigate("/verify");
        break;
      case "dashboard":
        // already here
        break;
      case "issue":
        navigate("/issue");
        break;
      case "profile":
        navigate("/profile");
        break;
      case "login":
        navigate("/");
        showInfo("Please sign in", "Use the login form on the home page.");
        break;
      case "register":
        navigate("/");
        showInfo("Create an account", "Use the registration form on the home page.");
        break;
      default:
        navigate("/");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isOwner = userType === "owner";

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        <Header
          currentPage="dashboard"
          onNavigate={handleNavigate}
          wallet={null}
          isLoggedIn
          onLogout={handleLogout}
          isOwner={isOwner}
          isLoadingOwner={false}
        />
        <main className="flex-1">
          {isOwner ? (
            <OwnerDashboard wallet={null} network={null} issuerId={null} onLogout={handleLogout} />
          ) : (
            <IssuerDashboard onLogout={handleLogout} onNavigate={(page) => handleNavigate(page)} />
          )}
        </main>
        <Footer />
      </div>

      <ToastNotifications toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default DashboardPage;

