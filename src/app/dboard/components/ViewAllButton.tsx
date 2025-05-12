"use client";

import { Button } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";

export default function ViewAllButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchText = searchParams.get("search") || "";
  
  const handleViewAll = () => {
    if (searchText) {
      router.push(`/users?search=${encodeURIComponent(searchText)}`);
    } else {
      router.push("/users");
    }
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleViewAll} 
      className="border-blue-400/30 text-sm text-blue-400 hover:border-blue-400/50 hover:text-blue-300"
    >
      View all
    </Button>
  );
}