"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import {
  Menu,
  LayoutDashboard,
  ClipboardList,
  Package,
  Users,
  Cpu,
  Brain,
  LogOut,
  User,
  Database,
  CalendarCheck,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
  profile: Profile;
}

export function DashboardNav({ profile }: DashboardNavProps) {
  const pathname = usePathname();

  const adminLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/predictions", label: "Predictions", icon: Brain },
    { href: "/dashboard/requests", label: "Maintenance Requests", icon: ClipboardList },
    { href: "/dashboard/maintenance-calendar", label: "Maintenance Calendar", icon: CalendarCheck },
    { href: "/dashboard/tasks", label: "Task Management", icon: Cpu },
    { href: "/dashboard/inventory", label: "Inventory", icon: Package },
    { href: "/dashboard/datasets", label: "Datasets", icon: Database },
    { href: "/dashboard/users", label: "Users", icon: Users },
  ];

  const technicianLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/my-tasks", label: "My Tasks", icon: ClipboardList },
    { href: "/dashboard/maintenance-calendar", label: "Maintenance Calendar", icon: CalendarCheck },
  ];

  const userLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/my-devices", label: "My Devices", icon: Cpu },
    { href: "/dashboard/my-requests", label: "My Maintenance Requests", icon: ClipboardList },
    { href: "/dashboard/maintenance-calendar", label: "Maintenance Calendar", icon: CalendarCheck },
  ];

  const premiumLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/my-datasets", label: "My Datasets", icon: Database },
    { href: "/dashboard/my-devices", label: "My Devices", icon: Cpu },
    { href: "/dashboard/my-requests", label: "My Maintenance Requests", icon: ClipboardList },
    { href: "/dashboard/maintenance-calendar", label: "Maintenance Calendar", icon: CalendarCheck },
  ];

  const links =
    profile.role === "admin"
      ? adminLinks
      : profile.role === "technician"
        ? technicianLinks
        : profile.role === "premium_user"
          ? premiumLinks
          : userLinks;

  const initials =
    profile.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || profile.email[0].toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-lg border-b border-slate-200/50 shadow-sm dark:bg-slate-900/90 dark:border-slate-700/50 dark:shadow-black/30">
      <div className="container flex flex-col gap-3 py-3 md:flex-row md:items-start md:justify-between md:gap-6 md:py-4">
        <div className="flex items-center justify-between gap-3 flex-shrink-0 md:justify-start">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200 group">
            <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow dark:from-cyan-600 dark:to-cyan-500 dark:shadow-cyan-900/30">
              <Image
                src="/brand/eis-logo.jpg"
                alt="EIS logo"
                width={64}
                height={64}
                className="rounded-lg object-cover"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-lg tracking-tight text-slate-900 leading-tight dark:text-white">
                Maintenance EIS
              </span>
              <span className="text-sm text-slate-500 leading-tight dark:text-slate-400">System</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation menu"
                  className="h-10 w-10 rounded-full border border-slate-200/60 bg-white/70 text-slate-700 hover:bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="start" forceMount>
                <DropdownMenuLabel className="font-semibold px-2 py-2">
                  Navigation
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 transition-colors",
                          isActive
                            ? "bg-blue-100/80 text-blue-700 dark:bg-cyan-500/15 dark:text-cyan-300"
                            : "text-slate-700 dark:text-slate-200",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <nav className="hidden min-w-0 flex-1 md:ml-4 md:flex lg:ml-6">
          <div className="flex flex-wrap items-center gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href} className="relative group shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-2.5 whitespace-nowrap transition-all duration-200 font-medium shrink-0",
                      isActive
                        ? "bg-blue-100/80 text-blue-700 hover:bg-blue-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/50",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Button>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full animate-in fade-in dark:from-cyan-400 dark:to-cyan-300" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-slate-100 transition-all duration-200 shadow-sm border border-slate-200/50 dark:border-slate-700/60 dark:hover:bg-slate-700/60">
                <Avatar className="h-10 w-10 ring-2 ring-blue-200/50 dark:ring-cyan-400/30">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-500 text-white font-bold text-sm dark:from-cyan-500 dark:to-teal-400">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal px-2 py-3">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-bold">{profile.full_name || "User"}</p>
                  <p className="text-xs">{profile.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center cursor-pointer gap-2 px-2 py-2 rounded-md hover:bg-slate-100 transition-colors">
                  <User className="h-4 w-4 text-slate-600" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={() => signOut()} className="text-red-600 focus:text-red-600 cursor-pointer px-2 py-2 rounded-md hover:bg-red-50 transition-colors gap-2">
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
