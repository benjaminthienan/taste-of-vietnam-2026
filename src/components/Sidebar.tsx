"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  QrCode,
  History,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const menu = [
  {
    icon: LayoutDashboard,
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: Users,
    name: "Participants",
    href: "/participants",
  },
  {
    icon: UserCog,
    name: "Staff Accounts",
    href: "/staff",
  },
  {
    icon: QrCode,
    name: "QR Codes",
    href: "/qrcodes",
  },
  {
    icon: History,
    name: "History",
    href: "/history",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col bg-[#0B2E82] text-white shadow-xl">
        <div className="border-b border-blue-700 p-8">
          <h1 className="text-2xl font-bold">
            Taste of SEA
          </h1>

          <p className="mt-2 text-blue-200">
            Admin Panel
          </p>
        </div>

        <nav className="mt-6 flex-1 px-3">
          {menu.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`mb-2 flex w-full items-center gap-4 rounded-xl px-5 py-4 transition ${
                  isActive
                    ? "bg-[#061C52] text-white shadow-md"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                <Icon size={22} />

                <span className="text-lg font-medium">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-blue-700 p-6">
          <p className="font-semibold">
            Logged in as
          </p>

          <p className="mb-4 text-blue-200">
            admin
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-[#0B2E82] transition hover:bg-blue-50"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      <div className="w-72 shrink-0" />
    </>
  );
}