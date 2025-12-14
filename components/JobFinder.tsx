import React, { useState } from 'react';
import { JobListing, AnalysisResult } from '../types';
import { searchJobs } from '../services/geminiService';
import { Briefcase, MapPin, ExternalLink, Search, ChevronDown } from 'lucide-react';

interface JobFinderProps {
  analysisData: AnalysisResult | null;
}

export const JobFinder: React.FC<JobFinderProps> = ({ analysisData }) => {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter 1: Job Title (Editable) - Default is now empty
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter 2: Workplace Type
  const [workplaceType, setWorkplaceType] = useState<string>("All");

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const results = await searchJobs(searchTerm, workplaceType);
      setJobs(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Job Discovery</h2>
        <p className="text-gray-500 text-sm mb-6">Find jobs relevant to specific students or search the general market.</p>
        
        {/* Updated Grid: 3 columns for Title -> Type -> Button */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Filter 1: Title */}
          <div className="relative md:col-span-1">
            <Briefcase className="absolute left-3 top-3 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Job Title (e.g. Data Scientist)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
            />
          </div>

          {/* Filter 2: Workplace Type */}
          <div className="relative md:col-span-1">
            <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5 pointer-events-none" />
            <select
              value={workplaceType}
              onChange={(e) => setWorkplaceType(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white text-gray-900 cursor-pointer"
            >
              <option value="All" className="text-gray-900">All Locations</option>
              <option value="Onsite" className="text-gray-900">Onsite</option>
              <option value="Remote" className="text-gray-900">Remote</option>
              <option value="Hybrid" className="text-gray-900">Hybrid</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed md:col-span-1"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <><Search className="w-4 h-4 mr-2" /> Find Jobs</>}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2 flex items-center">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Powered by Gemini Grounding (Google Search)
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {jobs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Search className="w-12 h-12 mb-2 opacity-20" />
            <p>
              {analysisData?.role 
                ? `Suggested search: ${analysisData.role}` 
                : "Enter a job title to search current openings."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
          {jobs.map((job, idx) => (
            <div key={idx} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg text-gray-800 truncate" title={job.title}>{job.title}</h3>
              <p className="text-gray-600 mb-2">{job.company}</p>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{job.snippet}</p>
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Apply Now <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};