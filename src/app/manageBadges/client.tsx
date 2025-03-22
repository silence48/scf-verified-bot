"use client";

import type { BadgeAsset } from "@/types/discord-bot";
import { useState, useTransition } from "react";
import Image from "next/image";
import { updateBadge } from "./actions";

interface BadgeManagerProps {
  initialBadges: BadgeAsset[]
}

export function BadgeManager({ initialBadges }: BadgeManagerProps) {
  const [badges, setBadges] = useState<BadgeAsset[]>(initialBadges);
  const [filterText, setFilterText] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleBadgeUpdated(badgeId: string, updatedData: Partial<BadgeAsset>) {
    try {
      startTransition(async () => {
        await updateBadge(badgeId, updatedData);

        // Update the local state with the updated badge
        setBadges((prevBadges) =>
          prevBadges.map((badge) => (String(badge._id) === badgeId ? { ...badge, ...updatedData } : badge)),
        );
      });
    } catch (error) {
      console.error("Failed to update badge:", error);
      alert("Update failed");
    }
  }

  const filteredBadges = badges.filter(
    (badge) =>
      badge.code.toLowerCase().includes(filterText.toLowerCase()) ||
      (badge.description_short || "").toLowerCase().includes(filterText.toLowerCase()),
  );

  return (
    <div className="user-table">
      <div className="user-table-header">
        <h2 className="user-table-header-title">Badge Management</h2>
        <div className="user-table-header-controls">
          <div className="user-table-search-wrapper">
            <svg
              className="user-table-search-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              placeholder="Filter badges..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="user-table-search-input"
            />
          </div>
        </div>
      </div>
      <div className="user-table-scroller">
        <div className="space-y-0">
          {filteredBadges.map((badge) => (
            <BadgeItem key={String(badge._id)} badge={badge} onUpdate={handleBadgeUpdated} />
          ))}
        </div>
      </div>
      {isPending && <p className="p-4 text-gray-400">Updating badges...</p>}
    </div>
  );
}

interface BadgeItemProps {
  badge: BadgeAsset
  onUpdate: (badgeId: string, updatedData: Partial<BadgeAsset>) => void
}

export function BadgeItem({ badge, onUpdate }: BadgeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<Partial<BadgeAsset>>({ ...badge });
  const [isPending, setIsPending] = useState(false);

  // Fields that should be editable
  const editableFields = [
    "difficulty",
    "subDifficulty",
    "category_broad",
    "category_narrow",
    "description_short",
    "description_long",
    "current",
    "instructions",
    "type",
    "aliases",
  ] as const;

  // Fields that should be displayed but not editable
  const readOnlyFields = ["code", "issuer", "issue_date"] as const;

  // Fields that should not be displayed
  const hiddenFields = ["_id", "image", "lastMarkUrlHolders"] as const;

  // Type for all badge keys
  type BadgeKey = keyof BadgeAsset

  // Type guard to check if a key is in hiddenFields
  function isHiddenField(key: BadgeKey): boolean {
    return (hiddenFields as readonly BadgeKey[]).includes(key);
  }

  const handleChange = (key: keyof BadgeAsset, value: string | number | string[]) => {
    let processedValue: string | number | string[];

    // Handle special cases
    if (key === "current" && typeof value === "string") {
      processedValue = Number.parseInt(value, 10) || 0;
    } else if (key === "aliases" && typeof value === "string") {
      // Convert comma-separated string to array
      processedValue = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      processedValue = value;
    }

    setFormState((prev) => ({
      ...prev,
      [key]: processedValue,
    }));
  };

  async function handleSave() {
    try {
      setIsPending(true);
      await onUpdate(String(badge._id), formState);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving badge:", error);
    } finally {
      setIsPending(false);
    }
  }

  function formatFieldName(key: string): string {
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
  }

  function renderFieldValue(key: keyof BadgeAsset, value: unknown): string {
    if (key === "aliases" && Array.isArray(value)) {
      return value.join(", ");
    }

    if (key === "issue_date" && typeof value === "string") {
      return new Date(value).toLocaleString();
    }

    return String(value || "");
  }

  return (
    <div className="user-table-row border-b border-gray-800/40">
      <div className="p-4">
        <div className="flex items-start gap-6">
          {badge.image && (
            <div className="shrink-0">
              <Image
              src={badge.image}
              alt={badge.code}
              width={120}
              height={120}
              className="rounded-md shadow-md"
              unoptimized
              />
            </div>
          )}

          <div className="flex-1">
            <h3 className="user-table-name mb-2">{badge.code}</h3>
            {!isEditing && badge.description_short && <p className="text-gray-300 mb-3">{badge.description_short}</p>}

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="ui-button-base ui-button--default ui-button--default-size"
              >
                Edit Badge
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="user-table-detail-box mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {editableFields.map((key) => {
                const value =
                  key === "aliases" && Array.isArray(formState[key])
                    ? (formState[key] as string[]).join(", ")
                    : formState[key] !== undefined
                      ? String(formState[key])
                      : "";

                return (
                  <div key={key} className="space-y-2">
                    <label className="user-table-label font-medium">{formatFieldName(key)}</label>
                    {key === "description_long" || key === "instructions" ? (
                      <textarea
                        className="search-input w-full border border-gray-700 rounded-md shadow-sm bg-gray-800/50"
                        value={value}
                        rows={4}
                        onChange={(e) => handleChange(key, e.target.value)}
                      />
                    ) : (
                      <input
                        className="search-input w-full border border-gray-700 rounded-md shadow-sm bg-gray-800/50"
                        value={value}
                        onChange={(e) =>
                          handleChange(
                            key,
                            key === "current" ? Number.parseInt(e.target.value, 10) || 0 : e.target.value,
                          )
                        }
                        type={key === "current" ? "number" : "text"}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button onClick={() => setIsEditing(false)} className="user-table-action-btn" disabled={isPending}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="ui-button-base ui-button--default ui-button--default-size"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {[...readOnlyFields, ...editableFields]
                .filter((key) => key !== "description_short" && !isHiddenField(key as BadgeKey))
                .map((key) => (
                  <div key={key} className="flex flex-col p-2 bg-gray-800/30 rounded-md border border-gray-700/50 shadow-sm">
                    <span className="user-table-label text-gray-400 font-medium">{formatFieldName(key)}</span>
                    <span className="text-sm text-gray-300">
                      {renderFieldValue(key as BadgeKey, badge[key as BadgeKey])}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
