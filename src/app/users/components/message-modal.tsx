"use client";

import { useState } from "react";
import { X, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { Portal } from "@/components/portal";

interface MessageModalProps {
  userId: string
  username: string
  onClose: () => void
}

export function MessageModal({ userId, username, onClose }: MessageModalProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log(`Sending message to ${username} (${userId}): ${message}`);

      // Show success message
      setSuccess("Message sent successfully!");
      setMessage("");

      // Close modal after a delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError("Failed to send message. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Portal>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999]"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
        }}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="fixed z-[9999] w-full max-w-md"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1a1d29]/80 border border-gray-800/60 rounded-lg p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold tracking-wide text-white/90">Send Message to {username}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-gray-700/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="bg-destructive/20 text-destructive flex items-center gap-2 p-3 rounded-md mb-4">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 text-green-400 flex items-center gap-2 p-3 rounded-md mb-4">
              <AlertCircle className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#0c0e14]/80 border border-gray-700/50 rounded-md px-3 py-2 focus:border-gray-600 focus:outline-none min-h-[120px]"
                placeholder="Enter your message..."
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="border-gray-700/50 bg-[#0c0e14]/80 hover:bg-[#1e2235]/80 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !message.trim()}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

