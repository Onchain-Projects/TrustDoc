import { Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isLoggedIn: boolean;
  userType?: 'issuer' | 'owner';
  onLogout?: () => void;
}

export const Header = ({ currentPage, onNavigate, isLoggedIn, userType, onLogout }: HeaderProps) => {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-primary">TrustDoc</span>
              <span className="text-xs text-muted-foreground">A Product of Techvitta Innovations Pvt Ltd</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Button
              variant={currentPage === 'home' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('home')}
              className="font-medium"
            >
              Home
            </Button>
            <Button
              variant={currentPage === 'verify' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('verify')}
              className="font-medium"
            >
              Verify Document
            </Button>
            {isLoggedIn && (
              <>
                <Button
                  variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('dashboard')}
                  className="font-medium"
                >
                  Dashboard
                </Button>
                <Button
                  variant={currentPage === 'issue' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('issue')}
                  className="font-medium"
                >
                  Issue Document
                </Button>
              </>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            {isLoggedIn ? (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('profile')}
                  className="flex items-center space-x-1"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden md:inline">Profile</span>
                </Button>
                {userType === 'owner' && (
                  <span className="px-2 py-1 text-xs font-medium bg-warning text-warning-foreground rounded">
                    OWNER
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('register')}
                >
                  Register
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onNavigate('login')}
                >
                  Login
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};