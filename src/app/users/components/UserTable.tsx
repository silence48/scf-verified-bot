"use client";

import React, { useState, useEffect } from "react";
//import type { MemberInfo, PrecomputedBadge, NominationVote, NominationThread } from "@/types/guild";
import type { MemberInfo, NominationThread, NominationVote, PrecomputedBadge } from "@/types/discord-bot";

import { Search, ChevronDown, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Button, Badge, Input } from "@/components/ui";
import { UserExpandedRow } from "./user-expanded-row";
import { formatDate, getRoleDotColor } from "@/lib/utils";
import { RoleManagementModal } from "./role-management-modal";
import { MessageModal } from "./message-modal";

interface UserTableProps {
  activeFilters: string[];
  onFilterToggleAction: (role: string) => void;
  members: MemberInfo[];
  userbadges: PrecomputedBadge[];
  uservotes: NominationVote[];
  threads: NominationThread[];
  initialExpandedUser?: string;
}

type SortField = "name" | "memberSince" | "joinedDiscord" | "role";
type SortOrder = "asc" | "desc";

export function UserTable({ activeFilters, onFilterToggleAction, members, userbadges, uservotes, threads, initialExpandedUser }: UserTableProps) {
  // Local client state for search, sorting, expansion, pagination, etc.
  const [searchTerm, setSearchTerm] = useState("");
  const [perPage, setPerPage] = useState("12"); // string from the <Select>
  const [currentPage, setCurrentPage] = useState(0); // zero-based page index

  const [sortField, setSortField] = useState<SortField>("memberSince");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // Simple dropdown state management
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [activeActionDropdown, setActiveActionDropdown] = useState<string | null>(null);

  // Modals
  const [roleModal, setRoleModal] = useState<{
    isOpen: boolean;
    userId: string;
    username: string;
    userRoles: MemberInfo["roles"];
  }>({
    isOpen: false,
    userId: "",
    username: "",
    userRoles: [],
  });

  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean;
    userId: string;
    username: string;
  }>({
    isOpen: false,
    userId: "",
    username: "",
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if clicking outside of any dropdown
      const target = event.target as HTMLElement;
      if (!target.closest(".dropdown-trigger") && !target.closest(".dropdown-menu")) {
        setSortDropdownOpen(false);
        setActiveActionDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle expanding a user row - wrapped in useCallback to prevent recreation on every render
  const handleExpandUser = React.useCallback(
    (userId: string) => {
      if (expandedRows.includes(userId)) {
        // Collapse the row
        setExpandedRows((prev) => prev.filter((id) => id !== userId));
        return;
      }

      // Expand the row
      setExpandedRows((prev) => [...prev, userId]);
    },
    [expandedRows],
  );

  // Load initial expanded user if provided
  useEffect(() => {
    if (initialExpandedUser && !expandedRows.includes(initialExpandedUser)) {
      const userToExpand = members.find((m) => m._id === initialExpandedUser || m.discordId === initialExpandedUser);
      if (userToExpand) {
        handleExpandUser(userToExpand.discordId);
      }
    }
  }, [initialExpandedUser, members, expandedRows, handleExpandUser]);

  // Get user badges
  const getUserBadges = (userId: string) => {
    // Find the precomputed badge entry for this user
    return userbadges.find((badge) => badge.discordId === userId)?.badges || [];
  };

  // Get user nominations
  const getUserNominations = (userId: string) => {
    // Find nomination threads created by this user
    return threads
      .filter((thread) => thread.nominatorId === userId)
      .map((thread) => ({
        id: thread._id,
        roleName: thread.roleName,
        nominatedUser: thread.nomineeId, // This would ideally be mapped to a username
        status: thread.status || "pending",
        date: thread.createdAt,
        voteCount: thread.voteCount,
      }));
  };

  // Get user votes
  const getUserVotes = (userId: string) => {
    // Find votes cast by this user
    const userVotes = uservotes.filter((vote) => vote.voterId === userId);

    // Map to threads to get more info
    return userVotes.map((vote) => {
      const thread = threads.find((t) => t._id === vote.threadId);
      return {
        id: vote._id.toString(),
        threadId: vote.threadId,
        roleName: thread?.roleName || "Unknown Role",
        nominatedUser: thread?.nomineeId || "Unknown User", // This would ideally be mapped to a username
        date: vote.voteTimestamp,
      };
    });
  };

  // 1) Filter by active role filters
  const filteredByRole = members.filter((user) => activeFilters.length === 0 || user.roles.some((role) => activeFilters.includes(role.shortname)));

  // 2) Filter by search
  const searchFiltered = filteredByRole.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return user.username.toLowerCase().includes(searchLower) || user.discordId.toLowerCase().includes(searchLower) || user.roles.some((role) => role.name.toLowerCase().includes(searchLower));
  });

  // 3) Sort
  const sortedUsers = [...searchFiltered].sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return multiplier * a.username.localeCompare(b.username);
      case "memberSince":
        // If both are null, they're equal; if only one is null, it goes last
        if (a.memberSince === null && b.memberSince === null) return 0;
        if (a.memberSince === null) return sortOrder === "asc" ? 1 : -1;
        if (b.memberSince === null) return sortOrder === "asc" ? -1 : 1;
        // Both have dates, compare normally
        const aDate = new Date(a.memberSince).getTime();
        const bDate = new Date(b.memberSince).getTime();
        return multiplier * (aDate - bDate);
      case "joinedDiscord":
        const aJoinDate = a.joinedDiscord.getTime();
        const bJoinDate = b.joinedDiscord.getTime();
        return multiplier * (aJoinDate - bJoinDate);
      case "role":
        // If a user has no roles, watch out for .roles[0] being undefined
        const aRole = a.roles[0]?.name ?? "";
        const bRole = b.roles[0]?.name ?? "";
        return multiplier * aRole.localeCompare(bRole);
      default:
        return 0;
    }
  });

  // 4) Paginate: only slice out a chunk we want to render
  const pageSize = Number.parseInt(perPage, 10) || 12; // fallback to 12 if parse fails
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const displayedUsers = sortedUsers.slice(startIndex, endIndex);

  // 5) Number of pages total
  const totalPages = Math.ceil(sortedUsers.length / pageSize);

  // Sorting fields
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder((cur) => (cur === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setSortDropdownOpen(false);
  };

  // Toggle sort dropdown
  const toggleSortDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSortDropdownOpen(!sortDropdownOpen);
    setActiveActionDropdown(null);
  };

  // Toggle action dropdown
  const toggleActionDropdown = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveActionDropdown(activeActionDropdown === userId ? null : userId);
    setSortDropdownOpen(false);
  };

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPerPage(value);
    setCurrentPage(0); // Reset to first page when changing page size
  };

  // Handle role management
  const handleManageRoles = (user: MemberInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoleModal({
      isOpen: true,
      userId: user._id || "",
      username: user.username,
      userRoles: user.roles,
    });
    setActiveActionDropdown(null);
  };

  // Handle sending message
  const handleSendMessage = (user: MemberInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setMessageModal({
      isOpen: true,
      userId: user._id || "",
      username: user.username,
    });
    setActiveActionDropdown(null);
  };

  return (
    <div className="user-table">
      {/* Table header */}
      <div className="user-table-header">
        <h2 className="user-table-header-title">Users</h2>
        <div className="user-table-header-controls">
          {/* Search Bar */}
          <div className="user-table-search-wrapper flex items-center">
            <Search className="user-table-search-icon" />
            <Input placeholder="Search by username or discordId" className="user-table-search-input" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </div>

          {/* Sort Menu - Simple implementation */}
          <div className="relative">
            <Button variant="outline" size="sm" className="user-table-sort-trigger dropdown-trigger" onClick={toggleSortDropdown}>
              <span>Sort</span>
              <ChevronDown className="h-4 w-4" />
            </Button>

            {sortDropdownOpen && (
              <div className="dropdown-menu absolute right-0 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border border-gray-800/60 bg-[#1a1d29] text-white shadow-lg">
                <div className="cursor-pointer px-2 py-1.5 hover:bg-[#1e2235]/80" onClick={() => handleSort("name")}>
                  Name {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                </div>
                <div className="cursor-pointer px-2 py-1.5 hover:bg-[#1e2235]/80" onClick={() => handleSort("memberSince")}>
                  Member Since {sortField === "memberSince" && (sortOrder === "asc" ? "↑" : "↓")}
                </div>
                <div className="cursor-pointer px-2 py-1.5 hover:bg-[#1e2235]/80" onClick={() => handleSort("joinedDiscord")}>
                  Joined Discord {sortField === "joinedDiscord" && (sortOrder === "asc" ? "↑" : "↓")}
                </div>
                <div className="cursor-pointer px-2 py-1.5 hover:bg-[#1e2235]/80" onClick={() => handleSort("role")}>
                  Role {sortField === "role" && (sortOrder === "asc" ? "↑" : "↓")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="user-table-scroller">
        <table className="w-full">
          <thead>
            <tr className="user-table-thead">
              <th className="user-table-th">NAME</th>
              <th className="user-table-th hidden md:table-cell">MEMBER SINCE</th>
              <th className="user-table-th hidden lg:table-cell">JOINED DISCORD</th>
              <th className="user-table-th">ROLES</th>
              <th className="user-table-th">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((user) => (
              <React.Fragment key={user.discordId}>
                <tr className="user-table-row" onClick={() => handleExpandUser(user.discordId)}>
                  <td className="user-table-name-cell">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.username} className="max-h-[40px] max-w-[40px]" />
                        <AvatarFallback>
                          {(() => {
                            try {
                              return user.username ? user.username.substring(0, 2).toUpperCase() : "??";
                            } catch (error) {
                              console.error(`Error generating avatar fallback for user: ${user.username}`, error);
                              return "??";
                            }
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="user-table-name text-base">{user.username}</div>
                        <div className="user-table-discordId max-w-[150px] truncate text-xs md:max-w-[200px]">{user.discordId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="user-table-td hidden md:table-cell">{user.memberSince ? formatDate(user.memberSince) : "N/A"}</td>
                  <td className="user-table-td hidden lg:table-cell">{formatDate(user.joinedDiscord)}</td>
                  <td className="user-table-td">
                    <div className="user-table-roles-container">
                      {user.roles.slice(0, 2).map((role, idx) => (
                        <Badge
                          key={`role-${idx}`}
                          variant="outline"
                          className={`user-table-role-badge ${getRoleDotColor(role.shortname)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageRoles(user, e);
                          }}
                        >
                          <span className="mr-1">●</span>
                          {role.name}
                        </Badge>
                      ))}
                      {user.roles.length > 2 && (
                        <Badge
                          variant="outline"
                          className="user-table-role-badge"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageRoles(user, e);
                          }}
                        >
                          +{user.roles.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="user-table-td">
                    <div className="user-table-actions-container">
                      {/* Simple action dropdown */}
                      <div className="relative">
                        <Button variant="ghost" size="icon" className="user-table-action-btn dropdown-trigger" onClick={(e) => toggleActionDropdown(user._id || user.discordId, e)}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                        {activeActionDropdown === (user._id || user.discordId) && (
                          <div className="dropdown-menu absolute right-0 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border border-gray-800/60 bg-[#1a1d29] text-white shadow-lg">
                            <div className="cursor-pointer px-2 py-1.5 hover:bg-[#1e2235]/80" onClick={(e) => handleManageRoles(user, e)}>
                              Manage Roles
                            </div>
                            <div className="cursor-pointer px-2 py-1.5 hover:bg-[#1e2235]/80" onClick={(e) => handleSendMessage(user, e)}>
                              Send Message
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Expanded row */}
                {expandedRows.includes(user.discordId) && (
                  <UserExpandedRow
                    user={user}
                    userData={{
                      badges: getUserBadges(user.discordId),
                      nominations: getUserNominations(user.discordId),
                      votes: getUserVotes(user.discordId),
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with pagination controls */}
      <div className="user-table-footer">
        <div className="user-table-showing flex items-center gap-2 text-sm">
          <span>
            Showing page {currentPage + 1} of {totalPages || 1}
          </span>

          {/* Page size select */}
          <select value={perPage} onChange={(e) => handlePageSizeChange(e.target.value)} className="user-table-page-select-trigger">
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="36">36</option>
            <option value="48">48</option>
          </select>

          <span>({sortedUsers.length} total filtered)</span>
        </div>

        {/* Example "Next/Prev" buttons */}
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage <= 0}>
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((p) => {
                const next = p + 1;
                return next < totalPages ? next : p;
              })
            }
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Role Management Modal - Fixed positioning */}
      {roleModal.isOpen && (
        <RoleManagementModal userId={roleModal.userId} username={roleModal.username} userRoles={roleModal.userRoles} onClose={() => setRoleModal((prev) => ({ ...prev, isOpen: false }))} />
      )}

      {/* Message Modal - Fixed positioning */}
      {messageModal.isOpen && <MessageModal userId={messageModal.userId} username={messageModal.username} onClose={() => setMessageModal((prev) => ({ ...prev, isOpen: false }))} />}
    </div>
  );
}
