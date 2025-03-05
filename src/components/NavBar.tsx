"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Settings, LogOut, User, ChevronDown } from "lucide-react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui";
import "@/css/navbar.css";

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const mockUser = {
    name: "John Doe",
    discordUsername: "johndoe#1234",
    avatar: "/placeholder.svg?height=40&width=40",
  };

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => setIsLoggedIn(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h1 className="navbar-title">SCF Roles</h1>

        {/* Desktop Menu */}
        <div className="navbar-desktop-menu">
          <Link href="/" className="navbar-link">
            Members
          </Link>
          <Link href="/metrics" className="navbar-link">
            Metrics
          </Link>

          {/* If user is logged in, show user dropdown; otherwise show login button */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="navbar-user-button">
                  <div className="navbar-user-wrapper">
                    <Avatar className="navbar-avatar">
                      <AvatarImage
                        src={mockUser.avatar}
                        alt={mockUser.name}
                      />
                      <AvatarFallback className="navbar-avatar-fallback">
                        {mockUser.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="navbar-user-info">
                      <span className="font-medium text-white">
                        {mockUser.name}
                      </span>
                      <span className="text-xs text-gray-300">
                        {mockUser.discordUsername}
                      </span>
                    </div>
                    <ChevronDown className="navbar-user-chevron" />
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="navbar-dropdown-content"
              >
                <div className="navbar-dropdown-header">
                  Signed in as{" "}
                  <span className="text-white">
                    {mockUser.discordUsername}
                  </span>
                </div>
                <DropdownMenuItem className="navbar-dropdown-item">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="navbar-dropdown-item">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="navbar-dropdown-separator" />
                <DropdownMenuItem
                  className="navbar-dropdown-item"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button className="navbar-login-button" onClick={handleLogin}>
              Login
            </Button>
          )}
        </div>

        {/* Mobile Menu (Sheet) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="navbar-mobile-trigger">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="navbar-sheet-content">
            <SheetHeader>
              <SheetTitle className="navbar-sheet-title">
                Menu
              </SheetTitle>
            </SheetHeader>

            <div className="navbar-sheet-menu">
              <Link href="/" className="navbar-link">
                Members
              </Link>
              <Link href="/metrics" className="navbar-link">
                Metrics
              </Link>

              {isLoggedIn ? (
                <div className="navbar-sheet-user-section">
                  <div className="navbar-sheet-user-row">
                    <Avatar className="navbar-avatar-large">
                      <AvatarImage
                        src={mockUser.avatar}
                        alt={mockUser.name}
                      />
                      <AvatarFallback className="navbar-avatar-fallback-large">
                        {mockUser.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="navbar-user-full-info">
                      <span className="font-medium text-white">
                        {mockUser.name}
                      </span>
                      <span className="text-xs text-gray-300">
                        {mockUser.discordUsername}
                      </span>
                    </div>
                  </div>

                  <Button variant="outline" className="navbar-sheet-button">
                    <User className="h-4 w-4" />
                    Profile
                  </Button>

                  <Button variant="outline" className="navbar-sheet-button mt-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>

                  <Button
                    variant="outline"
                    className="navbar-sheet-button mt-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Button
                  className="navbar-login-button w-full"
                  onClick={handleLogin}
                >
                  Login
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
