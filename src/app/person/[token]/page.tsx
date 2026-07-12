"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CheckActionButton from "../../../components/CheckActionButton";
import { supabase } from "@/lib/supabase";

type ParticipantStatus =
  | "not_checked_in"
  | "checked_in"
  | "checked_out";

type Participant = {
  id: number;
  qr_token: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  picture_url: string | null;
  event_role: string | null;
  access_days: string[] | null;
  current_status: ParticipantStatus | null;
  last_action_at: string | null;
};

function sortAccessDays(
  days: string[] | null
) {
  if (!days?.length) {
    return "None";
  }

  return [...days]
    .sort((a, b) => {
      const dayA = Number(
        a.replace("July ", "")
      );

      const dayB = Number(
        b.replace("July ", "")
      );

      return dayA - dayB;
    })
    .join(", ");
}

function formatDateOfBirth(
  date: string | null
) {
  if (!date) {
    return "Not provided";
  }

  const parsedDate = new Date(
    `${date}T00:00:00`
  );

  return parsedDate.toLocaleDateString(
    "en-CA",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function formatPhoneNumber(
  phone: string | null
) {
  if (!phone) {
    return "Not provided";
  }

  const digits = phone
    .replace(/\D/g, "")
    .slice(0, 10);

  if (digits.length !== 10) {
    return phone;
  }

  return `${digits.slice(0, 3)}-${digits.slice(
    3,
    6
  )}-${digits.slice(6)}`;
}

export default function ParticipantPage() {
  const params = useParams<{
    token: string;
  }>();

  const token = params.token;

  const [participant, setParticipant] =
    useState<Participant | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadParticipant() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        const returnUrl = `/person/${token}`;

        window.location.replace(
          `/?next=${encodeURIComponent(
            returnUrl
          )}`
        );

        return;
      }

      const { data, error } = await supabase
        .from("people")
        .select(
          `
            id,
            qr_token,
            name,
            first_name,
            last_name,
            date_of_birth,
            email,
            phone,
            picture_url,
            event_role,
            access_days,
            current_status,
            last_action_at
          `
        )
        .eq("qr_token", token)
        .single();

      if (error || !data) {
        setErrorMessage(
          error?.message ||
            "Participant could not be found."
        );

        setLoading(false);
        return;
      }

      setParticipant(data as Participant);
      setLoading(false);
    }

    void loadParticipant();
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3F7FF]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-[#0B2E82]" />

          <p className="mt-5 font-semibold text-[#071A4A]">
            Verifying staff access...
          </p>
        </div>
      </main>
    );
  }

  if (!participant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3F7FF] p-5">
        <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-5 text-2xl font-bold text-[#071A4A]">
            Could Not Open QR Code
          </h1>

          <p className="mt-4 break-words text-slate-600">
            {errorMessage}
          </p>
        </section>
      </main>
    );
  }

  const fullName =
    [
      participant.first_name,
      participant.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    participant.name ||
    "Unnamed Participant";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#1747A6] to-[#071A4A] p-5">
      <section className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="bg-[#0B2E82] px-6 py-7 text-center text-white">
          <div className="text-5xl">
            🪷
          </div>

          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-blue-200">
            Taste of Vietnam 2026
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Backstage Access
          </h1>
        </header>

        <div className="p-6">
          <div className="mb-5 flex justify-center">
            {participant.picture_url ? (
              <img
                src={`/api/participant-image?url=${encodeURIComponent(
                  participant.picture_url
                )}`}
                alt={fullName}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-blue-100"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100 text-5xl">
                👤
              </div>
            )}
          </div>

          <h2 className="text-center text-3xl font-bold text-[#071A4A]">
            {fullName}
          </h2>

          <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5">
            <InfoRow
              label="DOB"
              value={formatDateOfBirth(
                participant.date_of_birth
              )}
            />

            <InfoRow
              label="Email"
              value={
                participant.email ||
                "Not provided"
              }
            />

            <InfoRow
              label="Phone"
              value={formatPhoneNumber(
                participant.phone
              )}
            />

            <InfoRow
              label="Access Days"
              value={sortAccessDays(
                participant.access_days
              )}
            />

            {participant.last_action_at && (
              <InfoRow
                label="Last Action"
                value={new Date(
                  participant.last_action_at
                ).toLocaleString("en-CA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
            )}
          </div>

          <CheckActionButton
            qrToken={participant.qr_token}
            initialStatus={
              participant.current_status
            }
          />
        </div>
      </section>
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-sm font-semibold text-slate-500">
        {label}
      </span>

      <span className="min-w-0 break-words text-right font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}