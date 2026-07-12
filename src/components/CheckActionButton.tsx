"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type ParticipantStatus =
  | "not_checked_in"
  | "checked_in"
  | "checked_out";

type CheckActionButtonProps = {
  qrToken: string;
  initialStatus: ParticipantStatus | null;
};

export default function CheckActionButton({
  qrToken,
  initialStatus,
}: CheckActionButtonProps) {
  const [status, setStatus] = useState<ParticipantStatus>(
    initialStatus ?? "not_checked_in"
  );

  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isCheckedIn = status === "checked_in";

  function getStatusLabel() {
    if (status === "checked_in") return "Checked In";
    if (status === "checked_out") return "Checked Out";
    return "Not Checked In";
  }

  function getStatusStyle() {
    if (status === "checked_in") {
      return "bg-green-100 text-green-700";
    }

    if (status === "checked_out") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-yellow-100 text-yellow-800";
  }

  async function handleAction() {
    if (updating) return;

    setUpdating(true);
    setMessage("");
    setErrorMessage("");

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error(
            "The request timed out after 10 seconds. The database function may not be responding."
          )
        );
      }, 10000);
    });

    try {
      const {
        data: { session },
        error: sessionError,
      } = await Promise.race([
        supabase.auth.getSession(),
        timeout,
      ]);

      if (sessionError) {
        throw new Error(
          `Session error: ${sessionError.message}`
        );
      }

      if (!session) {
        setErrorMessage(
          "You are not logged in. Please log in before checking someone in."
        );

        setUpdating(false);
        return;
      }

      const requestedAction = isCheckedIn
        ? "check_out"
        : "check_in";

      const result = await Promise.race([
        supabase.rpc("handle_check_action", {
          person_token: qrToken,
          requested_action: requestedAction,
        }),
        timeout,
      ]);

      const { data, error } = result;

      if (error) {
        throw new Error(
          `${error.message}${
            error.details ? ` — ${error.details}` : ""
          }`
        );
      }

      const updatedParticipant = Array.isArray(data)
        ? data[0]
        : data;

      if (!updatedParticipant) {
        throw new Error(
          "The database returned no participant information."
        );
      }

      const updatedStatus =
        updatedParticipant.current_status;

      if (
        updatedStatus !== "not_checked_in" &&
        updatedStatus !== "checked_in" &&
        updatedStatus !== "checked_out"
      ) {
        throw new Error(
          `Unexpected status returned: ${String(
            updatedStatus
          )}`
        );
      }

      setStatus(updatedStatus);

      setMessage(
        requestedAction === "check_in"
          ? "Check-in successful."
          : "Check-out successful."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The check-in request failed."
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="mt-4">
      {message && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-center font-semibold text-green-700">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
        <span className="text-sm font-semibold text-slate-500">
          Status
        </span>

        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${getStatusStyle()}`}
        >
          {getStatusLabel()}
        </span>
      </div>

      <button
        type="button"
        onClick={handleAction}
        disabled={updating}
        className={`w-full cursor-pointer rounded-2xl py-4 text-lg font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${
          isCheckedIn
            ? "bg-red-600 hover:bg-red-700"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {updating
          ? "Updating..."
          : isCheckedIn
            ? "Check Out"
            : "Check In"}
      </button>
    </div>
  );
}