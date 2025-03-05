"use client";
import React, { useState } from "react";
import {
  Search,
  ChevronDown,
  MoreVertical,
  Bell,
  UserPlus,
  Plus,
} from "lucide-react";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui";
import "@/css/usertable.css";

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

interface UserMember {
  discordId: string;
  name: string;
  avatar: string;
  memberSince: string;
  joinedDiscord: string;
  roles: Array<{
    name: string;
    obtained: string;
  }>;
  joinedStellarDevelopers?: string;
  profileDescription?: string;
}

interface UserTableProps {
  activeFilters: string[];
  onFilterToggleAction: (role: string) => void;
  members: UserMember[];
}

type SortField = "name" | "memberSince" | "joinedDiscord" | "role";
type SortOrder = "asc" | "desc";

export function UserTable({
  activeFilters,
  onFilterToggleAction,
  members,
}: UserTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [perPage, setPerPage] = useState("12");
  const [sortField, setSortField] = useState<SortField>("memberSince");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleRowExpansion = (userId: string) => {
    setExpandedRows((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Filter by active role filters
  const filteredUsers = members.filter(
    (user) =>
      activeFilters.length === 0 ||
      user.roles.some((role) => activeFilters.includes(role.name))
  );

  // search filter
  const searchFiltered = filteredUsers.filter((user) => {
    const combined = (user.name + " " + user.discordId).toLowerCase();
    return combined.includes(searchTerm.toLowerCase());
  });

  // Sorting logic
  const sortedUsers = [...searchFiltered].sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return multiplier * a.name.localeCompare(b.name);
      case "memberSince":
        return (
          multiplier *
          (new Date(a.memberSince).getTime() -
            new Date(b.memberSince).getTime())
        );
      case "joinedDiscord":
        return (
          multiplier *
          (new Date(a.joinedDiscord).getTime() -
            new Date(b.joinedDiscord).getTime())
        );
      case "role":
        return multiplier * a.roles[0].name.localeCompare(b.roles[0].name);
      default:
        return 0;
    }
  });

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
          <div className="user-table-search-wrapper">
            <Search className="user-table-search-icon" />
            <Input
              placeholder="Search by username or discordId"
              className="user-table-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="user-table-sort-trigger">
                <span>Sort</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="user-table-dropdown">
              <DropdownMenuItem
                className="user-table-dropdown-item"
                onClick={() => handleSort("name")}
              >
                Name {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="user-table-dropdown-item"
                onClick={() => handleSort("memberSince")}
              >
                Member Since{" "}
                {sortField === "memberSince" && (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="user-table-dropdown-item"
                onClick={() => handleSort("joinedDiscord")}
              >
                Joined Discord{" "}
                {sortField === "joinedDiscord" &&
                  (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="user-table-dropdown-item"
                onClick={() => handleSort("role")}
              >
                Role {sortField === "role" && (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
            {sortedUsers.map((user) => (
              <React.Fragment key={user.discordId}>
                <tr
                  className="user-table-row"
                  onClick={() => toggleRowExpansion(user.discordId)}
                >
                  <td className="user-table-name-cell">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="user-table-name">{user.name}</div>
                        <div className="user-table-discordId">
                          {user.discordId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="user-table-td hidden md:table-cell">
                    {user.memberSince}
                  </td>
                  <td className="user-table-td hidden lg:table-cell">
                    {user.joinedDiscord}
                  </td>
                  <td className="user-table-td">
                    <div className="user-table-roles-container">
                      {user.roles.map((role, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={`user-table-role-badge ${getRoleDotColor(
                            role.name
                          )}`}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="user-table-role-add"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="user-table-td">
                    <div className="user-table-actions-container">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="user-table-action-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="user-table-action-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="user-table-action-btn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="user-table-dropdown">
                          <DropdownMenuItem className="user-table-dropdown-item">
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="user-table-dropdown-item">
                            Manage Roles
                          </DropdownMenuItem>
                          <DropdownMenuItem className="user-table-dropdown-item">
                            Send Message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>

                {/* Expanded row */}
                {expandedRows.includes(user.discordId) && (
                  <tr className="user-table-expanded-row">
                    <td colSpan={5} className="user-table-expanded-cell">
                      <div className="text-sm text-gray-300 space-y-3">
                        <div className="user-table-detail-box">
                          <h3 className="user-table-section-title">
                            Profile Description
                          </h3>
                          <p>{user.profileDescription}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="user-table-detail-box">
                            <h3 className="user-table-section-title">
                              Community Information
                            </h3>
                            <p>
                              <span className="user-table-label">
                                Joined Stellar Developers:
                              </span>{" "}
                              {user.joinedStellarDevelopers ?? "N/A"}
                            </p>
                            <p>
                              <span className="user-table-label">Member Since:</span>{" "}
                              {user.memberSince}
                            </p>
                            <p>
                              <span className="user-table-label">Joined Discord:</span>{" "}
                              {user.joinedDiscord}
                            </p>
                          </div>

                          <div className="user-table-detail-box">
                            <h3 className="user-table-section-title">
                              Role History
                            </h3>
                            <ul className="space-y-1">
                              {user.roles.map((role, idx2) => (
                                <li key={idx2} className="flex items-center gap-2">
                                  <span className={getRoleDotColor(role.name)}>
                                    ●
                                  </span>
                                  <span>{role.name}:</span>
                                  {role.obtained && (
                                    <span className="user-table-label">
                                      {" "}
                                      Obtained on {role.obtained}
                                    </span>
                                  )}
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

      {/* Footer with pagination & select */}
      <div className="user-table-footer">
        <div className="user-table-showing">
          <span>Showing</span>
          <Select value={perPage} onValueChange={setPerPage}>
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
          <span>members of {sortedUsers.length}</span>
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" className="user-table-page-link" />
            </PaginationItem>

            <PaginationItem>
              <PaginationLink
                href="#"
                isActive
                className="user-table-page-link-active"
              >
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" className="user-table-page-link">
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" className="user-table-page-link">
                3
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" className="user-table-page-link">
                4
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" className="user-table-page-link">
                5
              </PaginationLink>
            </PaginationItem>

            <PaginationItem>
              <PaginationEllipsis className="user-table-page-ellipsis" />
            </PaginationItem>

            <PaginationItem>
              <PaginationNext href="#" className="user-table-page-link" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
