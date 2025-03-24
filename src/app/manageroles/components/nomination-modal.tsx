"use client";

import { useState } from "react";
import type { TierRole } from "@/types/roles";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { nominateForRole, createVotingThread } from "@/actions/roles";

interface NominationModalProps {
  role: TierRole;
  onClose: () => void;
}

export function NominationModal({ role, onClose }: NominationModalProps) {
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userId.trim() || !reason.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check eligibility
      const eligibilityResult = await nominateForRole(role._id, userId);

      if (!eligibilityResult.eligible) {
        setError(eligibilityResult.reason || "User is not eligible for this role");
        return;
      }

      // Create voting thread
      const threadResult = await createVotingThread(role._id, userId, reason);

      if (!threadResult.success) {
        setError("Failed to create voting thread");
        return;
      }

      // Show success message
      setSuccess("Nomination submitted successfully! A voting thread has been created.");

      // Close modal after a delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError("An error occurred while submitting the nomination");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-gray-800/60 bg-[#1a1d29]/80 p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-wide text-white/90">Nominate User for {role.roleName}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-gray-700/50 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/20 p-3 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-green-500/20 p-3 text-green-400">
            <AlertCircle className="h-4 w-4" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">User ID or Discord ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border border-gray-700/50 bg-[#0c0e14]/80 px-3 py-2 focus:border-gray-600 focus:outline-none"
              placeholder="Enter user ID or Discord ID"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Nomination Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px] w-full rounded-md border border-gray-700/50 bg-[#0c0e14]/80 px-3 py-2 focus:border-gray-600 focus:outline-none"
              placeholder="Explain why this user should be nominated for this role"
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="border-gray-700/50 bg-[#0c0e14]/80 hover:bg-[#1e2235]/80 hover:text-white">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !userId.trim() || !reason.trim()}>
              {isLoading ? <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
              Submit Nomination
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
