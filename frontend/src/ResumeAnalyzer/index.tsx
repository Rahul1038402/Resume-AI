import { useState, lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/common/Layout";
import ResumeUploader from "@/components/ResumeUploader";
import JobSelector from "@/ResumeAnalyzer/component/JobSelector";
import ResumeResults from "@/ResumeAnalyzer/component/ResumeResults";
import { Button } from "@/components/ui/button";
import { analyzeResume } from "@/ResumeAnalyzer/api/resumeService";
import type { AnalysisResult } from "@/ResumeAnalyzer/types/analysis";
import { toast } from "sonner";
import { Loader2, X, ArrowRight } from "lucide-react";
{/* const GalaxyAttackGame = lazy(() => import("@/components/GalaxyAttack")); */}

//Gaming ke lazy loading and reduce chunk size
const GameLoadingSkeleton = () => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="rounded-xl border border-line bg-ink-card p-8 text-center">
      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-mute" />
      <p className="text-[0.8rem] text-mute">Loading game...</p>
    </div>
  </div>
);

const Analyzer = () => {
  // The landing page runs a first analysis in its hero and hands the finished
  // result over here, so arriving from it does not mean uploading the same
  // file a second time.
  const location = useLocation();
  const handedOver = (location.state as { result?: AnalysisResult } | null)?.result ?? null;

  const [file, setFile] = useState(null);
  const [targetJob, setTargetJob] = useState(null);
  const [result, setResult] = useState(handedOver);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [showGamePrompt, setShowGamePrompt] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [analysisState, setAnalysisState] = useState(handedOver ? 'completed' : 'idle'); // 'idle', 'analyzing', 'completed', 'error'
  const [loadingProgress, setLoadingProgress] = useState(0);
  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  const [jdRequired, setJdRequired] = useState(true);
  // Scans are capped per day, so the count belongs on screen before someone
  // spends their last one rather than in the error that follows.
  const [scansLeft, setScansLeft] = useState<number | null>(null);

  const handleJobSelected = (selectedJob, description, requiresJd = true) => {
    setTargetJob(selectedJob);
    setJobDescription(description || "");
    setJdRequired(requiresJd);
    setResult(null);
    setError(null);
  };

  // A description is the document the score is about, so by default we wait
  // for one rather than quietly scoring against a stored skill list.
  const activeJd = jdRequired ? jobDescription.trim() : "";
  const awaitingJd = jdRequired && !activeJd;
  const blockedReason = !file
    ? "Add a resume to begin."
    : !targetJob
      ? "Pick the role you are applying for."
      : awaitingJd
        ? "Paste the job description, or switch it off above to score against the role in general."
        : null;

  const handleAnalyze = async () => {
    if (!file) {
      toast.error("Please upload a resume first");
      return;
    }

    // Show game prompt
    setShowGamePrompt(true);
  };

  const startAnalysisWithGame = async (playGame) => {
    setShowGamePrompt(false);

    setIsAnalyzing(true);
    setError(null);
    setLoadingProgress(0);

    if (playGame) {
      setShowGame(true);
      setAnalysisState('analyzing');
    }

    // Progress animation runs alongside the request instead of delaying it
    const loadingDuration = 2500;
    const intervalTime = 50; // Update every 50ms
    const steps = loadingDuration / intervalTime;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const progress = Math.min((currentStep / steps) * 95, 95);
      setLoadingProgress(progress);
      
      if (currentStep >= steps) {
        clearInterval(progressInterval);
      }
    }, intervalTime);

    try {
      const analysisResult = await analyzeResume(file, targetJob, [], activeJd);
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      // Small delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setResult(analysisResult);
      if (analysisResult.rate_limit) {
        setScansLeft(analysisResult.rate_limit.remaining);
      }
      setAnalysisState('completed');
      toast.success("Analysis completed successfully!");
    } catch (err) {
      clearInterval(progressInterval);
      console.error("Analysis error:", err);
      const errorMessage = err instanceof Error ? err.message : "Analysis failed";
      const quota = (err as { rateLimit?: { remaining: number } })?.rateLimit;
      if (quota) setScansLeft(quota.remaining);
      setError(errorMessage);
      setAnalysisState('error');
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
      setLoadingProgress(0);
      // Don't close the game automatically if not playing game
      if (!playGame) {
        setAnalysisState('idle');
      }
    }
  };

  const handleCloseGame = () => {
    setShowGame(false);
    setAnalysisState('idle');
  };

  const openRecommendedFormat = () => {
    window.open('/recommended-resume-format.html', '_blank');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 text-center">
            <h1 className="text-balance text-3xl font-medium leading-[1.14] tracking-[-0.02em] text-white sm:text-[2.4rem]">
              Score it <span className="text-mute-dim">against the role</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-relaxed text-mute-dim">
              Upload the document, name the job, and see what a parser actually
              extracts before a recruiter ever does.
            </p>
          </div>

          {/* Resume Builder Highlight 
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xl font-medium text-green-800 dark:text-green-200 mb-2">
                  Make Your Resume ATS-Friendly
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  For even better results with recruiters and Applicant Tracking Systems (ATS), try our Resume Builder. In just minutes, you can create a clean, professional, and ATS-friendly resume that stands out.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openRecommendedFormat}
                    className="text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors duration-300"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Recommended Format
                  </Button>
                  <Link to="/builder">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-700 dark:text-green-300 border-green-300 hover:bg-green-100 dark:hover:bg-green-800 transition-colors duration-300"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Create Recommended Resume
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div> */}

          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <ResumeUploader onFileSelected={handleFileSelected} />
              <JobSelector onJobSelected={handleJobSelected} />
            </div>

            <div className="rounded-xl border border-line bg-ink-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.95rem] text-white">Ready when you are</p>
                  <p className="mt-1 max-w-md text-[0.8rem] font-medium leading-relaxed text-mute-dim">
                    {blockedReason ?? (
                      <>
                        Scoring against{" "}
                        <span className="text-mute">{targetJob}</span>
                        {activeJd
                          ? " and the description you pasted."
                          : " in general."}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {scansLeft !== null && (
                    <span className="text-[0.75rem] font-medium text-mute-faint">
                      {scansLeft} of 5 scans left today
                    </span>
                  )}
                <button
                  type="button"
                  onClick={() => startAnalysisWithGame(false)}
                  disabled={!file || isAnalyzing || !!blockedReason}
                  className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-[0.8rem] font-medium text-ink transition-colors duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-mute-faint disabled:text-ink/60"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Analyzing
                    </>
                  ) : (
                    <>
                      Analyze resume
                      <ArrowRight size={15} strokeWidth={1.8} />
                    </>
                  )}
                </button>
                </div>
              </div>

              {isAnalyzing && (
                <div className="mt-4">
                  <div className="h-px w-full overflow-hidden bg-line-strong">
                    <div
                      className="h-px bg-white transition-all duration-300 ease-out"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[0.7rem] font-medium text-mute-faint">
                    {loadingProgress < 95 ? "Reading the document" : "Finalizing results"}
                  </p>
                </div>
              )}
            </div>

            <ResumeResults
              result={result}
              loading={isAnalyzing}
              error={null}
            />

            {/* Show error state when analysis fails */}
            {error && !showGame && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <div>
                    <p className="text-[0.9rem] text-red-200">Analysis failed</p>
                    <p className="mt-1 text-[0.8rem] font-medium leading-relaxed text-red-300/80">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Prompt Modal
      {showGamePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Resume Analysis Starting</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              <span className="font-semibold">Analysis takes about 2–3 minutes... 🚀</span> <br />
              Why not relax and enjoy our <span className="font-semibold">Galaxy Attack Game</span> while you wait?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => startAnalysisWithGame(true)}
                className="flex-1"
              >
                Yes, Play Game!
              </Button>
              <Button
                onClick={() => startAnalysisWithGame(false)}
                variant="outline"
                className="flex-1"
              >
                No, Just Wait
              </Button>
            </div>
          </div>
        </div>
      )}*/}

      {/* Galaxy Attack Game
      {showGame && (
        <Suspense fallback={<GameLoadingSkeleton />}>
          <GalaxyAttackGame
            isVisible={showGame}
            onClose={handleCloseGame}
            analysisState={analysisState}
            analysisError={error}
          />
        </Suspense>
      )}*/}
    </Layout>
  );
};

export default Analyzer;