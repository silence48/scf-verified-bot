"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function SearchContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState(
    searchParams.get("search") || ""
  );

  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  return (
    <div className="search-input-wrapper flex items-center mb-6">
      <Search className="search-input-icon" />
      <input 
        type="text" 
        value={searchText} 
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search users, roles, badges..." 
        className="search-input" 
      />
    </div>
  );
}