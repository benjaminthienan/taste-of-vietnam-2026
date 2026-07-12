"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import Sidebar from "@/components/Sidebar";
import {
  Download,
  QrCode,
  Search,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Participant = {
  id: number;
  qr_token: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  event_role: string | null;
  access_days: string[] | null;
};

const websiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://192.168.18.31:3000";

function sortAccessDays(days: string[] | null) {
  if (!days?.length) {
    return [];
  }

  return [...days].sort((a, b) => {
    const dayA = Number(a.replace("July ", ""));
    const dayB = Number(b.replace("July ", ""));

    return dayA - dayB;
  });
}

export default function QRCodesPage() {
  const [participants, setParticipants] = useState<
    Participant[]
  >([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    void loadParticipants();
  }, []);

  async function loadParticipants() {
    setLoading(true);
    setPageError("");

    const { data, error } = await supabase
      .from("people")
      .select(
        `
          id,
          qr_token,
          name,
          first_name,
          last_name,
          event_role,
          access_days
        `
      )
      .order("name", {
        ascending: true,
      });

    if (error) {
      setPageError(
        `Could not load QR codes: ${error.message}`
      );

      setLoading(false);
      return;
    }

    setParticipants((data ?? []) as Participant[]);
    setLoading(false);
  }

  function getParticipantName(
    participant: Participant
  ) {
    return (
      [
        participant.first_name,
        participant.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      participant.name ||
      "Unnamed Participant"
    );
  }

  const filteredParticipants = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    if (!searchValue) {
      return participants;
    }

    return participants.filter((participant) => {
      const fullName =
        getParticipantName(participant);

      return fullName
        .toLowerCase()
        .includes(searchValue);
    });
  }, [participants, search]);

  function getParticipantUrl(
    participant: Participant
  ) {
    return `${websiteUrl}/person/${participant.qr_token}`;
  }

  function downloadQrCode(
    participant: Participant
  ) {
    const svg = document.querySelector(
      `#qr-${participant.id} svg`
    ) as SVGSVGElement | null;

    if (!svg) {
      alert("QR code could not be downloaded.");
      return;
    }

    const clonedSvg =
      svg.cloneNode(true) as SVGSVGElement;

    clonedSvg.setAttribute(
      "xmlns",
      "http://www.w3.org/2000/svg"
    );

    const serializedSvg =
      new XMLSerializer().serializeToString(
        clonedSvg
      );

    const image = new Image();
    const canvas =
      document.createElement("canvas");

    const context =
      canvas.getContext("2d");

    canvas.width = 800;
    canvas.height = 800;

    image.onload = () => {
      if (!context) {
        alert(
          "QR code could not be downloaded."
        );
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.drawImage(
        image,
        80,
        80,
        640,
        640
      );

      const link =
        document.createElement("a");

      const safeName = getParticipantName(
        participant
      )
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      link.download =
        `${safeName}-qr-code.png`;

      link.href =
        canvas.toDataURL("image/png");

      link.click();
    };

    image.onerror = () => {
      alert(
        "QR code could not be downloaded."
      );
    };

    image.src =
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        serializedSvg
      )}`;
  }

  return (
    <main className="flex min-h-screen bg-[#F3F7FF]">
      <Sidebar />

      <section className="min-w-0 flex-1 p-6 md:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#071A4A] md:text-4xl">
            QR Codes
          </h1>

          <p className="mt-2 text-slate-600">
            Search, view, and download participant QR
            codes.
          </p>
        </div>

        {pageError && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p>{pageError}</p>

            <button
              type="button"
              onClick={() => setPageError("")}
              className="rounded-lg p-1 hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="mb-7 rounded-3xl border border-blue-100 bg-white p-5 shadow-lg">
          <div className="relative w-full max-w-xl">
            <Search
              size={21}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search participant by name..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-12 text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#1747A6] focus:ring-2 focus:ring-blue-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Showing {filteredParticipants.length} of{" "}
            {participants.length} QR code
            {participants.length === 1 ? "" : "s"}
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-14 text-center text-slate-500 shadow-lg">
            Loading QR codes...
          </div>
        ) : participants.length === 0 ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-14 text-center shadow-lg">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-[#0B2E82]">
              <QrCode size={38} />
            </div>

            <h2 className="text-2xl font-bold text-[#071A4A]">
              No QR codes yet
            </h2>

            <p className="mt-3 text-slate-600">
              Add or import participants first.
            </p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-14 text-center shadow-lg">
            <Search
              size={42}
              className="mx-auto text-slate-400"
            />

            <h2 className="mt-5 text-2xl font-bold text-[#071A4A]">
              No matching QR codes
            </h2>

            <p className="mt-3 text-slate-600">
              Try another participant name.
            </p>

            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-5 rounded-xl bg-[#0B2E82] px-5 py-3 font-semibold text-white hover:bg-[#1747A6]"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredParticipants.map(
              (participant) => {
                const participantName =
                  getParticipantName(participant);

                const participantUrl =
                  getParticipantUrl(participant);

                const sortedDays =
                  sortAccessDays(
                    participant.access_days
                  );

                return (
                  <article
                    key={participant.id}
                    className="rounded-3xl border border-blue-100 bg-white p-6 shadow-lg"
                  >
                    <h2 className="text-xl font-bold text-[#071A4A]">
                      {participantName}
                    </h2>

                    <p className="mt-1 text-slate-500">
                      {participant.event_role ||
                        "No role assigned"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {sortedDays.length > 0
                        ? sortedDays.join(", ")
                        : "No access days assigned"}
                    </p>

                    <div
                      id={`qr-${participant.id}`}
                      className="mt-6 flex justify-center rounded-2xl border border-slate-200 bg-white p-6"
                    >
                      <QRCode
                        value={participantUrl}
                        size={210}
                      />
                    </div>

                    <p className="mt-4 break-all text-xs text-slate-500">
                      {participantUrl}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        downloadQrCode(participant)
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B2E82] py-3 font-semibold text-white transition hover:bg-[#1747A6]"
                    >
                      <Download size={19} />
                      Download QR Code
                    </button>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}