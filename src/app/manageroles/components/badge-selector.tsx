"use client";

import { useState } from "react";;
import { Check, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui";
import { BadgeAsset } from "@/types/discord-bot";
import Image from "next/image";

interface BadgeSelectorProps {
  badges: (Omit<BadgeAsset, "_id"> & { _id: string })[];
  selectedBadgeIds: string[];
  setSelectedBadgeIds: (ids: string[]) => void;
}

export function BadgeSelector({ badges, selectedBadgeIds, setSelectedBadgeIds }: BadgeSelectorProps) {
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredBadges = badges.filter((badge) => badge.code.toLowerCase().includes(searchText.toLowerCase()));

  const handleSelectBadge = (badgeId: string) => {
    if (selectedBadgeIds.includes(badgeId)) {
      setSelectedBadgeIds(selectedBadgeIds.filter((id) => id !== badgeId));
    } else {
      setSelectedBadgeIds([...selectedBadgeIds, badgeId]);
    }
  };

  const handleRemoveBadge = (badgeId: string) => {
    setSelectedBadgeIds(selectedBadgeIds.filter((id) => id !== badgeId));
  };

  const selectedBadges = badges.filter((badge) => selectedBadgeIds.includes(String(badge._id)));

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          className="flex items-center justify-between p-2 border border-gray-700/50 bg-[#0c0e14]/80 rounded-md cursor-pointer text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-gray-300">
            {selectedBadgeIds.length > 0 ? `${selectedBadgeIds.length} badges selected` : "Select badges"}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-[#1a1d29] border border-gray-800/60 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="sticky top-0 bg-[#1a1d29] p-2 border-b border-gray-800/60">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search badges..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full bg-[#0c0e14]/80 border border-gray-700/50 rounded-md px-3 py-2 pl-8 focus:border-gray-600 focus:outline-none h-8 text-white"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {filteredBadges.map((badge) => (
              <div
                key={String(badge._id)}
                className={`flex items-center justify-between p-2 cursor-pointer hover:bg-[#1e2235]/80 text-white ${selectedBadgeIds.includes(String(badge._id)) ? "bg-[#1e2235]/40" : ""
                  }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectBadge(String(badge._id));
                }}
              >
                <div className="flex items-center gap-2">
                  <Image
                    src={badge.image}
                    width={120}
                    height={120}
                    alt={badge.code}
                    className="w-6 h-6 rounded"
                  />
                  <span className="text-gray-300">{badge.code}</span>
                </div>
                {selectedBadgeIds.includes(String(badge._id)) && <Check className="h-4 w-4 text-indigo-400" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedBadges.map((badge) => (
            <div key={String(badge._id)} className="flex items-center gap-1 bg-[#12141e]/40 px-2 py-1 rounded-md">
              <Image
                src={badge.image}
                width={120}
                height={120}
                alt={badge.code}
                className="w-4 h-4 rounded"
              />
              <span className="text-xs text-gray-300">{badge.code}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveBadge(String(badge._id))}
                className="h-4 w-4 p-0 hover:bg-gray-700/50 hover:text-white ml-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

