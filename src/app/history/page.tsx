"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PersonData = {
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

type RawHistoryLog = {
  id: number;
  person_id: number;
  staff_id: string | null;
  action: "check_in" | "check_out";
  created_at: string;
  people: PersonData | PersonData[] | null;
};

type HistoryLog = {
  id: number;
  participantName: string;
  phone: string;
  action: "check_in" | "check_out";
  createdAt: string;
  completedBy: string;
};

function getPerson(
  relation: PersonData | PersonData[] | null
): PersonData | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatPhoneNumber(phone: string | null) {
  if (!phone) {
    return "Not provided";
  }

  const digits = phone.replace(/\D/g, "").slice(0, 10);

  if (digits.length !== 10) {
    return phone;
  }

  return `${digits.slice(0, 3)}-${digits.slice(
    3,
    6
  )}-${digits.slice(6)}`;
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const { data, error } = await supabase
      .from("check_logs")
      .select(
        `
          id,
          person_id,
          staff_id,
          action,
          created_at,
          people!check_logs_person_id_fkey (
            name,
            first_name,
            last_name,
            phone
          )
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setPageError(
        `Could not load history: ${error.message}`
      );
      setLoading(false);
      return;
    }

    const rawLogs = (data ?? []) as RawHistoryLog[];

    const staffIds = Array.from(
      new Set(
        rawLogs
          .map((log) => log.staff_id)
          .filter(
            (staffId): staffId is string =>
              Boolean(staffId)
          )
      )
    );

    const staffNameMap = new Map<string, string>();

    if (staffIds.length > 0) {
      const { data: profiles, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, name, username")
          .in("id", staffIds);

      if (!profileError) {
        for (const profile of profiles ?? []) {
          staffNameMap.set(
            profile.id,
            profile.name ||
              profile.username ||
              "Staff"
          );
        }
      }
    }

    const formattedLogs = rawLogs.map((log) => {
      const person = getPerson(log.people);

      const fullName =
        [person?.first_name, person?.last_name]
          .filter(Boolean)
          .join(" ") ||
        person?.name ||
        "Unknown Participant";

      return {
        id: log.id,
        participantName: fullName,
        phone: formatPhoneNumber(person?.phone ?? null),
        action: log.action,
        createdAt: log.created_at,
        completedBy: log.staff_id
          ? staffNameMap.get(log.staff_id) || "Staff"
          : "Unknown",
      };
    });

    setLogs(formattedLogs);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHistory();

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadHistory();
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
  }, [loadHistory]);

  const filteredLogs = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return logs;
    }

    return logs.filter((log) => {
      return (
        log.participantName
          .toLowerCase()
          .includes(searchValue) ||
        log.phone
          .toLowerCase()
          .includes(searchValue) ||
        log.completedBy
          .toLowerCase()
          .includes(searchValue)
      );
    });
  }, [logs, search]);

  return (
    <main className="flex min-h-screen bg-[#F3F7FF]">
      <Sidebar />

      <section className="min-w-0 flex-1 p-6 md:p-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#071A4A] md:text-4xl">
              History
            </h1>

            <p className="mt-2 text-slate-600">
              View all participant check-in and
              check-out activity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadHistory()}
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
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {pageError}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-lg">
          <div className="border-b border-blue-100 p-5">
            <div className="relative w-full max-w-md">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search participant, phone, or staff..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#1747A6] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#EAF1FF]">
                <tr className="text-left text-sm font-semibold uppercase tracking-wide text-[#0B2E82]">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">
                    Participant
                  </th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">
                    Completed By
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      Loading history...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      No check-in history yet.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const actionDate = new Date(
                      log.createdAt
                    );

                    return (
                      <tr
                        key={log.id}
                        className="border-t border-slate-200 text-slate-700 hover:bg-blue-50/60"
                      >
                        <td className="px-6 py-5">
                          {actionDate.toLocaleDateString(
                            "en-CA",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {actionDate.toLocaleTimeString(
                            "en-CA",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </td>

                        <td className="px-6 py-5 font-semibold text-slate-900">
                          {log.participantName}
                        </td>

                        <td className="px-6 py-5">
                          {log.phone}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${
                              log.action === "check_in"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {log.action === "check_in"
                              ? "Checked In"
                              : "Checked Out"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          {log.completedBy}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-500">
            Showing {filteredLogs.length} action
            {filteredLogs.length === 1 ? "" : "s"}
          </div>
        </div>
      </section>
    </main>
  );
}