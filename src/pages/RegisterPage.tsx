import { useState } from "react";
import { Shield, Key, Wallet, UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from "@/contexts/AuthContext";

interface RegisterPageProps {
  onRegister?: (data: { name: string; email: string; password: string; walletAddress: string }) => void;
  onLogin?: (data: { email: string; password: string }) => void;
}

export const RegisterPage = ({ onRegister, onLogin }: RegisterPageProps) => {
  const { signUp, signIn, loading, error, clearError } = useAuthContext();
  const [activeTab, setActiveTab] = useState("new");
  
  // New Issuer State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  
  // Existing Issuer State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  const connectWallet = async () => {
    try {
      if (!(window as any).ethereum) {
        setRegistrationMessage("Please install MetaMask to use this DApp");
        return;
      }
      
      const accounts = await (window as any).ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        setRegistrationMessage("Wallet connected successfully!");
      }
    } catch (error) {
      setRegistrationMessage("Failed to connect wallet. Please try again.");
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setRegistrationMessage("Please fill in all fields");
      return;
    }
    
    if (!isConnected) {
      setRegistrationMessage("Please connect your wallet first");
      return;
    }

    try {
      clearError();
      setRegistrationMessage("");
      
      // Generate a simple issuer ID (in production, this should be more sophisticated)
      const issuerId = `issuer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate mock keys (in production, use proper cryptographic key generation)
      const publicKey = `pub_${Math.random().toString(36).substr(2, 20)}`;
      const privateKey = `priv_${Math.random().toString(36).substr(2, 20)}`;

      await signUp({
        email,
        password,
        name,
        address: walletAddress,
        userType: 'issuer',
        issuerId,
        publicKey,
        privateKey,
        metaMaskAddress: walletAddress
      });

      setRegistrationMessage("Registration successful! Please check your email for verification.");
      
      // Call the original callback if provided
      if (onRegister) {
        onRegister({ name, email, password, walletAddress });
      }
    } catch (error) {
      setRegistrationMessage(error instanceof Error ? error.message : "Registration failed");
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginMessage("Please fill in all fields");
      return;
    }

    try {
      clearError();
      setLoginMessage("");
      
      await signIn({
        email: loginEmail,
        password: loginPassword
      });

      setLoginMessage("Login successful!");
      
      // Call the original callback if provided
      if (onLogin) {
        onLogin({ email: loginEmail, password: loginPassword });
      }
    } catch (error) {
      setLoginMessage(error instanceof Error ? error.message : "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Issuer Portal
          </h1>
          <p className="text-lg text-muted-foreground">
            Create your issuer account or login to start using TrustDoc
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side - Info Panel */}
          <div className="lg:col-span-5">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 h-full">
              <CardContent className="p-8 flex flex-col justify-center">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto">
                    <Shield className="w-10 h-10 text-primary-foreground" />
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-primary">
                      Issuer Registration
                    </h2>
                    <p className="text-muted-foreground">
                      Create your issuer account to start anchoring documents
                    </p>
                  </div>

                  <div className="space-y-4 text-sm text-muted-foreground text-left">
                    <div className="flex items-start space-x-3">
                      <Key className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Key Pair Generation</h4>
                        <p>A cryptographic key pair will be generated for you when you register. This key pair is used to sign and verify your documents.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Wallet className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Wallet Connection</h4>
                        <p>Connect your MetaMask wallet to interact with the Polygon blockchain for document anchoring.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground mb-1">Secure & Decentralized</h4>
                        <p>Your documents are secured using blockchain technology with tamper-proof verification.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Forms */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="new" className="flex items-center space-x-2">
                      <UserPlus className="w-4 h-4" />
                      <span>New Issuer</span>
                    </TabsTrigger>
                    <TabsTrigger value="existing" className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>Existing Issuer</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  {/* New Issuer Registration */}
                  <TabsContent value="new" className="space-y-6">
                    <div className="space-y-4">
                      <CardTitle>Create Issuer Account</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Register as a document issuer to start using TrustDoc
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="issuer-name">Issuer Name</Label>
                        <Input
                          id="issuer-name"
                          placeholder="Organization or issuer name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="issuer-email">Email</Label>
                        <Input
                          id="issuer-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="issuer-password">Password</Label>
                        <Input
                          id="issuer-password"
                          type="password"
                          placeholder="Choose a secure password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>

                      {/* Key Pair Generation Info */}
                      <Alert className="bg-blue-50 border-blue-200">
                        <Key className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          <strong>Key Pair Generation</strong><br />
                          A cryptographic key pair will be generated for you when you register. This key pair is used to sign and verify your documents.
                        </AlertDescription>
                      </Alert>

                      {/* Wallet Connection */}
                      <div className="space-y-4">
                        {!isConnected ? (
                          <Button
                            onClick={connectWallet}
                            variant="outline"
                            className="w-full"
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            Connect Wallet
                          </Button>
                        ) : (
                          <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              <strong>Wallet Connected</strong><br />
                              <span className="font-mono text-xs">{walletAddress}</span>
                            </AlertDescription>
                          </Alert>
                        )}

                        <Button
                          onClick={handleRegister}
                          disabled={!isConnected || loading}
                          className="w-full"
                          size="lg"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          {loading ? "Registering..." : "Register as Issuer"}
                        </Button>
                      </div>

                      {registrationMessage && (
                        <Alert className={registrationMessage.includes("success") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                          <AlertDescription className={registrationMessage.includes("success") ? "text-green-800" : "text-red-800"}>
                            {registrationMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {error && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertDescription className="text-red-800">
                            {error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </TabsContent>

                  {/* Existing Issuer Login */}
                  <TabsContent value="existing" className="space-y-6">
                    <div className="space-y-4">
                      <CardTitle>Login to Your Account</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Access your existing issuer account
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="your@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                        />
                      </div>

                      <Button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full"
                        size="lg"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {loading ? "Logging in..." : "Login"}
                      </Button>

                      {loginMessage && (
                        <Alert className={loginMessage.includes("success") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                          <AlertDescription className={loginMessage.includes("success") ? "text-green-800" : "text-red-800"}>
                            {loginMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
