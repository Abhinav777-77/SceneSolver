  import { useState, useEffect, FormEvent } from "react";
  import { Link, useNavigate } from "react-router-dom";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Fingerprint, ArrowLeft, Clock } from "lucide-react";
  import { Navbar } from "@/components/Navbar";
  import { Footer } from "@/components/Footer";
  import { useToast } from "@/hooks/use-toast";
  import { Progress } from "@/components/ui/progress";
  import axios from "axios";
  import { jwtDecode } from "jwt-decode";

  interface DecodedToken {
      sub: string;
      role: string;
    exp: number;
    iat: number;
  }

  export default function OTPVerification() {
    const [otp, setOtp] = useState("");
    const [email, setEmail] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [otpExpiry, setOtpExpiry] = useState<number | null>(null);
    const [progress, setProgress] = useState<number>(100);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
      // Set a default expiry time for testing (45 seconds from now)
      if (!otpExpiry) {
        console.log("Setting default OTP expiry time for testing");
        setOtpExpiry(Date.now() + 45 * 1000);
      }
    }, []);

    // Timer effect to count down OTP expiration
    useEffect(() => {
      console.log("OTP Expiry value:", otpExpiry);
      if (!otpExpiry) {
        console.log("No OTP expiry time set");
        return;
      }
      
      const totalTime = 45; // Same as backend OTP expiration time
      
      const calculateTimeLeft = () => {
        const difference = otpExpiry - Date.now();
        const seconds = Math.max(0, Math.floor(difference / 1000));
        console.log("Time left calculated:", seconds, "seconds");
        return seconds;
      };

      // Calculate initial time left
      const initialTimeLeft = calculateTimeLeft();
      setTimeLeft(initialTimeLeft);
      
      // Calculate initial progress percentage
      const initialProgress = (initialTimeLeft / totalTime) * 100;
      setProgress(Math.max(0, Math.min(100, initialProgress))); // Ensure progress is between 0-100
      
      console.log("Initial timer values - Time left:", initialTimeLeft, "Progress:", initialProgress);
      
      // Only set up the timer if there's time remaining
      if (initialTimeLeft <= 0) {
        setProgress(0);
        toast({
          variant: "destructive",
          title: "OTP Expired",
          description: "Your OTP has expired. Please request a new one.",
        });
        return;
      }
      
      const timer = setInterval(() => {
        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);
        
        // Calculate progress percentage
        const progressValue = (remaining / totalTime) * 100;
        setProgress(Math.max(0, Math.min(100, progressValue))); // Ensure progress is between 0-100
        console.log("Timer update - Remaining:", remaining, "Progress:", progressValue);
        
        if (remaining <= 0) {
          clearInterval(timer);
          setProgress(0);
          toast({
            variant: "destructive",
            title: "OTP Expired",
            description: "Your OTP has expired. Please request a new one.",
          });
        }
      }, 1000);

      return () => clearInterval(timer);
    }, [otpExpiry, toast]);

    useEffect(() => {
      const token = sessionStorage.getItem("authToken");
      
      if (!token) {
        toast({ variant: "destructive", title: "Session Expired", description: "Please sign in again." });
        navigate("/signin");
        return;
      }

      const decoded: DecodedToken = jwtDecode(token);
      const userEmail = decoded?.sub;
      
      if (userEmail) {
        setEmail(userEmail);
        sendInitialOtp(userEmail);
      } else {
        navigate("/signin");
      }
    }, [navigate]);

    const sendInitialOtp = async (email: string) => {
      try {
        setIsLoading(true);
        const token = sessionStorage.getItem("authToken");
        if (!token) {
          toast({ variant: "destructive", title: "Session Expired", description: "Please sign in again." });
          navigate("/signin");
          return;
        }
        
        console.log("Sending OTP to:", email);
        
        const response = await axios.post(
          "http://localhost:5000/api/otp/resend-otp",
          { email },
          {
            headers: { 
              "x-auth-token": token,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            withCredentials: false
          }
        );

        console.log("OTP response:", response.data);
        
        if (response.data.status === 200) {
          // Parse the ISO date string to get the expiry time
          const expiryTimeStr = response.data.expiresAt;
          console.log("Raw expiry time from server:", expiryTimeStr);
          
          // Convert to milliseconds timestamp
          const expiryTime = new Date(expiryTimeStr).getTime();
          console.log("Converted expiry time:", expiryTime);
          console.log("Current time:", Date.now());
          console.log("Time difference (seconds):", (expiryTime - Date.now()) / 1000);
          
          // Set the expiry time
          setOtpExpiry(expiryTime);
          
          toast({
            title: "OTP Sent",
            description: response.data.message,
          });
        }
      } catch (error: any) {
        console.error("Error sending OTP:", error);
        
        // More detailed error logging
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
          console.error("Response headers:", error.response.headers);
        } else if (error.request) {
          console.error("No response received:", error.request);
        } else {
          console.error("Error setting up request:", error.message);
        }
        
        // Set a default expiry time even on error for testing
        const defaultExpiry = Date.now() + 45 * 1000;
        console.log("Setting default expiry time:", defaultExpiry);
        setOtpExpiry(defaultExpiry);
        
        toast({
          variant: "destructive",
          title: "Error sending OTP",
          description: error?.response?.data?.message || "Something went wrong",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const resendOtp = async () => {
      try {
        setIsLoading(true);
        const token = sessionStorage.getItem("authToken");
        if (!token) {
          toast({ variant: "destructive", title: "Session Expired", description: "Please sign in again." });
          navigate("/signin");
          return;
        }
        
        console.log("Resending OTP to:", email);
        
        const response = await axios.post(
          "http://localhost:5000/api/otp/resend-otp",
          { email },
          {
            headers: { 
              "x-auth-token": token,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            withCredentials: false
          }
        );

        console.log("Resend OTP response:", response.data);
        
        if (response.data.status === 200) {
          // Parse the ISO date string to get the expiry time
          const expiryTimeStr = response.data.expiresAt;
          console.log("Raw expiry time from server:", expiryTimeStr);
          
          // Convert to milliseconds timestamp
          const expiryTime = new Date(expiryTimeStr).getTime();
          console.log("Converted expiry time:", expiryTime);
          console.log("Current time:", Date.now());
          console.log("Time difference (seconds):", (expiryTime - Date.now()) / 1000);
          
          // Set the expiry time
          setOtpExpiry(expiryTime);
          setOtp(""); // Clear previous OTP input
          
          toast({
            title: "Code Sent",
            description: response.data.message,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: response.data.message,
          });
        }
      } catch (error: any) {
        console.error("Error resending OTP:", error);
        
        // More detailed error logging
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
          console.error("Response headers:", error.response.headers);
        } else if (error.request) {
          console.error("No response received:", error.request);
        } else {  
          console.error("Error setting up request:", error.message);
        }
        
        toast({
          variant: "destructive",
          title: "Error",
          description: error?.response?.data?.message || "Something went wrong",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const handleVerifyOtp = async () => {
      if (otp.length !== 6) {
        toast({
          variant: "destructive",
          title: "Invalid OTP",
          description: "Please enter a 6-digit OTP",
        });
        return;
      }

      try {
        const token = sessionStorage.getItem("authToken");
        const response = await axios.post(
          "http://localhost:5000/api/otp/verify-otp",
          { otp },
          {
            headers: { "x-auth-token": token },
          }
        );

        if (response.data.status === 200) {
          // Ensure user ID is still in sessionStorage
          const token = sessionStorage.getItem("authToken");
          let userId = "";
          
          if (token) {
            try {
              const decoded: DecodedToken = jwtDecode(token);
              if (decoded?.sub && !sessionStorage.getItem("email")) {
                sessionStorage.setItem("email", decoded.sub);
                console.log("User ID restored in sessionStorage:", decoded.sub);
              }
              
              // Get the user ID from sessionStorage or from the decoded token
              userId = sessionStorage.getItem("userid") || decoded?.sub || "";
            } catch (error) {
              console.error("Error decoding token:", error);
            }
          }
          
          toast({
            title: "Verified",
            description: response.data.message,
          });
          
          setTimeout(() => {
            // Navigate to dashboard with userId in the URL
            navigate(`/dashboard/${userId}`);
          }, 1000);
        } else if (response.data.status === 210) {
          toast({
            title: "Verified",
            description: response.data.message,
          });
          setTimeout(() => {
            navigate("/common");
          }, 1000);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: response.data.message,
          });
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Invalid OTP",
          description: error?.response?.data?.message || "Something went wrong",
        });
      }
    };

    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
      event.preventDefault();
      handleVerifyOtp();
    }

    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />

        <div className="flex-1 container flex flex-col items-center justify-center px-4 py-12">
          <Link
            to="/"
            className="absolute left-4 top-20 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to home
          </Link>

          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="flex flex-col space-y-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Fingerprint className="h-8 w-8 text-forensic" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Verify OTP
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter the one-time password sent to your email
              </p>
              
              {/* Simple timer display */}
              <div className="mt-4 p-4 border rounded-md">
                <div className="text-lg font-bold">
                  Time remaining: {timeLeft} seconds
                </div>
                <Progress 
                  value={progress} 
                  className="h-4 w-full mt-2"
                />
              </div>
            </div>

            <div className="grid gap-6">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="otp">OTP</Label>
                    <Input
                      id="otp"
                      name="otp"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      required
                      className={timeLeft <= 0 ? 'border-red-300' : ''}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || timeLeft <= 0}
                  >
                    {isLoading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </form>

              <div className="text-center text-sm">
                {timeLeft <= 0 ? (
                  <span className="text-red-500">OTP expired. </span>
                ) : (
                  "Didn't receive the code? "
                )}
                <button
                  onClick={resendOtp}
                  className="font-medium text-primary hover:underline"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }
