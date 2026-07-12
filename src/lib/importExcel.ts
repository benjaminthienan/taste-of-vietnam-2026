import * as XLSX from "xlsx";

export type ImportedParticipant = {
  name: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  event_role: string | null;
  access_days: string[];
  picture_url: string | null;
  current_status: "not_checked_in";
};

type ExcelRow = Record<string, unknown>;

const ALL_EVENT_DAYS = [
  "July 16",
  "July 17",
  "July 18",
];

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
}

function normalizeRow(row: ExcelRow): ExcelRow {
  const normalized: ExcelRow = {};

  for (const [header, value] of Object.entries(row)) {
    normalized[normalizeHeader(header)] = value;
  }

  return normalized;
}

function getValue(
  row: ExcelRow,
  possibleHeaders: string[]
): unknown {
  for (const header of possibleHeaders) {
    const normalizedHeader = normalizeHeader(header);
    const value = row[normalizedHeader];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return "";
}

function getText(
  row: ExcelRow,
  possibleHeaders: string[]
): string {
  const value = getValue(row, possibleHeaders);

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

function formatPhone(
  value: string
): string | null {
  if (!value) {
    return null;
  }

  let digits = value.replace(/\D/g, "");

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) {
    return value.trim() || null;
  }

  return `${digits.slice(0, 3)}-${digits.slice(
    3,
    6
  )}-${digits.slice(6)}`;
}

function formatDate(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    const parsedDate =
      XLSX.SSF.parse_date_code(value);

    if (!parsedDate) {
      return null;
    }

    const year = String(parsedDate.y).padStart(
      4,
      "0"
    );

    const month = String(parsedDate.m).padStart(
      2,
      "0"
    );

    const day = String(parsedDate.d).padStart(
      2,
      "0"
    );

    return `${year}-${month}-${day}`;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    const year = value.getFullYear();

    const month = String(
      value.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      value.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();

  const month = String(
    parsed.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    parsed.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseAccessDays(
  value: string
): string[] {
  if (!value) {
    return [];
  }

  const normalized = value
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (
    normalized.includes("all 3 days") ||
    normalized.includes("all three days")
  ) {
    return [...ALL_EVENT_DAYS];
  }

  const accessDays: string[] = [];

  if (
    normalized.includes("july 16") ||
    normalized.includes("jul 16")
  ) {
    accessDays.push("July 16");
  }

  if (
    normalized.includes("july 17") ||
    normalized.includes("jul 17")
  ) {
    accessDays.push("July 17");
  }

  if (
    normalized.includes("july 18") ||
    normalized.includes("jul 18")
  ) {
    accessDays.push("July 18");
  }

  return accessDays;
}

function parseRoles(
  value: string
): string | null {
  if (!value) {
    return null;
  }

  const roles = value
    .split(/\r?\n|;|,/)
    .map((role) => role.trim())
    .filter(Boolean);

  const uniqueRoles = Array.from(
    new Set(roles)
  );

  if (uniqueRoles.length === 0) {
    return null;
  }

  return uniqueRoles.join(", ");
}

function getFirstImageUrl(
  value: string
): string | null {
  if (!value) {
    return null;
  }

  const urls = value.match(
    /https?:\/\/[^\s,;]+/gi
  );

  return urls?.[0] ?? null;
}

export async function importExcel(
  file: File
): Promise<ImportedParticipant[]> {
  const arrayBuffer =
    await file.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: false,
  });

  const sheetName =
    workbook.SheetNames.find(
      (name) =>
        name.trim().toLowerCase() ===
        "form responses"
    ) ?? workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error(
      "The Excel file has no worksheets."
    );
  }

  const worksheet =
    workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(
      `Could not open worksheet "${sheetName}".`
    );
  }

  const originalRows =
    XLSX.utils.sheet_to_json<ExcelRow>(
      worksheet,
      {
        defval: "",
        raw: true,
      }
    );

  const importedParticipants:
    ImportedParticipant[] = [];

  for (const originalRow of originalRows) {
    const row = normalizeRow(originalRow);

    const firstName = getText(row, [
      "Full Name - First Name",
      "Full Name  - First Name",
      "First Name",
    ]);

    const lastName = getText(row, [
      "Full Name - Last Name",
      "Full Name  - Last Name",
      "Last Name",
    ]);

    if (!firstName && !lastName) {
      continue;
    }

    const fullName = [
      firstName,
      lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const dateOfBirth = getValue(row, [
      "DOB",
      "Date of Birth",
    ]);

    const email = getText(row, [
      "E-mail",
      "Email",
      "Email Address",
    ]);

    const phone = getText(row, [
      "Phone number",
      "Phone Number",
      "Phone",
    ]);

    const eventRole = getText(row, [
      "What is your current occupation? ( if you are a student, please list the program you are studying)",
      "Role",
    ]);

    const accessDays = getText(row, [
      "Which days will you attend the Taste of Vietnam 2026?",
      "Access Days",
    ]);

    const imageUrl = getText(row, [
      "Please upload your image",
      "Picture",
      "Photo",
      "Image",
    ]);

    importedParticipants.push({
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      date_of_birth:
        formatDate(dateOfBirth),
      email: email
        ? email.toLowerCase()
        : null,
      phone: formatPhone(phone),
      event_role:
        parseRoles(eventRole),
      access_days:
        parseAccessDays(accessDays),
      picture_url:
        getFirstImageUrl(imageUrl),
      current_status:
        "not_checked_in",
    });
  }

  if (
    importedParticipants.length === 0
  ) {
    throw new Error(
      "No participant rows were detected in the spreadsheet."
    );
  }

  return importedParticipants;
}