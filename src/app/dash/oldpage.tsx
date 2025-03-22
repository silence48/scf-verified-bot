/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { RoleStats } from "@/components/RoleStats";
import { UserTable } from "@/components/UserTable";
import { Footer } from "@/components/footer";

export default function MembersPage() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleFilterToggle = (role: string) => {
    setActiveFilters((prev) => 
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="container mx-auto px-4 pb-6">
      <div className="flex flex-col gap-6">
    <h2 className="text-2xl font-schabo tracking-wide mb-4">Members Overview</h2>
    
    {/* 
    <RoleStats 
      activeFilters={activeFilters}
      onFilterToggle={handleFilterToggle}
    />
    
    <UserTable 
      activeFilters={activeFilters}
      onFilterToggleAction={handleFilterToggle}
    />
    */}
      </div>
      
      <Footer />
    </div>
  );
}

