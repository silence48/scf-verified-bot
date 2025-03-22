"use client";

import { useState } from "react";
import type { TierRole } from "@/types/roles";
import { X } from "lucide-react";
import { Button } from "@/components/ui";

interface NominationFormProps {
  role: TierRole
  onSubmit: (roleId: string, userId: string, reason: string) => void
  onCancel: () => void
}

export function NominationForm({ role, onSubmit, onCancel }: NominationFormProps) {
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    onSubmit(role._id, userId, reason);
  };

  return (
    <div className="bg-[#1a1d29]/80 border border-gray-800/60 rounded-lg p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-wide text-white/90">Nominate User for {role.roleName}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="h-8 w-8 hover:bg-gray-700/50 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">User ID or Discord ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="ui-input w-full bg-[#0c0e14]/80 border-gray-700/50 focus-visible:border-gray-600"
            placeholder="Enter user ID or Discord ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nomination Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="ui-input w-full bg-[#0c0e14]/80 border-gray-700/50 focus-visible:border-gray-600 min-h-[120px]"
            placeholder="Explain why this user should be nominated for this role"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-gray-700/50 bg-[#0c0e14]/80 hover:bg-[#1e2235]/80 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!userId || !reason}
            className={`${!userId || !reason ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Submit Nomination
          </Button>
        </div>
      </div>
    </div>
  );
}

