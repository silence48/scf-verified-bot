"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input, Label,Checkbox } from "@/components/ui";
//import "@/css/sidebar.css";
//import "@/app/globals.css";

export type RoleFilter = {
  id: string;
  name: string;
  color: string;
};

interface SidebarProps {
  roleFilters: RoleFilter[];
  activeFilters: string[];
  onFilterToggle: (roleName: string) => void;
}

export function Sidebar({ roleFilters, activeFilters, onFilterToggle }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
/*
  const roles = [
    { id: "verified", label: "Verified", color: "bg-emerald-500/20 text-emerald-400" },
    { id: "pathfinder", label: "Pathfinder", color: "bg-blue-500/20 text-blue-400" },
    { id: "navigator", label: "Navigator", color: "bg-indigo-500/20 text-indigo-400" },
    { id: "pilot", label: "Pilot", color: "bg-purple-500/20 text-purple-400" },
    { id: "stellar-protocol", label: "Stellar Protocol", color: "bg-amber-500/20 text-amber-400" },
    { id: "community-fund", label: "Community Fund", color: "bg-green-500/20 text-green-400" },
    { id: "stellar-developer", label: "Stellar Developer", color: "bg-pink-500/20 text-pink-400" },
  ];*/

 
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Filters</h2>

      <div className="search-wrapper">
        <Search className="search-icon" />
        <Input
          placeholder="Search users..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="role-heading">Roles</h3>
        <div className="role-list">
          {roleFilters.map((role) => (
            <div key={role.id} className="role-item">
              <Checkbox
                id={role.id}
                className="role-checkbox"
                checked={activeFilters.includes(role.name)}
                onChange={() => onFilterToggle(role.name)}
              />
              <Label htmlFor={role.id} className="role-label">
                <span className="role-circle" style={{ backgroundColor: role.color }}></span>
                {role.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
