"use client";

import { useState, useEffect } from "react";

interface ToggleProps {
  initialState?: boolean;
}

interface FetchStatus {
  lastFetch: string;
  status: "idle" | "fetching" | "success" | "error";
  message: string;
  patientCount?: number;
}

const defaultStatus: FetchStatus = {
  lastFetch: "",
  status: "idle",
  message: "Waiting for status update...",
  patientCount: 0,
};

const POLL_INTERVAL = 1500;

export default function Toggle({ initialState = false }: ToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialState);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>(defaultStatus);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/toggle-state")
      .then((res) => res.json())
      .then((data) => setIsEnabled(data.isEnabled))
      .catch((error) =>
        console.error("Error loading automation state:", error)
      );

    const pollStatus = () => {
      fetch("/api/fetch-status")
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data === "object") {
            setFetchStatus({
              ...defaultStatus,
              ...data,
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching status:", error);
          setFetchStatus({
            ...defaultStatus,
            status: "error",
            message: "Failed to fetch status",
          });
        });
    };

    pollStatus();
    const interval = setInterval(pollStatus, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const handleToggle = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);

    try {
      await fetch("/api/toggle-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isEnabled: newState }),
      });

      setFetchStatus({
        ...defaultStatus,
        status: newState ? "idle" : "idle",
        message: newState ? "Automation enabled" : "Automation disabled",
      });
    } catch (error) {
      console.error("Error:", error);
      setFetchStatus({
        ...defaultStatus,
        status: "error",
        message: "Failed to update automation state",
      });
    }
  };

  const getStatusColor = () => {
    switch (fetchStatus?.status) {
      case "fetching":
        return "bg-yellow-600";
      case "success":
        return "bg-green-600";
      case "error":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  const formatLastFetch = (dateString: string) => {
    if (!mounted) return "Loading...";
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-white text-2xl font-bold mb-4">
          Automated Patient Selection
        </h1>
        <div className="text-white text-center mb-6"></div>
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-14 w-28 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${getStatusColor()}`}
        >
          <span
            className={`inline-block h-12 w-12 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
              isEnabled ? "translate-x-14" : "translate-x-2"
            }`}
          />
        </button>
        <div className="text-white mt-4 text-center">
          <span className="text-lg font-semibold">
            {isEnabled ? "Automation Active" : "Automation Inactive"}
          </span>
          <div className="mt-2">
            <p className="text-sm text-gray-400">
              Status:{" "}
              {fetchStatus?.status?.charAt(0).toUpperCase() +
                fetchStatus?.status?.slice(1) || "Unknown"}
            </p>
            <p className="text-sm text-gray-400">
              {fetchStatus?.message || "No status message available"}
            </p>
            {fetchStatus?.patientCount !== undefined && (
              <p className="text-sm text-gray-400">
                Patients processed: {fetchStatus.patientCount}
              </p>
            )}
            <p className="text-sm text-gray-400">
              Last update:{" "}
              {formatLastFetch(
                fetchStatus?.lastFetch || new Date().toISOString()
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
