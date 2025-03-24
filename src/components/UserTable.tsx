"use client";
import React, { useState } from "react";
import { Search, ChevronDown, MoreVertical, Bell, UserPlus, Plus } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Badge,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { MemberInfo } from "@/discord-bot/types";
// If you already have a custom Pagination component, you can use that instead.

function getRoleDotColor(roleName: string): string {
  switch (roleName) {
    case "Navigator":
      return "text-indigo-400";
    case "Pilot":
      return "text-purple-400";
    case "Pathfinder":
      return "text-blue-400";
    case "Verified":
      return "text-emerald-400";
    default:
      return "text-gray-400";
  }
}

interface UserTableProps {
  activeFilters: string[];
  onFilterToggleAction: (role: string) => void;
  members: MemberInfo[];
}

type SortField = "name" | "memberSince" | "joinedDiscord" | "role";
type SortOrder = "asc" | "desc";

export function UserTable({ activeFilters, onFilterToggleAction, members }: UserTableProps) {
  // Local client state for search, sorting, expansion, pagination, etc.
  const [searchTerm, setSearchTerm] = useState("");
  const [perPage, setPerPage] = useState("12"); // string from the <Select>
  const [currentPage, setCurrentPage] = useState(0); // zero-based page index

  const [sortField, setSortField] = useState<SortField>("memberSince");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // Expand/Collapse row
  const toggleRowExpansion = (userId: string) => {
    setExpandedRows((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  // 1) Filter by active role filters
  const filteredByRole = members.filter((user) => activeFilters.length === 0 || user.roles.some((role) => activeFilters.includes(role.name)));

  // 2) Filter by search
  const searchFiltered = filteredByRole.filter((user) => {
    const combined = JSON.stringify(user).toLowerCase();
    return combined.includes(searchTerm.toLowerCase());
  });

  // 3) Sort
  const sortedUsers = [...searchFiltered].sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return multiplier * a.username.localeCompare(b.username);
      case "memberSince":
        return multiplier * (new Date(a.memberSince).getTime() - new Date(b.memberSince).getTime());
      case "joinedDiscord":
        return multiplier * (new Date(a.joinedDiscord).getTime() - new Date(b.joinedDiscord).getTime());
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
  const pageSize = parseInt(perPage, 10) || 12; // fallback to 12 if parse fails
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
  };

  return (
    <div className="user-table">
      {/* Table header */}
      <div className="user-table-header">
        <h2 className="user-table-header-title">Recent Members</h2>
        <div className="user-table-header-controls">
          {/* Search Bar */}
          <div className="user-table-search-wrapper">
            <Search className="user-table-search-icon" />
            <Input placeholder="Search by username or discordId" className="user-table-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          {/* Sort Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="user-table-sort-trigger">
                <span>Sort</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="user-table-dropdown">
              <DropdownMenuItem className="user-table-dropdown-item" onClick={() => handleSort("name")}>
                Name {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem className="user-table-dropdown-item" onClick={() => handleSort("memberSince")}>
                Member Since {sortField === "memberSince" && (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem className="user-table-dropdown-item" onClick={() => handleSort("joinedDiscord")}>
                Joined Discord {sortField === "joinedDiscord" && (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem className="user-table-dropdown-item" onClick={() => handleSort("role")}>
                Role {sortField === "role" && (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                <tr className="user-table-row" onClick={() => toggleRowExpansion(user.discordId)}>
                  <td className="user-table-name-cell">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={user.avatar || undefined} alt={user.username} />
                        <AvatarFallback>
                          {(() => {
                            try {
                              return user.username ? user.username.substring(0, 2).toUpperCase() : "??";
                            } catch (error) {
                              console.error(`Error generating avatar fallback for user: ${user}`, error);
                              return "??";
                            }
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="user-table-name">{user.username}</div>
                        <div className="user-table-discordId">{user.discordId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="user-table-td hidden md:table-cell">{new Date(Number(user.memberSince)).toLocaleDateString()}</td>
                  <td className="user-table-td hidden lg:table-cell">{new Date(Number(user.joinedDiscord)).toLocaleDateString()}</td>
                  <td className="user-table-td">
                    <div className="user-table-roles-container">
                      {user.roles.map((role, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={`user-table-role-badge ${getRoleDotColor(role.name)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onFilterToggleAction(role.name);
                          }}
                        >
                          <span className="mr-1">●</span>
                          {role.name}
                        </Badge>
                      ))}
                      {user.roles.length < 2 && (
                        <Button variant="ghost" size="icon" className="user-table-role-add" onClick={(e) => e.stopPropagation()}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="user-table-td">
                    <div className="user-table-actions-container">
                      <Button variant="ghost" size="icon" className="user-table-action-btn" onClick={(e) => e.stopPropagation()}>
                        <Bell className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="user-table-action-btn" onClick={(e) => e.stopPropagation()}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="user-table-action-btn" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="user-table-dropdown">
                          <DropdownMenuItem className="user-table-dropdown-item">View Profile</DropdownMenuItem>
                          <DropdownMenuItem className="user-table-dropdown-item">Manage Roles</DropdownMenuItem>
                          <DropdownMenuItem className="user-table-dropdown-item">Send Message</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>

                {/* Expanded row */}
                {expandedRows.includes(user.discordId) && (
                  <tr className="user-table-expanded-row">
                    <td colSpan={5} className="user-table-expanded-cell">
                      <div className="space-y-3 text-sm text-gray-300">
                        <div className="user-table-detail-box">
                          <h3 className="user-table-section-title">Profile Description</h3>
                          <p>{user.profileDescription}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="user-table-detail-box">
                            <h3 className="user-table-section-title">Community Information</h3>
                            <p>
                              <span className="user-table-label">Joined Stellar Developers:</span> {new Date(Number(user.joinedStellarDevelopers)).toLocaleDateString()}
                            </p>
                            <p>
                              <span className="user-table-label">Member Since:</span> {new Date(Number(user.memberSince)).toLocaleDateString()}
                            </p>
                            <p>
                              <span className="user-table-label">Joined Discord:</span> {new Date(Number(user.joinedDiscord)).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="user-table-detail-box">
                            <h3 className="user-table-section-title">Role History</h3>
                            <ul className="space-y-1">
                              {user.roles.map((role, idx2) => (
                                <li key={idx2} className="flex items-center gap-2">
                                  <span className={getRoleDotColor(role.name)}>●</span>
                                  <span>{role.name}:</span>
                                  {role.obtained && <span className="user-table-label"> Obtained on {new Date(Number(role.obtained)).toLocaleDateString()}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
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
          <Select
            value={perPage}
            onValueChange={(val) => {
              setPerPage(val);
              // Reset to page 0 when changing page size
              setCurrentPage(0);
            }}
          >
            <SelectTrigger className="user-table-page-select-trigger">
              <SelectValue placeholder="12" />
            </SelectTrigger>
            <SelectContent className="user-table-page-select-content">
              <SelectItem value="12" className="user-table-dropdown-item">
                12
              </SelectItem>
              <SelectItem value="24" className="user-table-dropdown-item">
                24
              </SelectItem>
              <SelectItem value="36" className="user-table-dropdown-item">
                36
              </SelectItem>
              <SelectItem value="48" className="user-table-dropdown-item">
                48
              </SelectItem>
            </SelectContent>
          </Select>

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
    </div>
  );
}
