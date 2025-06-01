import * as cheerio from "cheerio";

// utils
import { get, post } from "../utils/server-request";

// configs
import { BASE_URL } from "../configs/app-vars.config";

// lib
import { prisma } from "../lib/prisma";

const LIST_PATH = "/?mode=on_list&exec=liste&qry=";
const SELECT_PATH = "/?exec=update_patient&mode=view";

const FETCH_INTERVAL = 5 * 1000;
const TIMEZONE = "Asia/Baku";

interface FormData {
  compress: number;
  q: string;
  adr: string;
  arp: string;
  st_length: number;
  [key: string]: string | number;
}

function getFormattedDate(): string {
  const date = new Date();
  return date
    .toLocaleString("en-GB", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("");
}

async function updateStatus(status: {
  status: "idle" | "fetching" | "success" | "error";
  message: string;
  patient_count: number;
}) {
  try {
    await prisma.fetchStatus.create({
      data: {
        lastFetch: new Date(),
        status: status.status,
        message: status.message,
        patientCount: status.patient_count,
      },
    });

    // Async cleanup: keep only the latest 500 records
    setImmediate(async () => {
      try {
        const totalCount = await prisma.fetchStatus.count();

        if (totalCount > 500) {
          const cutoffRecord = await prisma.fetchStatus.findMany({
            select: { id: true },
            orderBy: { createdAt: "desc" },
            skip: 499, // Skip the newest 499 records
            take: 1, // Get the 500th record
          });

          if (cutoffRecord.length > 0) {
            await prisma.fetchStatus.deleteMany({
              where: {
                id: {
                  lt: cutoffRecord[0].id,
                },
              },
            });
          }
        }
      } catch (cleanupError) {
        console.error(
          "Failed to cleanup old fetch status records:",
          cleanupError
        );
      }
    });

    if (status.patient_count > 0) {
      // save the patient count asynchronously
      await prisma.patientFetch.create({
        data: {
          patientCount: status.patient_count,
        },
      });
    }
  } catch (error) {
    console.error("Failed to update status in database:", error);
  }
}

async function isAutomationEnabled(): Promise<boolean> {
  try {
    const toggle = await prisma.automationToggle.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });
    return toggle?.isEnabled ?? false;
  } catch (error) {
    console.error("Failed to check automation status:", error);
    return false;
  }
}

async function fetchNames(DAY: string): Promise<string[]> {
  const query = encodeURIComponent(
    JSON.stringify({
      level: 2,
      username: "dr.lacin",
      isdr: "1",
      isrp: "0",
      time: "5",
      kurum: ["ABS_KTMBAKU"],
      myreports: false,
      showdr: false,
      showrp: false,
      showacc: false,
      timerange: "",
      timestart: "",
      timeend: "",
      patientid: "",
      accession: "",
      patientname: "",
      modality: [
        "MR",
        "CT",
        "SR",
        "PR",
        "CR",
        "DR",
        "DR",
        "NM",
        "XA",
        "US",
        "SC",
        "MG",
        "OT",
        "RF",
      ],
      status: ["4"],
      selectdr: [],
      selectrp: [],
      daystart: DAY,
      dayend: DAY,
    })
  );

  const LIST_URL = `${BASE_URL}${LIST_PATH}${query}`;
  const res = await get(LIST_URL);
  const html = await res.text();

  const $ = cheerio.load(html);
  const names: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $("#st tbody tr input[type=checkbox][name]").each((_: number, el: any) => {
    const name = $(el).attr("name");
    if (name) {
      names.push(name);
    }
  });
  return names;
}

function buildBody(names: string[], DAY: string): FormData {
  const form: FormData = {
    compress: 0,
    q: `kurum=ABS_KTMBAKU&query= and StudyDate between '${DAY}' and '${DAY}'   and  view = 0 `,
    adr: "",
    arp: "",
    st_length: 1000,
  };

  // add each patient selection to the form object
  for (const name of names) {
    form[name] = "on";
  }

  return form;
}

async function fetchPatients() {
  if (!(await isAutomationEnabled())) {
    await updateStatus({
      status: "idle",
      message: "Automation is disabled",
      patient_count: 0,
    });
    return;
  }

  try {
    await updateStatus({
      status: "fetching",
      message: "Fetching patients...",
      patient_count: 0,
    });

    const DAY = getFormattedDate();
    console.log(`Fetching patients for ${DAY}...`);

    const names = await fetchNames(DAY);
    console.log(`→ Found ${names.length} patient(s)`);

    if (names.length === 0) {
      await updateStatus({
        status: "success",
        message: "No patients found!",
        patient_count: 0,
      });
      return;
    }

    console.log("Selecting all patients...");
    const body = buildBody(names, DAY);
    const SELECT_URL = `${BASE_URL}${SELECT_PATH}`;

    await post(SELECT_URL, body, {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    });

    await updateStatus({
      status: "success",
      message: `Successfully processed ${names.length} patients`,
      patient_count: names.length,
    });
  } catch (error) {
    console.error("Error:", error);
    await updateStatus({
      status: "error",
      message: "Failed to fetch and select patients",
      patient_count: 0,
    });
  }
}

// Initialize database and start worker
async function startWorker() {
  console.log("🚀 Starting patient fetch worker...");

  try {
    // Ensure fresh database is initialized before starting
    console.log("📋 Initializing database...");
    await prisma.$connect();
    console.log("✅ Database ready!");

    let isFetching = false;
    console.log(
      `⏰ Setting up background fetch interval (${FETCH_INTERVAL}ms)...`
    );

    setInterval(async () => {
      try {
        const automationEnabled = await isAutomationEnabled();
        console.log("Checking fetch conditions...", {
          isFetching,
          isAutomationEnabled: automationEnabled,
        });

        if (!isFetching && automationEnabled) {
          console.log("Starting fetch operation...");
          isFetching = true;
          await fetchPatients();
          isFetching = false;
          console.log("Fetch operation completed");
        } else {
          console.log("Skipping fetch - conditions not met");
        }
      } catch (error) {
        console.error("Error in fetch interval:", error);
        isFetching = false; // Reset flag on error
      }
    }, FETCH_INTERVAL);

    console.log("🎯 Worker started successfully!");
  } catch (error) {
    console.error("❌ Failed to start worker:", error);
    console.error("💡 Make sure DATABASE_URL is set and accessible");
    process.exit(1);
  }
}

// Start the worker
startWorker();

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});
