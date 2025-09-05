"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "@/components/ui/google-button";
import { useAuth } from "@/lib/auth-context";
import { authAPI } from "@/lib/api";
import { AlertCircle, Loader2 } from "lucide-react";

type AuthPhase = 'idle' | 'requesting' | 'code_sent' | 'verifying' | 'success' | 'error';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<AuthPhase>('idle');
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const router = useRouter();
  const { isAuthenticated, login } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);


  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !isValidEmail(email)) return;

    setPhase('requesting');
    setError("");

    try {
      const response = await authAPI.requestOtp(email);

      if (response.ok) {
        setPhase('code_sent');
        setCooldown(30); // 30 second cooldown
      } else {
        setPhase('error');
        setError(response.error || "Failed to send code");
      }
    } catch (error) {
      console.error('Send code failed:', error);
      setPhase('error');
      setError("Failed to send code. Please try again.");
    }
  };

  const handleVerifyCode = async () => {
    if (otp.length !== 6) return;

    setPhase('verifying');
    setError("");

    try {
      const response = await authAPI.verifyOtp(email, otp);

      if (response.ok && response.user) {
        setPhase('success');
        login(response.user);
        router.push("/dashboard");
      } else {
        setPhase('error');
        setError('error' in response ? response.error : "Invalid code");
        setOtp(""); // Clear OTP on error
      }
    } catch (error) {
      console.error('Verify code failed:', error);
      setPhase('error');
      setError("Failed to verify code. Please try again.");
      setOtp(""); // Clear OTP on error
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;

    setPhase('requesting');
    setError("");

    try {
      const response = await authAPI.resendOtp(email);

      if (response.ok) {
        setPhase('code_sent');
        setCooldown(30);
      } else {
        setPhase('error');
        setError(response.error || "Failed to resend code");
      }
    } catch (error) {
      console.error('Resend code failed:', error);
      setPhase('error');
      setError("Failed to resend code. Please try again.");
    }
  };

  const handleChangeEmail = () => {
    setPhase('idle');
    setOtp("");
    setError("");
    setCooldown(0);
  };

  const handleGoogleSignIn = () => {
    // Redirect to Google OAuth
    window.location.href = '/v1/auth/google/start';
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isEmailLocked = phase === 'code_sent' || phase === 'verifying';
  const isOtpReady = otp.length === 6;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">L</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Sign in to Lynkby
          </h1>
        </div>

        {/* Main Form */}
        <div className="space-y-6">
          {/* Email Block */}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isEmailLocked}
                className={`w-full ${isEmailLocked ? 'bg-gray-100 text-gray-500' : ''}`}
                placeholder="Enter your email"
              />
            </div>

            <Button
              type="button"
              onClick={handleSendCode}
              disabled={!isValidEmail(email) || phase === 'requesting'}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {phase === 'requesting' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send code'
              )}
            </Button>

            {/* Change Email Link */}
            {isEmailLocked && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Change email
                </button>
              </div>
            )}
          </div>

          {/* OTP Block */}
          {(phase === 'code_sent' || phase === 'verifying') && (
            <div className="space-y-4">
              <div>
                <div id="otp-label" className="text-sm font-medium text-gray-700 mb-2">
                  Enter the 6-digit code
                </div>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={phase === 'verifying'}
                  aria-labelledby="otp-label"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600" role="status" aria-live="polite">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Resend Section */}
              <div className="text-center text-sm">
                {cooldown > 0 ? (
                  <span className="text-gray-500">
                    Resend code in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Resend code
                  </button>
                )}
              </div>

              <Button
                type="button"
                onClick={handleVerifyCode}
                disabled={!isOtpReady || phase === 'verifying'}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {phase === 'verifying' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & continue'
                )}
              </Button>
            </div>
          )}

          {/* Separator */}
          {phase === 'idle' && (
            <Separator>or</Separator>
          )}

          {/* Google Sign In */}
          {phase === 'idle' && (
            <GoogleButton
              onClick={handleGoogleSignIn}
              disabled={false}
            />
          )}

          {/* Legal */}
          <p className="text-center text-xs text-gray-500">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-indigo-600 hover:text-indigo-800">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}