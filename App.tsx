import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { JobFinder } from './components/JobFinder';
import { ChatBot } from './components/ChatBot';
import { ResumeAnalyzer } from './components/ResumeAnalyzer';
import { analyzeSkillset } from './services/geminiService';
import { AnalysisResult, AppView } from './types';
import { LayoutDashboard, Briefcase, MessageSquare, FileText, LogOut, Hexagon } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');

  // --- Auth Handler ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setView(AppView.DASHBOARD);
    }
  };

  // --- Analysis Handler ---
  const handleAnalysis = async (text: string) => {
    setLoading(true);
    try {
      const result = await analyzeSkillset(text);
      setAnalysisData(result);
    } catch (err) {
      alert("Analysis failed. Please try again or check API Key.");
    } finally {
      setLoading(false);
    }
  };

  // --- View Renderers ---
  if (view === AppView.LOGIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full flex flex-col">
          <div className="p-8 bg-blue-600 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Hexagon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">SkillVantage</h1>
            <p className="text-blue-100">AI-Powered Career Intelligence</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter your name"
                />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                Sign In
              </button>
              <div className="text-center text-xs text-gray-400 mt-4">
                Synthetic Login • Project Demo Only
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 flex items-center border-b border-slate-800">
          <Hexagon className="w-8 h-8 text-blue-400 mr-3" />
          <span className="font-bold text-xl tracking-tight">SkillVantage</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setView(AppView.DASHBOARD)}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-all ${view === AppView.DASHBOARD ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </button>
          
          <button 
            onClick={() => setView(AppView.JOBS)}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-all ${view === AppView.JOBS ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Briefcase className="w-5 h-5 mr-3" />
            Job Market
          </button>

          <button 
            onClick={() => setView(AppView.CHAT)}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-all ${view === AppView.CHAT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <MessageSquare className="w-5 h-5 mr-3" />
            AI Mentor
          </button>

          <button 
            onClick={() => setView(AppView.RESUME_ANALYZER)}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-all ${view === AppView.RESUME_ANALYZER ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <FileText className="w-5 h-5 mr-3" />
            Resume Analyzer
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center mb-4 px-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 mr-3"></div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{username}</p>
                <p className="text-xs text-slate-400">Student Account</p>
              </div>
           </div>
           <button 
            onClick={() => setView(AppView.LOGIN)}
            className="flex items-center justify-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
           >
             <LogOut className="w-4 h-4 mr-2" />
             Sign Out
           </button>
        </div>
      </aside>

      {/* Mobile Nav Overlay (simplified for demo) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-20">
          <div className="flex items-center">
            <Hexagon className="w-6 h-6 text-blue-400 mr-2" />
            <span className="font-bold">SkillVantage</span>
          </div>
        </header>

        {/* Bottom Nav for Mobile */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-20">
            <button onClick={() => setView(AppView.DASHBOARD)} className={`p-2 rounded-full ${view === AppView.DASHBOARD ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><LayoutDashboard className="w-6 h-6" /></button>
            <button onClick={() => setView(AppView.JOBS)} className={`p-2 rounded-full ${view === AppView.JOBS ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><Briefcase className="w-6 h-6" /></button>
            <button onClick={() => setView(AppView.CHAT)} className={`p-2 rounded-full ${view === AppView.CHAT ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><MessageSquare className="w-6 h-6" /></button>
            <button onClick={() => setView(AppView.RESUME_ANALYZER)} className={`p-2 rounded-full ${view === AppView.RESUME_ANALYZER ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><FileText className="w-6 h-6" /></button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
          {view === AppView.DASHBOARD && (
            <Dashboard 
              data={analysisData} 
              onUpload={handleAnalysis} 
              isLoading={loading} 
            />
          )}
          {view === AppView.JOBS && (
            <JobFinder analysisData={analysisData} />
          )}
          {view === AppView.CHAT && (
            <ChatBot analysisData={analysisData} />
          )}
          {view === AppView.RESUME_ANALYZER && (
            <ResumeAnalyzer />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;