import React, { useState, useEffect } from 'react';
import { analyzeResume } from '../services/geminiService';
import { ResumeAnalysisResult } from '../types';
import { FileText, CheckCircle, AlertCircle, Upload, Award, TrendingUp, XCircle, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// --- PDF.js Setup ---
const PDFJS_VERSION = '3.11.174';
const WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

// Helper to resolve the library instance safely
// In some environments (like esm.sh), the library is on the .default property
const getPdfJs = () => {
  const mod = pdfjsLib as any;
  return mod.default && mod.default.getDocument ? mod.default : mod;
};

export const ResumeAnalyzer: React.FC = () => {
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Debugging state
  const [extractedText, setExtractedText] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Initialize worker safely
    try {
      const pdfjs = getPdfJs();
      if (pdfjs && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
      }
    } catch (e) {
      console.warn("Failed to set PDF worker source", e);
    }
  }, []);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const pdfjs = getPdfJs();
      if (!pdfjs.getDocument) {
        throw new Error("PDF Library failed to initialize. Please refresh or try a TXT file.");
      }

      const arrayBuffer = await file.arrayBuffer();
      
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Improve text joining: add spaces between items to prevent word merging
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        
        fullText += pageText + "\n\n";
      }
      
      // Clean up extra whitespace
      fullText = fullText.replace(/\s+/g, ' ').trim();

      // Check for scanned PDF (images only)
      if (fullText.length < 50) {
        throw new Error("This PDF appears to be an image or scan. Please convert it to a text-based PDF or TXT file.");
      }
      
      return fullText;
    } catch (e: any) {
      console.error("PDF Parse Error:", e);
      // Clean error message for user
      const msg = e.message?.includes("getDocument") 
        ? "Library initialization error. Please reload the page." 
        : e.message;
      throw new Error(`Could not read PDF: ${msg}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setResult(null);
    setError(null);
    setExtractedText(""); 
    setShowPreview(false);

    try {
      let text = "";
      if (file.type === "application/pdf") {
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }

      setExtractedText(text); // Save for preview

      if (!text || text.trim().length < 50) {
        throw new Error("Resume content is too short. Please upload a more detailed file.");
      }

      const analysis = await analyzeResume(text);
      if (analysis) {
        setResult(analysis);
      } else {
        throw new Error("AI analysis returned no results.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze resume. Please try a text file (.txt).");
    } finally {
      setLoading(false);
    }
  };

  // Safe score calculation variables
  const score = result?.atsScore || 0;
  const getScoreColor = (s: number) => {
    if (s >= 80) return '#10b981'; // emerald-500
    if (s >= 60) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Resume ATS Analyzer</h2>
          <p className="text-gray-500 mt-2">Upload your resume to calculate your ATS compatibility score.</p>
        </div>

        {/* Upload Area */}
        <div className={`bg-white p-8 rounded-xl shadow-sm border-2 border-dashed transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:bg-gray-50'}`}>
          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer min-h-[160px]">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {error ? (
                 <XCircle className="w-12 h-12 text-red-500 mb-3" />
              ) : (
                 <Upload className="w-12 h-12 text-gray-400 mb-3" />
              )}
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">{error ? "Try Again" : "Click to upload"}</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PDF or TXT files only</p>
            </div>
            <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />
          </label>
          {fileName && !error && (
            <div className="mt-4 flex flex-col items-center justify-center text-sm text-blue-600 font-medium">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                {fileName}
              </div>
            </div>
          )}
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="bg-white border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm" role="alert">
            <p className="font-bold">Analysis Failed</p>
            <p>{error}</p>
          </div>
        )}

        {/* Extracted Text Preview (For Debugging) */}
        {extractedText && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? "Hide Extracted Text" : "Show Extracted Text (Preview)"}
              </span>
              {showPreview ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {showPreview && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                 <p className="text-xs text-gray-500 mb-2">
                   This is the raw text extracted from your PDF. If this is empty or garbled, the AI cannot analyze it correctly.
                 </p>
                 <div className="p-3 bg-white border border-gray-300 rounded text-xs text-gray-600 font-mono h-40 overflow-y-auto whitespace-pre-wrap">
                   {extractedText}
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Analyzing Resume & Checking ATS Score...</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            
            {/* Score Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">ATS Compatibility</h3>
              
              <div className="relative w-48 h-48 mb-4">
                 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Track */}
                    <circle
                      cx="50" cy="50" r={radius}
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="8"
                    />
                    {/* Progress Arc */}
                    <circle
                      cx="50" cy="50" r={radius}
                      fill="none"
                      stroke={getScoreColor(score)}
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                 </svg>
                 
                 <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                   <span className="text-5xl font-bold text-gray-900">{score}</span>
                   <span className="text-sm text-gray-500 font-medium">/ 100</span>
                 </div>
              </div>
              
              <div className="bg-blue-50 px-4 py-2 rounded-lg mt-2">
                <p className="text-gray-600 text-sm">Target Role</p>
                <p className="font-bold text-blue-700">{result.detectedRole || "General Professional"}</p>
              </div>
            </div>

            {/* Missing Skills */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center text-red-600">
                 <AlertCircle className="w-5 h-5 mr-2" />
                 Missing Keywords
               </h3>
               {result.missingSkills && result.missingSkills.length > 0 ? (
                 <div className="flex flex-wrap gap-2">
                   {result.missingSkills.map((s, i) => (
                     <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-100">
                       {s}
                     </span>
                   ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                   <CheckCircle className="w-8 h-8 mb-2 text-emerald-500" />
                   <p className="text-sm">Great job! No critical keywords missing.</p>
                 </div>
               )}
            </div>

            {/* Strengths */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center text-emerald-600">
                 <Award className="w-5 h-5 mr-2" />
                 Identified Strengths
               </h3>
               <ul className="space-y-3">
                 {result.strengths && result.strengths.length > 0 ? result.strengths.map((s, i) => (
                   <li key={i} className="flex items-start text-sm text-gray-700">
                     <CheckCircle className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
                     <span className="flex-1">{s}</span>
                   </li>
                 )) : (
                   <li className="text-gray-500 italic">No specific strengths listed.</li>
                 )}
               </ul>
            </div>

            {/* Improvements */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center text-blue-600">
                 <TrendingUp className="w-5 h-5 mr-2" />
                 Recommended Improvements
               </h3>
               <ul className="space-y-3">
                 {result.improvements && result.improvements.length > 0 ? result.improvements.map((s, i) => (
                   <li key={i} className="flex items-start text-sm text-gray-700">
                     <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 mt-1.5 flex-shrink-0"></div>
                     <span className="flex-1">{s}</span>
                   </li>
                 )) : (
                   <li className="text-gray-500 italic">No specific improvements listed.</li>
                 )}
               </ul>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};