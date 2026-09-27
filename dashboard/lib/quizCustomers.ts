import mysql from "mysql2/promise";

/* ===========================================================================
   QUIZ CUSTOMERS
   ---------------------------------------------------------------------------
   Reads directly from the ChemicalSuperstore intake quiz's own MariaDB
   database (a separate app at /srv/chemicalsuperstore-quiz, deployed at
   web99.ie/chemical-store — see project_chemicalsuperstore_quiz_deploy memory).
   That app has no dashboard of its own on purpose: this is the one place to
   review what a customer has submitted. One pool, reused across requests.
   =========================================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __quizPool: mysql.Pool | undefined;
}

function pool(): mysql.Pool {
  if (global.__quizPool) return global.__quizPool;
  const url = process.env.QUIZ_DATABASE_URL;
  if (!url) throw new Error("QUIZ_DATABASE_URL is not set. See .env.example.");
  const created = mysql.createPool({ uri: url, connectionLimit: 5 });
  global.__quizPool = created;
  return created;
}

export type QuizFile = { key: string; name: string; size: number; url: string };
export type QuizStatus = "new" | "reviewed" | "in_progress" | "archived";

// Canonical section order, matching the quiz app's own client/src/lib/quizzes.ts.
// Anything outside this list (e.g. the legacy "discovery" key) sorts last.
export const QUIZ_ORDER = ["foundation", "customers", "brand", "website", "products", "imagery", "operations", "launch"];
export const QUIZ_LABELS: Record<string, string> = {
  foundation: "Business foundation", customers: "Customers & stock", brand: "Brand & design",
  website: "Website goals", products: "Products & safety", imagery: "Images & content",
  operations: "Selling setup", launch: "Launch & handover", discovery: "Discovery quiz",
};

export type QuizSubmission = {
  id: number;
  clientName: string;
  clientEmail: string;
  businessName: string;
  quizKey: string;
  status: QuizStatus;
  answers: Record<string, unknown>;
  files: QuizFile[];
  submittedAt: string;
};

export type QuizSection = {
  quizKey: string;
  label: string;
  submissions: QuizSubmission[];
};

export type QuizCustomer = {
  businessName: string;
  sections: QuizSection[];
  latestSubmittedAt: string;
  newCount: number;
};

type Row = {
  id: number;
  clientName: string;
  clientEmail: string;
  businessName: string;
  quizKey: string;
  status: QuizStatus;
  answers: string;
  files: string;
  submittedAt: Date;
};

function quizRank(quizKey: string): number {
  const index = QUIZ_ORDER.indexOf(quizKey);
  return index === -1 ? QUIZ_ORDER.length : index;
}

export async function listQuizCustomers(includeArchived = false): Promise<QuizCustomer[]> {
  const [rows] = await pool().query<mysql.RowDataPacket[]>(
    "SELECT id, clientName, clientEmail, businessName, quizKey, status, answers, files, submittedAt FROM intakeSubmissions ORDER BY submittedAt DESC"
  );

  const submissions: QuizSubmission[] = (rows as Row[])
    .map(row => ({
      id: row.id,
      clientName: row.clientName,
      clientEmail: row.clientEmail,
      businessName: row.businessName,
      quizKey: row.quizKey,
      status: row.status,
      answers: JSON.parse(row.answers || "{}"),
      files: JSON.parse(row.files || "[]"),
      submittedAt: row.submittedAt.toISOString(),
    }))
    .filter(s => includeArchived || s.status !== "archived");

  const byBusiness = new Map<string, QuizSubmission[]>();
  for (const submission of submissions) {
    const list = byBusiness.get(submission.businessName) ?? [];
    list.push(submission);
    byBusiness.set(submission.businessName, list);
  }

  return [...byBusiness.entries()].map(([businessName, list]) => {
    const byQuiz = new Map<string, QuizSubmission[]>();
    for (const submission of list) {
      const group = byQuiz.get(submission.quizKey) ?? [];
      group.push(submission);
      byQuiz.set(submission.quizKey, group);
    }
    const sections: QuizSection[] = [...byQuiz.entries()]
      .sort(([a], [b]) => quizRank(a) - quizRank(b))
      .map(([quizKey, group]) => ({ quizKey, label: QUIZ_LABELS[quizKey] ?? quizKey, submissions: group }));

    return {
      businessName,
      sections,
      latestSubmittedAt: list[0]?.submittedAt ?? "",
      newCount: list.filter(s => s.status === "new").length,
    };
  });
}

export async function setSubmissionStatus(id: number, status: QuizStatus): Promise<void> {
  await pool().query("UPDATE intakeSubmissions SET status = ? WHERE id = ?", [status, id]);
}

export async function deleteSubmission(id: number): Promise<void> {
  await pool().query("DELETE FROM intakeSubmissions WHERE id = ?", [id]);
}

export async function countArchived(): Promise<number> {
  const [rows] = await pool().query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM intakeSubmissions WHERE status = 'archived'"
  );
  return Number((rows as { n: number }[])[0]?.n ?? 0);
}

export const QUIZ_FILE_BASE_URL = "https://web99.ie/chemical-store";
