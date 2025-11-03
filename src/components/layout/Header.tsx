import { Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  wallet?: string | null;
  isLoggedIn: boolean;
  onLogout?: () => void;
  isOwner?: boolean;
  isLoadingOwner?: boolean;
}

export const Header = ({ currentPage, onNavigate, wallet, isLoggedIn, onLogout, isOwner, isLoadingOwner }: HeaderProps) => {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onNavigate('home')}
          >
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
            <a
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                currentPage === 'home' 
                  ? 'text-blue-700 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
              onClick={() => onNavigate('home')}
              style={{ cursor: 'pointer' }}
            >
              Home
            </a>
            <a
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                currentPage === 'verify' 
                  ? 'text-blue-700 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
              onClick={() => onNavigate('verify')}
              style={{ cursor: 'pointer' }}
            >
              Verify Document
            </a>
            {isLoggedIn && (
              <>
                <a
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    currentPage === 'dashboard' 
                      ? 'text-blue-700 bg-blue-50' 
                      : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                  onClick={() => onNavigate('dashboard')}
                  style={{ cursor: 'pointer' }}
                >
                  Dashboard
                </a>
                {!isOwner && (
                  <a
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      currentPage === 'issue' 
                        ? 'text-blue-700 bg-blue-50' 
                        : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                    onClick={() => onNavigate('issue')}
                    style={{ cursor: 'pointer' }}
                  >
                    Issue Document
                  </a>
                )}
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
                {isOwner && (
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