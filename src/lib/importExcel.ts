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
  notes: string | null;
  current_status: "not_checked_in";
};

type ExcelRow = Record<string, unknown>;
type ExcelArrayRow = unknown[];

const PERFORMER_EVENT_DAYS = [
  "August 7",
  "August 8",
];

const STAFF_EVENT_DAYS = [
  "August 6",
  "August 7",
  "August 8",
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
    value === null ||
    value === ""
  ) {
    return "";
  }

  return String(value).trim();
}

function getExcelDate(
  value: unknown
): Date | null {
  if (typeof value === "number") {
    const parsedDate =
      XLSX.SSF.parse_date_code(value);

    if (!parsedDate) {
      return null;
    }

    return new Date(
      parsedDate.y,
      parsedDate.m - 1,
      parsedDate.d
    );
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return value;
  }

  return null;
}

function parseAccessDays(
  value: unknown
): string[] {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  const excelDate = getExcelDate(value);

  if (excelDate) {
    const month =
      excelDate.getMonth() + 1;

    const day =
      excelDate.getDate();

    if (month === 8 && day === 6) {
      return ["August 6"];
    }

    if (month === 8 && day === 7) {
      return ["August 7"];
    }

    if (month === 8 && day === 8) {
      return ["August 8"];
    }

    return [];
  }

  const normalized = String(value)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  if (
    normalized.includes("all 3 days") ||
    normalized.includes("all three days") ||
    normalized.includes("aug 6, 7 and 8") ||
    normalized.includes("august 6, 7 and 8")
  ) {
    return [...STAFF_EVENT_DAYS];
  }

  if (
    normalized.includes("both days") ||
    normalized.includes("all 2 days") ||
    normalized.includes("all two days") ||
    normalized.includes("aug 7 and aug 8") ||
    normalized.includes("august 7 and august 8") ||
    normalized.includes("aug 7 & aug 8") ||
    normalized.includes("august 7 & august 8")
  ) {
    return [...PERFORMER_EVENT_DAYS];
  }

  const accessDays: string[] = [];

  const hasAugust6 =
    /\baug(?:ust)?\.?\s*0?6\b/i.test(
      normalized
    ) ||
    /\b2026[-/ ]0?8[-/ ]0?6\b/i.test(
      normalized
    ) ||
    /\b0?8[-/ ]0?6[-/ ]2026\b/i.test(
      normalized
    );

  const hasAugust7 =
    /\baug(?:ust)?\.?\s*0?7\b/i.test(
      normalized
    ) ||
    /\b2026[-/ ]0?8[-/ ]0?7\b/i.test(
      normalized
    ) ||
    /\b0?8[-/ ]0?7[-/ ]2026\b/i.test(
      normalized
    );

  const hasAugust8 =
    /\baug(?:ust)?\.?\s*0?8\b/i.test(
      normalized
    ) ||
    /\b2026[-/ ]0?8[-/ ]0?8\b/i.test(
      normalized
    ) ||
    /\b0?8[-/ ]0?8[-/ ]2026\b/i.test(
      normalized
    );

  if (hasAugust6) {
    accessDays.push("August 6");
  }

  if (hasAugust7) {
    accessDays.push("August 7");
  }

  if (hasAugust8) {
    accessDays.push("August 8");
  }

  return accessDays;
}

function cleanCategory(
  value: string
): string | null {
  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  if (
    cleaned.toLowerCase() === "other"
  ) {
    return "Other";
  }

  return cleaned;
}

function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function buildGroupNotes(
  groupMembers: string
): string | null {
  const cleaned = groupMembers.trim();

  if (!cleaned) {
    return null;
  }

  return `Number of Group Members: ${cleaned}`;
}

function isDirectorsHeading(
  row: ExcelArrayRow
): boolean {
  return row.some((cell) => {
    const text = String(cell ?? "")
      .trim()
      .toLowerCase();

    return text.includes(
      "directors and stage leaders"
    );
  });
}

