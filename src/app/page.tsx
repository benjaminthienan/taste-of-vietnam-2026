"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function redirectExistingUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const nextUrl = new URLSearchParams(
        window.location.search
      ).get("next");

      if (nextUrl?.startsWith("/person/")) {
        window.location.replace(nextUrl);
      }
    }

    void redirectExistingUser();
  }, []);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const cleanUsername = username
      .trim()
      .toLowerCase();

    if (!cleanUsername || !password) {
      setMessage(
        "Please enter your username and password."
      );
      setLoading(false);
      return;
    }

    const internalEmail =
      `${cleanUsername}@staff.tov`;

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

    if (error || !data.user) {
      setMessage("Incorrect username or password.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setMessage(
        "This account does not have a profile."
      );

      setLoading(false);
      return;
    }

    const nextUrl = new URLSearchParams(
      window.location.search
    ).get("next");

    if (nextUrl?.startsWith("/person/")) {
      window.location.replace(nextUrl);
      return;
    }

    if (profile.role === "admin") {
      window.location.replace("/dashboard");
      return;
    }

    setMessage(
      "Login successful. Please scan a participant QR code."
    );

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0B2E82] via-[#1747A6] to-[#061C52] px-5">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mb-4 text-6xl">
            🪷
          </div>

          <p className="text-xs uppercase tracking-[0.32em] text-blue-200">
            Mel Lastman Square
          </p>

          <h1 className="mt-4 text-4xl font-bold">
            Taste of SEA 2026
          </h1>

          <p className="mt-3 text-blue-100">
            QR Check-In & Check-Out System
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-3xl bg-white p-8 shadow-2xl"
        >
          <h2 className="text-center text-2xl font-bold text-[#0B2E82]">
            Staff & Organizer Login
          </h2>

          <label
            htmlFor="username"
            className="mb-2 mt-7 block font-semibold text-slate-700"
          >
            Username
          </label>

          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            placeholder="Enter your username"
            autoComplete="username"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#1747A6] focus:ring-2 focus:ring-blue-100"
          />

          <label
            htmlFor="password"
            className="mb-2 mt-5 block font-semibold text-slate-700"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#1747A6] focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-xl bg-[#0B2E82] py-3 font-semibold text-white transition hover:bg-[#1747A6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          {message && (
            <p className="mt-4 rounded-xl bg-blue-50 p-3 text-center text-sm font-medium text-[#0B2E82]">
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}