"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

type DashboardStats = {
  participants: number;
  checkedIn: number;
  checkedOut: number;
  staff: number;
};

const emptyStats: DashboardStats = {
  participants: 0,
  checkedIn: 0,
  checkedOut: 0,
  staff: 0,
};

export default function DashboardPage() {
  const [stats, setStats] =
    useState<DashboardStats>(emptyStats);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const [
      participantResult,
      checkedInResult,
      checkedOutResult,
      staffResult,
    ] = await Promise.all([
      supabase
        .from("people")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("people")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("current_status", "checked_in"),

      supabase
        .from("people")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("current_status", "checked_out"),

      supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("role", "staff"),
    ]);

    const firstError =
      participantResult.error ||
      checkedInResult.error ||
      checkedOutResult.error ||
      staffResult.error;

    if (firstError) {
      setPageError(
        `Could not load dashboard: ${firstError.message}`
      );
      setLoading(false);
      return;
    }

    setStats({
      participants: participantResult.count ?? 0,
      checkedIn: checkedInResult.count ?? 0,
      checkedOut: checkedOutResult.count ?? 0,
      staff: staffResult.count ?? 0,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStats();

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadStats();
      }
    }

    window.addEventListener("focus", refreshWhenVisible);

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshWhenVisible
      );

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );
    };
  }, [loadStats]);

  return (
    <main className="flex min-h-screen bg-[#F3F7FF]">
      <Sidebar />

      <section className="min-w-0 flex-1 p-6 md:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#071A4A] md:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 text-slate-600">
              Welcome back, Admin.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadStats()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#1747A6] px-5 py-3 font-semibold text-[#1747A6] transition hover:bg-blue-50 disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />

            Refresh
          </button>
        </div>

        {pageError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {pageError}
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Participants"
            value={stats.participants}
            loading={loading}
            valueClassName="text-[#071A4A]"
          />

          <StatCard
            label="Checked In"
            value={stats.checkedIn}
            loading={loading}
            valueClassName="text-green-600"
          />

          <StatCard
            label="Checked Out"
            value={stats.checkedOut}
            loading={loading}
            valueClassName="text-blue-600"
          />

          <StatCard
            label="Staff"
            value={stats.staff}
            loading={loading}
            valueClassName="text-[#071A4A]"
          />
        </div>

        <div className="mt-8 rounded-3xl border border-blue-100 bg-white p-7 shadow-lg">
          <h2 className="text-xl font-bold text-[#071A4A]">
            Current Event Status
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatusSummary
              label="Not Checked In"
              value={Math.max(
                stats.participants -
                  stats.checkedIn -
                  stats.checkedOut,
                0
              )}
              className="bg-yellow-50 text-yellow-800"
            />

            <StatusSummary
              label="Currently Inside"
              value={stats.checkedIn}
              className="bg-green-50 text-green-700"
            />

            <StatusSummary
              label="Left Event"
              value={stats.checkedOut}
              className="bg-blue-50 text-blue-700"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  loading,
  valueClassName,
}: {
  label: string;
  value: number;
  loading: boolean;
  valueClassName: string;
}) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-lg">
      <p className="font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-4 text-5xl font-bold ${valueClassName}`}
      >
        {loading ? "—" : value}
      </p>
    </div>
  );
}

function StatusSummary({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}>
      <p className="text-sm font-semibold">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}