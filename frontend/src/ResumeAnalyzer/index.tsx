import { useState, lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/common/Layout";
import ResumeUploader from "@/components/ResumeUploader";
import JobSelector from "@/ResumeAnalyzer/component/JobSelector";
import ResumeResults from "@/ResumeAnalyzer/component/ResumeResults";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { analyzeResume } from "@/ResumeAnalyzer/api/resumeService";
import type { AnalysisResult } from "@/ResumeAnalyzer/types/analysis";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import GradientText from "@/components/ui/GradientText";
import ShinyText from "@/components/ui/ShinyText";
{/* const GalaxyAttackGame = lazy(() => import("@/components/GalaxyAttack")); */}

//Gaming ke lazy loading and reduce chunk size
const GameLoadingSkeleton = () => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Loading game...</p>
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

  const handleJobSelected = (selectedJob, description) => {
    setTargetJob(selectedJob);
    setJobDescription(description || "");
    setResult(null);
    setError(null);
  };

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
      const analysisResult = await analyzeResume(file, targetJob, [], jobDescription);
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      // Small delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setResult(analysisResult);
      setAnalysisState('completed');
      toast.success("Analysis completed successfully!");
    } catch (err) {
      clearInterval(progressInterval);
      console.error("Analysis error:", err);
      const errorMessage = err instanceof Error ? err.message : "Analysis failed";
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
      <div className="container mx-auto px-4 pt-28 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <GradientText
              colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
              animationSpeed={11}
              showBorder={false}
              className="text-5xl"
            >
              <p className="mb-5">
                Resume Analyzer
              </p>
            </GradientText>

            <p className="text-xl text-gray-600 dark:text-gray-300">
              Upload your resume, choose a target job, and get AI-powered analysis
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

          <div className="space-y-6">
            <div className="flex flex-col">
              <ResumeUploader onFileSelected={handleFileSelected} />
              <JobSelector onJobSelected={handleJobSelected} />
            </div>

            <Card className="bg-transparent rounded-lg p-6 text-center">
              <button
                className="dark:bg-gray-800/80 rounded-lg border bg-resume-primary hover:bg-resume-primary/90 hover:dark:bg-gray-800/60 dark:border-gray-700 px-4 h-[60px] font-medium cursor-pointer transition-all duration-300"
                onClick={() => startAnalysisWithGame(false)}
                disabled={!file || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <span className="flex items-center justify-center">
                    <ShinyText text="Analyze Resume" disabled={false} speed={5} className="text-lg" />
                  </span>
                )}
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 z-0">
                We'll analyze your resume against {targetJob || "general"} requirements. <br/>
              </p>

              {/* Loading Progress Bar */}
              {isAnalyzing && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-resume-primary dark:bg-resume-secondary h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {loadingProgress < 95 ? "Preparing analysis..." : "Finalizing results..."}
                  </p>
                </div>
              )}
            </Card>

            <ResumeResults
              result={result}
              loading={isAnalyzing}
              error={null}
            />

            {/* Show error state when analysis fails */}
            {error && !showGame && (
              <Card className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <div className="flex flex-col items-center justify-center gap-3 mb-4">
                  <div className="flex space-x-3">
                    <X className="h-8 w-8 text-red-600 dark:text-red-400" />
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Analysis Failed</h3>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </Card>
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