function extractDirectorsAndStageLeaders(
  worksheet: XLSX.WorkSheet
): ImportedParticipant[] {
  const rows =
    XLSX.utils.sheet_to_json<ExcelArrayRow>(
      worksheet,
      {
        header: 1,
        defval: "",
        raw: true,
      }
    );

  const participants:
    ImportedParticipant[] = [];

  const headingIndex =
    rows.findIndex(isDirectorsHeading);

  if (headingIndex === -1) {
    return participants;
  }

  for (
    let index = headingIndex + 1;
    index < rows.length;
    index += 1
  ) {
    const row = rows[index];

    const fullName = String(
      row[0] ?? ""
    )
      .trim()
      .replace(/\s+/g, " ");

    const email = String(
      row[2] ?? row[1] ?? ""
    ).trim();

    const spreadsheetRole = String(
      row[3] ?? ""
    ).trim();

    const rowIsEmpty = row.every(
      (cell) =>
        String(cell ?? "").trim() === ""
    );

    if (rowIsEmpty) {
      continue;
    }

    if (!fullName) {
      continue;
    }

    const normalizedName =
      fullName.toLowerCase();

    if (
      normalizedName.includes(
        "directors and stage leaders"
      )
    ) {
      continue;
    }

    const { firstName, lastName } =
      splitFullName(fullName);

    const eventRole =
      spreadsheetRole
        .toLowerCase()
        .includes("board director")
        ? "Board Director"
        : "Stage Leader";

    participants.push({
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: null,
      email: email
        ? email.toLowerCase()
        : null,
      phone: null,
      event_role: eventRole,
      access_days: [
        ...STAFF_EVENT_DAYS,
      ],
      picture_url: null,
      notes: null,
      current_status:
        "not_checked_in",
    });
  }

  return participants;
}

function removeDuplicates(
  participants: ImportedParticipant[]
): ImportedParticipant[] {
  const uniqueParticipants =
    new Map<string, ImportedParticipant>();

  for (const participant of participants) {
    const key = [
      participant.name
        .trim()
        .toLowerCase(),
      participant.email
        ?.trim()
        .toLowerCase() ?? "",
    ].join("|");

    uniqueParticipants.set(
      key,
      participant
    );
  }

  return Array.from(
    uniqueParticipants.values()
  );
}

export async function importExcel(
  file: File
): Promise<ImportedParticipant[]> {
  const arrayBuffer =
    await file.arrayBuffer();

  const workbook = XLSX.read(
    arrayBuffer,
    {
      type: "array",
      cellDates: false,
    }
  );

  const sheetName =
    workbook.SheetNames.find(
      (name) =>
        name.trim().toLowerCase() ===
        "final"
    ) ??
    workbook.SheetNames.find(
      (name) =>
        name.trim().toLowerCase() ===
        "form responses"
    ) ??
    workbook.SheetNames[0];

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

  for (
    const originalRow of originalRows
  ) {
    const row =
      normalizeRow(originalRow);

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
      .replace(/\s+/g, " ")
      .trim();

    if (!fullName) {
      continue;
    }

    const email = getText(row, [
      "Email",
      "E-mail",
      "Email Address",
    ]);

    const performanceCategory =
      getText(row, [
        "Performance Category",
        "Category",
        "Role",
      ]);

    const groupMembers =
      getText(row, [
        "Number of Group Members",
        "Group Members",
        "Number of Members",
      ]);

    const scheduleValue =
      getValue(row, [
        "Additional Notes / Requirements",
        "Additional Notes",
        "Requirements",
        "Schedule",
      ]);

    const accessDays =
      parseAccessDays(scheduleValue);

    importedParticipants.push({
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: null,
      email: email
        ? email.trim().toLowerCase()
        : null,
      phone: null,
      event_role:
        cleanCategory(
          performanceCategory
        ),
      access_days: accessDays,
      picture_url: null,
      notes:
        buildGroupNotes(groupMembers),
      current_status:
        "not_checked_in",
    });
  }

  const directorsAndLeaders =
    extractDirectorsAndStageLeaders(
      worksheet
    );

  const finalParticipants =
    removeDuplicates([
      ...importedParticipants,
      ...directorsAndLeaders,
    ]);

  if (
    finalParticipants.length === 0
  ) {
    throw new Error(
      "No performer, director, or stage leader rows were detected in the spreadsheet."
    );
  }

  return finalParticipants;
}