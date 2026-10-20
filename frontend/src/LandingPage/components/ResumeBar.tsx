import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeResume } from "@/ResumeAnalyzer/api/resumeService";
import type { AnalysisResult } from "@/ResumeAnalyzer/types/analysis";

/**
 * The hero object: a single wide bar that happens to be the real analyzer.
 *
 * It borrows the silhouette of a prompt bar — a tall rounded surface, a line
 * of chips along the bottom, a send button on the right — because that shape
 * reads as "put something in here" without any instruction. What goes in is a
 * file rather than a sentence.
 *
 * Everything it reports is real: the upload posts to /analyze and the score
 * that comes back is the one the analyzer page would show.
 */
type Stage = "idle" | "ready" | "working" | "done" | "error";

const MAX_BYTES = 10 * 1024 * 1024; // matches the backend's MAX_CONTENT_LENGTH

const accepted = (file: File) => /\.(pdf|docx)$/i.test(file.name);

export function ResumeBar() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [showRole, setShowRole] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const take = (candidate: File | undefined) => {
    if (!candidate) return;

    if (!accepted(candidate)) {
      setError("Only PDF and DOCX files can be read.");
      setStage("error");
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError("That file is over the 10 MB limit.");
      setStage("error");
      return;
    }

    setFile(candidate);
    setError(null);
    setStage("ready");
  };

  const run = async () => {
    if (!file) return;
    setStage("working");

    try {
      setResult(await analyzeResume(file, role.trim() || null, [], ""));
      setStage("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /failed to fetch|networkerror|load failed/i.test(message)
          ? "Could not reach the analyzer. Check your connection and try again."
          : message || "Something went wrong reading that file."
      );
      setStage("error");
    }
  };

  const reset = () => {
    setStage("idle");
    setFile(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const score = Math.round(result?.analysis?.achieved_score ?? result?.score ?? 0);
  const missing = Object.keys(result?.missing_skills ?? {}).slice(0, 3);
  const busy = stage === "working";

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* The light bar above the object. This single ellipse is what makes the
          bar look lit from above rather than pasted onto the page. */}
      {/* Two layers: a tight bright strip hugging the top edge, and a wider
          halo behind it. One alone reads as either a blob or a hard line. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-24 -top-5 h-12 rounded-[100%] blur-xl"
        style={{
          background:
            "radial-gradient(55% 100% at 50% 100%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 50%, transparent 78%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-16 h-36 rounded-[100%] blur-3xl"
        style={{
          background:
            "radial-gradient(50% 100% at 50% 100%, rgba(255,255,255,0.14) 0%, transparent 70%)",
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={`relative overflow-hidden rounded-[22px] border bg-gradient-to-b from-ink-raised to-ink-card p-5 transition-colors duration-200 sm:p-6 ${
          dragging ? "border-white/40" : "border-line-strong"
        }`}
      >
        {/* Top-edge highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent"
        />

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx"
          className="sr-only"
          onChange={(e) => take(e.target.files?.[0])}
        />

        <AnimatePresence mode="wait">
          {/* ---- The resting bar ---- */}
          {(stage === "idle" || stage === "error") && (
            <motion.button
              key="idle"
              type="button"
              onClick={() => fileRef.current?.click()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="block w-full pb-14 pt-3 text-left"
            >
              <span className="block text-base text-mute sm:text-lg">
                Drop your resume, or click to browse…
              </span>
              <span className="mt-2 block text-xs text-mute-faint">
                PDF or DOCX · up to 10 MB · nothing is stored
              </span>
            </motion.button>
          )}

          {/* ---- File chosen ---- */}
          {stage === "ready" && file && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pb-14 pt-3"
            >
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-white" aria-hidden="true">
                  <path
                    d="M9 1.5H4.5A1.5 1.5 0 003 3v10a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 13V5.5L9 1.5z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path d="M9 1.5V5.5H13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                <span className="truncate text-base text-white">{file.name}</span>
                <span className="shrink-0 text-xs text-mute-faint">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>

              {showRole ? (
                <input
                  autoFocus
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && run()}
                  placeholder="Which role are you targeting?"
                  className="mt-3 w-full bg-transparent text-sm text-white placeholder:text-mute-faint focus:outline-none"
                />
              ) : (
                <p className="mt-2 text-xs text-mute-faint">
                  Ready. Add a target role below for a sharper score, or send it as is.
                </p>
              )}
            </motion.div>
          )}

          {/* ---- Running ---- */}
          {busy && (
            <motion.div
              key="working"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pb-14 pt-3"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                <span className="text-base text-white">Reading your resume…</span>
              </div>
              <p className="mt-2 text-xs text-mute-faint">
                Extracting text, then scoring it the way an ATS would.
              </p>
            </motion.div>
          )}

          {/* ---- Result ---- */}
          {stage === "done" && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="pb-14 pt-1"
            >
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-medium tracking-tight text-white">{score}</span>
                    <span className="text-lg text-mute-faint">/100</span>
                  </div>
                  <span className="mt-1 block text-[0.7rem] uppercase tracking-[0.18em] text-mute-faint">
                    ATS score
                  </span>
                </div>

                <div className="flex gap-6">
                  <div>
                    <span className="block text-xl text-white">{result.skills?.length ?? 0}</span>
                    <span className="text-xs text-mute-faint">skills found</span>
                  </div>
                  <div>
                    <span className="block text-xl text-white">
                      {result.analysis?.total_projects ?? 0}
                    </span>
                    <span className="text-xs text-mute-faint">projects</span>
                  </div>
                </div>

                {missing.length > 0 && (
                  <div className="min-w-0">
                    <span className="block text-xs text-mute-faint">missing</span>
                    <span className="mt-1 block truncate text-sm text-white">
                      {missing.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- The chip row, always present ---- */}
        <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-3 sm:inset-x-6 sm:bottom-6">
          <div className="flex min-w-0 items-center gap-2">
            {stage === "done" ? (
              <>
                <Chip onClick={() => navigate("/analyzer", { state: { result } })}>
                  Full breakdown
                </Chip>
                <Chip onClick={() => navigate("/builder")}>Fix it</Chip>
                <Chip onClick={reset}>Try another</Chip>
              </>
            ) : (
              <>
                <Chip onClick={() => fileRef.current?.click()} disabled={busy}>
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M8 3.5v9M3.5 8h9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {file ? "Replace" : "Resume"}
                </Chip>
                <Chip
                  onClick={() => setShowRole((v) => !v)}
                  disabled={busy || !file}
                  active={showRole && !!role}
                >
                  {role ? role : "Target role"}
                </Chip>
              </>
            )}
          </div>

          {/* Send */}
          {stage !== "done" && (
            <button
              type="button"
              onClick={run}
              disabled={!file || busy}
              aria-label="Analyze my resume"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                file && !busy
                  ? "bg-white text-ink hover:bg-white/90"
                  : "border border-line-strong text-mute-faint"
              }`}
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M2.5 8h11M9 3.5L13.5 8 9 12.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {stage === "error" && error && (
        <p className="mt-3 text-center text-sm text-white/70">{error}</p>
      )}
    </div>
  );
}

/** A bar chip: small, dark, rounded, with an optional lit state. */
function Chip({
  children,
  onClick,
  disabled,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex max-w-[11rem] items-center gap-1.5 truncate rounded-full border px-3 py-1.5 text-xs transition-colors duration-200 ${
        active
          ? "border-line-bright bg-white/10 text-white"
          : "border-line-strong bg-white/[0.03] text-mute hover:text-white"
      } ${disabled ? "cursor-not-allowed opacity-40 hover:text-mute" : ""}`}
    >
      {children}
    </button>
  );
}
