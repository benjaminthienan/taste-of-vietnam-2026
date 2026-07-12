"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Sidebar from "@/components/Sidebar";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  UserCog,
  X,
} from "lucide-react";

type StaffAccount = {
  id: string;
  name: string;
  username: string;
  role: "staff";
};

type CreatedCredentials = {
  name: string;
  username: string;
  password: string;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffAccount[]>([]);

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);

  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);

  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    void loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    setPageError("");

    try {
      const response = await fetch("/api/staff", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not load staff accounts."
        );
      }

      setStaff(result.staff ?? []);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Could not load staff accounts."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
  }

  function openForm() {
    resetForm();
    setPageError("");
    setSuccessMessage("");
    setCopied(false);
    setShowForm(true);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function closeCredentialsModal() {
    setCreatedCredentials(null);
    setCopied(false);
  }

  async function copyLoginDetails() {
    if (!createdCredentials) {
      return;
    }

    const loginDetails = [
      "Taste of Vietnam 2026 Staff Login",
      "",
      `Name: ${createdCredentials.name}`,
      `Username: ${createdCredentials.username}`,
      `Password: ${createdCredentials.password}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(loginDetails);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setPageError(
        "Could not copy the login details. Please copy them manually."
      );
    }
  }

  async function handleCreateStaff(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanUsername = username
      .trim()
      .toLowerCase();

    if (!cleanName) {
      setPageError(
        "Please enter the staff member's name."
      );
      return;
    }

    if (!cleanUsername) {
      setPageError("Please enter a username.");
      return;
    }

    if (password.length < 6) {
      setPageError(
        "The password must contain at least 6 characters."
      );
      return;
    }

    setSaving(true);
    setPageError("");
    setSuccessMessage("");

    const passwordForDisplay = password;

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          username: cleanUsername,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not create the staff account."
        );
      }

      setStaff((currentStaff) =>
        [...currentStaff, result.staff].sort(
          (a, b) =>
            a.name.localeCompare(b.name)
        )
      );

      setCreatedCredentials({
        name: cleanName,
        username: cleanUsername,
        password: passwordForDisplay,
      });

      closeForm();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Could not create the staff account."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#F3F7FF]">
      <Sidebar />

      <section className="min-w-0 flex-1 p-6 md:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#071A4A] md:text-4xl">
              Staff Accounts
            </h1>

            <p className="mt-2 text-slate-600">
              Create individual accounts for
              check-in staff.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadStaff()}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#1747A6] px-5 py-3 font-semibold text-[#1747A6] transition hover:bg-blue-50 disabled:opacity-60"
            >
              <RefreshCw
                size={18}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={openForm}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0B2E82] px-5 py-3 font-semibold text-white transition hover:bg-[#1747A6]"
            >
              <Plus size={20} />
              Add Staff Account
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
            <p className="font-semibold">
              {successMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              aria-label="Dismiss success message"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {pageError && (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p>{pageError}</p>

            <button
              type="button"
              onClick={() => setPageError("")}
              aria-label="Dismiss error message"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-lg">
          <div className="grid grid-cols-[1.5fr_1fr_0.7fr] bg-[#EAF1FF] px-6 py-4 text-sm font-semibold uppercase tracking-wide text-[#0B2E82]">
            <span>Name</span>
            <span>Username</span>
            <span>Role</span>
          </div>

          {loading ? (
            <div className="p-14 text-center text-slate-500">
              Loading staff accounts...
            </div>
          ) : staff.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-[#0B2E82]">
                <UserCog size={30} />
              </div>

              <h2 className="mt-4 text-xl font-bold text-[#071A4A]">
                No staff accounts yet
              </h2>

              <p className="mt-2 text-slate-500">
                Create the first staff account to
                begin.
              </p>
            </div>
          ) : (
            staff.map((account) => (
              <div
                key={account.id}
                className="grid grid-cols-[1.5fr_1fr_0.7fr] items-center border-t border-slate-200 px-6 py-5 text-slate-700 transition hover:bg-blue-50/60"
              >
                <span className="font-semibold text-slate-900">
                  {account.name}
                </span>

                <span>{account.username}</span>

                <span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    Staff
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5 py-8">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-[#071A4A]">
                Add Staff Account
              </h2>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={handleCreateStaff}
              className="mt-6"
              autoComplete="off"
            >
              <label
                htmlFor="staff-name"
                className="block font-semibold text-slate-700"
              >
                Full Name
              </label>

              <input
                id="staff-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter your name"
                autoComplete="off"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1747A6] focus:ring-2 focus:ring-blue-100"
              />

              <label
                htmlFor="staff-username"
                className="mt-5 block font-semibold text-slate-700"
              >
                Username
              </label>

              <input
                id="staff-username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                      .toLowerCase()
                      .replace(
                        /[^a-z0-9._-]/g,
                        ""
                      )
                  )
                }
                placeholder="Enter a username"
                autoComplete="off"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1747A6] focus:ring-2 focus:ring-blue-100"
              />

              <label
                htmlFor="staff-password"
                className="mt-5 block font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative mt-2">
                <input
                  id="staff-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter a password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1747A6] focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0B2E82]"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#0B2E82] px-5 py-3 font-semibold text-white transition hover:bg-[#1747A6] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Creating..."
                    : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-5 py-8">
          <section className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                <Check size={32} />
              </div>

              <h2 className="mt-5 text-2xl font-bold text-[#071A4A]">
                Staff Account Created
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Copy these login details before
                closing this window.
              </p>
            </div>

            <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5">
              <CredentialRow
                label="Name"
                value={createdCredentials.name}
              />

              <CredentialRow
                label="Username"
                value={createdCredentials.username}
              />

              <CredentialRow
                label="Password"
                value={createdCredentials.password}
              />
            </div>

            <button
              type="button"
              onClick={() =>
                void copyLoginDetails()
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B2E82] px-5 py-3 font-semibold text-white transition hover:bg-[#1747A6]"
            >
              {copied ? (
                <>
                  <Check size={20} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Copy Login Details
                </>
              )}
            </button>

            <button
              type="button"
              onClick={closeCredentialsModal}
              className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Done
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function CredentialRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <span className="shrink-0 text-sm font-semibold text-slate-500">
        {label}
      </span>

      <span className="break-all text-right font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}