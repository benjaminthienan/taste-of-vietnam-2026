"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Sidebar from "@/components/Sidebar";
import {
  AlertCircle,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { importExcel } from "@/lib/importExcel";

type ParticipantStatus =
  | "not_checked_in"
  | "checked_in"
  | "checked_out";

type Participant = {
  id: number;
  qr_token: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  picture_url: string | null;
  event_role: string | null;
  access_days: string[];
  notes: string | null;
  current_status: ParticipantStatus;
};

const availableDays = ["August 7", "August 8"];

const participantColumns = `
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
  notes,
  current_status
`;

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(
    3,
    6
  )}-${digits.slice(6)}`;
}

function formatPhoneDisplay(phone: string | null) {
  if (!phone) {
    return "N/A";
  }

  let digits = phone.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) {
    return phone;
  }

  return `${digits.slice(0, 3)}-${digits.slice(
    3,
    6
  )}-${digits.slice(6)}`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "N/A";
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-CA",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function sortAccessDays(days: string[]) {
  const order = new Map(
    availableDays.map((day, index) => [day, index])
  );

  return [...days].sort(
    (a, b) =>
      (order.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b) ?? Number.MAX_SAFE_INTEGER)
  );
}

function splitRoles(role: string | null) {
  if (!role) {
    return [];
  }

  return role
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ParticipantsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [participants, setParticipants] = useState<
    Participant[]
  >([]);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [editingParticipant, setEditingParticipant] =
    useState<Participant | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventRole, setEventRole] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [accessDays, setAccessDays] = useState<
    string[]
  >([]);

  useEffect(() => {
    void loadParticipants();
  }, []);

  async function loadParticipants() {
    setLoading(true);
    setPageError("");

    const { data, error } = await supabase
      .from("people")
      .select(participantColumns)
      .order("name", { ascending: true });

    if (error) {
      setPageError(
        `Could not load participants: ${error.message}`
      );
      setLoading(false);
      return;
    }

    setParticipants((data ?? []) as Participant[]);
    setLoading(false);
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setEmail("");
    setPhone("");
    setEventRole("");
    setPictureUrl("");
    setNotes("");
    setAccessDays([]);
  }

  function openAddForm() {
    resetForm();
    setEditingParticipant(null);
    setPageError("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function openEditForm(participant: Participant) {
    setEditingParticipant(participant);

    setFirstName(participant.first_name ?? "");
    setLastName(participant.last_name ?? "");
    setDateOfBirth(participant.date_of_birth ?? "");
    setEmail(participant.email ?? "");
    setPhone(
      participant.phone
        ? formatPhoneInput(participant.phone)
        : ""
    );
    setEventRole(participant.event_role ?? "");
    setPictureUrl(participant.picture_url ?? "");
    setNotes(participant.notes ?? "");
    setAccessDays(participant.access_days ?? []);

    setPageError("");
    setSuccessMessage("");
    setShowForm(true);
  }

  function closeForm() {
    resetForm();
    setEditingParticipant(null);
    setShowForm(false);
  }

  function toggleDay(day: string) {
    setAccessDays((currentDays) =>
      currentDays.includes(day)
        ? currentDays.filter(
            (currentDay) => currentDay !== day
          )
        : [...currentDays, day]
    );
  }

  function validateParticipantForm() {
    if (!firstName.trim()) {
      alert("Please enter the first name.");
      return false;
    }

    if (!lastName.trim()) {
      alert("Please enter the last name.");
      return false;
    }

    if (!email.trim() || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return false;
    }

    const phoneDigits = phone.replace(/\D/g, "");

    if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
      alert(
        "Please enter a complete 10-digit phone number or leave it blank."
      );
      return false;
    }

    if (!eventRole.trim()) {
      alert("Please enter the performance category.");
      return false;
    }

    if (accessDays.length === 0) {
      alert("Please select at least one access day.");
      return false;
    }

    return true;
  }

  async function handleImportExcel(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImporting(true);
    setPageError("");
    setSuccessMessage("");

    try {
      const importedParticipants =
        await importExcel(file);

      const confirmed = window.confirm(
        `Import ${importedParticipants.length} participants from "${file.name}"?`
      );

      if (!confirmed) {
        return;
      }

      const { data, error } = await supabase
        .from("people")
        .insert(importedParticipants)
        .select(participantColumns);

      if (error) {
        throw new Error(error.message);
      }

      const newParticipants =
        (data ?? []) as Participant[];

      setParticipants((currentParticipants) =>
        [
          ...currentParticipants,
          ...newParticipants,
        ].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setSuccessMessage(
        `Imported ${newParticipants.length} participants successfully. Their QR codes were generated automatically.`
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? `Could not import Excel file: ${error.message}`
          : "Could not import the Excel file."
      );
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  async function handleSaveParticipant(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    if (!validateParticipantForm()) {
      return;
    }

    setSaving(true);

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const fullName =
      `${cleanFirstName} ${cleanLastName}`;

    const participantValues = {
      name: fullName,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      date_of_birth: dateOfBirth || null,
      email: email.trim().toLowerCase(),
      phone: phone.trim() ? formatPhoneInput(phone) : null,
      event_role: eventRole.trim(),
      access_days: sortAccessDays(accessDays),
      picture_url: pictureUrl.trim() || null,
      notes: notes.trim() || null,
    };

    if (editingParticipant) {
      const { data, error } = await supabase
        .from("people")
        .update(participantValues)
        .eq("id", editingParticipant.id)
        .select(participantColumns)
        .single();

      if (error) {
        setPageError(
          `Could not update participant: ${error.message}`
        );
        setSaving(false);
        return;
      }

      const updatedParticipant =
        data as Participant;

      setParticipants((currentParticipants) =>
        currentParticipants
          .map((participant) =>
            participant.id === updatedParticipant.id
              ? updatedParticipant
              : participant
          )
          .sort((a, b) =>
            a.name.localeCompare(b.name)
          )
      );

      setSuccessMessage(
        `${fullName} was updated successfully. Their QR code remains the same.`
      );

      closeForm();
      setSaving(false);
      return;
    }

    const participantToInsert = {
      ...participantValues,
      current_status: "not_checked_in",
    };

    const { data, error } = await supabase
      .from("people")
      .insert(participantToInsert)
      .select(participantColumns)
      .single();

    if (error) {
      setPageError(
        `Could not add participant: ${error.message}`
      );
      setSaving(false);
      return;
    }

    setParticipants((currentParticipants) =>
      [...currentParticipants, data as Participant].sort(
        (a, b) => a.name.localeCompare(b.name)
      )
    );

    setSuccessMessage(
      `${fullName} was added successfully. Their QR code is ready.`
    );

    closeForm();
    setSaving(false);
  }

  async function handleDeleteParticipant(
    participant: Participant
  ) {
    const confirmed = window.confirm(
      `Delete ${participant.name}? Their QR code and related history may also be removed.`
    );

    if (!confirmed) {
      return;
    }

    setPageError("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", participant.id);

    if (error) {
      setPageError(
        `Could not delete participant: ${error.message}`
      );
      return;
    }

    setParticipants((currentParticipants) =>
      currentParticipants.filter(
        (currentParticipant) =>
          currentParticipant.id !== participant.id
      )
    );

    setSuccessMessage(
      `${participant.name} was deleted.`
    );
  }

  const filteredParticipants = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return participants;
    }

    return participants.filter((participant) => {
      return (
        participant.name
          .toLowerCase()
          .includes(searchValue) ||
        participant.email
          ?.toLowerCase()
          .includes(searchValue) ||
        participant.phone
          ?.toLowerCase()
          .includes(searchValue) ||
        participant.event_role
          ?.toLowerCase()
          .includes(searchValue) ||
        participant.notes
          ?.toLowerCase()
          .includes(searchValue)
      );
    });
  }, [participants, search]);

  function getStatusLabel(
    status: ParticipantStatus
  ) {
    if (status === "checked_in") {
      return "Checked In";
    }

    if (status === "checked_out") {
      return "Checked Out";
    }

    return "Not Checked In";
  }

  function getStatusStyle(
    status: ParticipantStatus
  ) {
    if (status === "checked_in") {
      return "bg-green-100 text-green-700";
    }

    if (status === "checked_out") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-yellow-100 text-yellow-800";
  }

  return (
    <main className="flex min-h-screen bg-[#F3F7FF]">
      <Sidebar />

      <section className="min-w-0 flex-1 p-6 md:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#071A4A] md:text-4xl">
            Participants
          </h1>

          <p className="mt-2 text-slate-600">
            Add performers or import the Taste of SEA
            registration spreadsheet.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
            <p className="font-semibold">
              {successMessage}
            </p>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss success message"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {pageError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle
              size={22}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="mt-1 text-sm">
                {pageError}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPageError("")}
              aria-label="Dismiss error message"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-lg">
          <div className="flex flex-col gap-4 border-b border-blue-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
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
                placeholder="Search name, email, category, or notes..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#1747A6] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={importing}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#1747A6] px-5 py-3 font-semibold text-[#1747A6] transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
              >
                {importing ? (
                  <Upload
                    size={20}
                    className="animate-pulse"
                  />
                ) : (
                  <FileSpreadsheet size={20} />
                )}

                {importing
                  ? "Importing..."
                  : "Import Excel"}
              </button>

              <button
                type="button"
                onClick={openAddForm}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#0B2E82] px-5 py-3 font-semibold text-white transition hover:bg-[#1747A6]"
              >
                <Plus size={20} />
                Add Participant
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-290px)] overflow-auto">
            <table className="w-full min-w-[1810px] table-fixed">
              <colgroup>
                <col className="w-[190px]" />
                <col className="w-[135px]" />
                <col className="w-[270px]" />
                <col className="w-[150px]" />
                <col className="w-[280px]" />
                <col className="w-[210px]" />
                <col className="w-[300px]" />
                <col className="w-[165px]" />
                <col className="w-[120px]" />
              </colgroup>

              <thead className="sticky top-0 z-10 bg-[#EAF1FF]">
                <tr className="text-left text-sm font-semibold uppercase tracking-wide text-[#0B2E82]">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">DOB</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Performance Category</th>
                  <th className="px-6 py-4">
                    Access Days
                  </th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4">
                    Status
                  </th>
                  <th className="px-4 py-4 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      Loading participants...
                    </td>
                  </tr>
                ) : filteredParticipants.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      No participants found.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map(
                    (participant) => {
                      const roles = splitRoles(
                        participant.event_role
                      );

                      const days =
                        participant.access_days?.length
                          ? sortAccessDays(
                              participant.access_days
                            ).join(", ")
                          : "None";

                      return (
                        <tr
                          key={participant.id}
                          className="border-t border-slate-200 text-slate-700 hover:bg-blue-50/60"
                        >
                          <td className="px-6 py-5 align-middle">
                            <span className="font-semibold text-slate-900">
                              {participant.name}
                            </span>
                          </td>

                          <td className="px-6 py-5 align-middle">
                            <span className="whitespace-nowrap">
                              {formatDate(
                                participant.date_of_birth
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-5 align-middle">
                            <span
                              className="block overflow-hidden text-ellipsis whitespace-nowrap"
                              title={
                                participant.email ||
                                "Not provided"
                              }
                            >
                              {participant.email ||
                                "Not provided"}
                            </span>
                          </td>

                          <td className="px-6 py-5 align-middle">
                            <span className="whitespace-nowrap">
                              {formatPhoneDisplay(
                                participant.phone
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-5 align-middle">
                            {roles.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {roles.map(
                                  (role, index) => (
                                    <span
                                      key={`${participant.id}-${role}-${index}`}
                                      className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                                    >
                                      {role}
                                    </span>
                                  )
                                )}
                              </div>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-5 align-middle">
                            <span>{days}</span>
                          </td>

                          <td className="px-6 py-5 align-middle">
                            <span
                              className="block overflow-hidden text-ellipsis whitespace-nowrap"
                              title={participant.notes || "N/A"}
                            >
                              {participant.notes || "N/A"}
                            </span>
                          </td>

                          <td className="px-6 py-5 align-middle">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${getStatusStyle(
                                participant.current_status
                              )}`}
                            >
                              {getStatusLabel(
                                participant.current_status
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-5 align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditForm(
                                    participant
                                  )
                                }
                                className="rounded-lg border border-blue-200 p-2 text-[#1747A6] transition hover:bg-blue-50"
                                title="Edit participant"
                                aria-label={`Edit ${participant.name}`}
                              >
                                <Pencil size={18} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteParticipant(
                                    participant
                                  )
                                }
                                className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                                title="Delete participant"
                                aria-label={`Delete ${participant.name}`}
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-500">
            Showing {filteredParticipants.length}{" "}
            participant
            {filteredParticipants.length === 1
              ? ""
              : "s"}
          </div>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-5 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#071A4A]">
                  {editingParticipant
                    ? "Edit Participant"
                    : "Add Participant"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingParticipant
                    ? "Update the participant information. Their QR code will remain the same."
                    : "A unique QR code will be generated automatically."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveParticipant}>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="First Name">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) =>
                      setFirstName(event.target.value)
                    }
                    placeholder="Enter your first name"
                    required
                    className="form-input"
                  />
                </FormField>

                <FormField label="Last Name">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) =>
                      setLastName(event.target.value)
                    }
                    placeholder="Enter your last name"
                    required
                    className="form-input"
                  />
                </FormField>

                <FormField label="Date of Birth (Optional)">
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(event) =>
                      setDateOfBirth(event.target.value)
                    }
                    className="form-input"
                  />
                </FormField>

                <FormField label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="name@example.com"
                    required
                    className="form-input"
                  />
                </FormField>

                <FormField label="Phone (Optional)">
                  <input
                    type="tel"
                    value={phone}
                    maxLength={12}
                    onChange={(event) =>
                      setPhone(
                        formatPhoneInput(
                          event.target.value
                        )
                      )
                    }
                    placeholder="N/A"
                    className="form-input"
                  />
                </FormField>

                <FormField label="Performance Category">
                  <textarea
                    value={eventRole}
                    onChange={(event) =>
                      setEventRole(event.target.value)
                    }
                    placeholder="Singer, dancer, band, cultural troupe..."
                    rows={3}
                    required
                    className="form-input resize-y"
                  />
                </FormField>
              </div>

              <FormField label="Picture URL (Optional)">
                <input
                  type="url"
                  value={pictureUrl}
                  onChange={(event) =>
                    setPictureUrl(event.target.value)
                  }
                  placeholder="N/A"
                  className="form-input"
                />
              </FormField>

              <FormField label="Notes (Optional)">
                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  rows={2}
                  placeholder={
                    "Notes: ..."
                  }
                  className="form-input resize-y"
                />
              </FormField>

              <fieldset className="mt-5">
                <legend className="mb-3 font-semibold text-slate-700">
                  Access Days
                </legend>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {availableDays.map((day) => (
                    <label
                      key={day}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                        accessDays.includes(day)
                          ? "border-[#1747A6] bg-blue-50"
                          : "border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={accessDays.includes(day)}
                        onChange={() => toggleDay(day)}
                      />

                      <span className="font-medium text-slate-700">
                        {day}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

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
                  className="rounded-xl bg-[#0B2E82] px-5 py-3 font-semibold text-white hover:bg-[#1747A6] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? editingParticipant
                      ? "Saving Changes..."
                      : "Adding..."
                    : editingParticipant
                      ? "Save Changes"
                      : "Add Participant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .form-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.75rem 1rem;
          color: rgb(15 23 42);
          outline: none;
        }

        .form-input::placeholder {
          color: rgb(148 163 184);
        }

        .form-input:focus {
          border-color: #1747a6;
          box-shadow: 0 0 0 2px rgb(219 234 254);
        }
      `}</style>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-5 block">
      <span className="mb-2 block font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}