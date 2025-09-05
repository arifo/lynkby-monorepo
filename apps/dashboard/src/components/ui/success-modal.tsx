"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveUrl: string;
  username: string;
  onGoToDashboard: () => void;
}

export function SuccessModal({ isOpen, onClose, liveUrl, username, onGoToDashboard }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  // Auto-close after 10 seconds
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onGoToDashboard();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onGoToDashboard]);

  const copyLiveUrl = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const openLivePage = () => {
    window.open(liveUrl, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your page is live!
          </h2>

          <p className="text-gray-600 mb-4">
            {liveUrl}
          </p>

          <div className="space-y-3 mb-6">
            <button
              onClick={copyLiveUrl}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>

            <button
              onClick={openLivePage}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 font-medium flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Live Page
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onGoToDashboard}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 font-medium"
            >
              Go to Dashboard
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Auto-redirecting to dashboard in {timeLeft}s
          </p>
        </div>
      </div>
    </div>
  );
}
