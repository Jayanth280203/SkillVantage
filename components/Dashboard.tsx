import React, { useMemo, useState, useEffect } from 'react';
import { AnalysisResult, CleaningReport, StudentProfile, RoleDefinition } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie
} from 'recharts';
import { Target, AlertTriangle, CheckCircle, TrendingUp, Activity, Database, Sparkles, Users, Search, GraduationCap, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DashboardProps {
  data: AnalysisResult | null;
  onUpload: (text: string) => void;
  isLoading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, onUpload, isLoading }) => {
  // State for Filters
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedRoleTitle, setSelectedRoleTitle] = useState<string>("");
  
  // State for Dynamic Analysis
  const [dynamicStats, setDynamicStats] = useState<{
    matchScore: number;
    missing: string[];
    radarData: any[];
  } | null>(null);

  // --- Preprocessing Logic ---
  const processAndUpload = (rawData: any[]) => {
    const startTime = performance.now();
    let validRows = 0;
    const skillFreq: Record<string, number> = {};
    const processedStudents: any[] = [];
    const departmentsFound: Record<string, number> = {};

    rawData.forEach((row, index) => {
      if (Object.keys(row).length > 0) validRows++;
      
      let studentId = `Student-${index + 1}`;
      let department = "General";
      const studentSkills: Set<string> = new Set();

      Object.entries(row).forEach(([key, val]) => {
        if (!val) return;
        const valueStr = String(val).trim();
        const keyStr = key.toLowerCase();

        if (keyStr.includes('id') || keyStr.includes('roll') || (keyStr.includes('student') && !keyStr.includes('name'))) {
          studentId = valueStr;
        } else if (keyStr.includes('dept') || keyStr.includes('branch') || keyStr.includes('program')) {
          department = valueStr;
        } else if (valueStr.length > 1 && !keyStr.includes('name')) {
          const tokens = valueStr.split(/[,;]/).map(s => s.trim().replace(/['"]/g, ''));
          tokens.forEach(t => {
            if (t.length > 1 && !Number(t)) {
               const normalized = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
               studentSkills.add(normalized);
               skillFreq[normalized] = (skillFreq[normalized] || 0) + 1;
            }
          });
        }
      });

      departmentsFound[department] = (departmentsFound[department] || 0) + 1;
      processedStudents.push({
        id: studentId,
        department: department,
        skills: Array.from(studentSkills)
      });
    });

    const uniqueSkills = Object.keys(skillFreq).length;
    const sortedSkills = Object.entries(skillFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([name, count]) => ({ name, count }));

    const report: CleaningReport = {
      totalRows: rawData.length,
      validRows: validRows,
      missingValuesFixed: 0,
      uniqueSkillsFound: uniqueSkills,
      processingTimeMs: Math.round(performance.now() - startTime)
    };

    const aiPayload = {
      report: report,
      topSkills: sortedSkills,
      departments: Object.keys(departmentsFound),
      rawStudents: processedStudents, 
      sample: rawData.slice(0, 5)
    };
    
    onUpload(JSON.stringify(aiPayload, null, 2));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (data) {
        try {
          let jsonData: any[] = [];
          if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const workbook = XLSX.read(data, { type: 'array' });
            jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          } else {
             try { jsonData = JSON.parse(data as string); } 
             catch { jsonData = []; }
          }
          processAndUpload(jsonData);
        } catch (error) {
          alert("Failed to parse file.");
        }
      }
    };
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  // --- Dynamic Calculation Effect ---
  useEffect(() => {
    if (data && selectedStudentId && selectedRoleTitle) {
      const student = data.students?.find(s => s.id === selectedStudentId);
      
      let roleDef: RoleDefinition | undefined;
      for (const dept of data.departmentMappings || []) {
        const found = dept.possibleRoles.find(r => r.title === selectedRoleTitle);
        if (found) { roleDef = found; break; }
      }

      if (student && roleDef) {
        const studentSkills = new Set(student.rawSkills.map(s => s.toLowerCase()));
        const requiredSkills = roleDef.requiredSkills;
        const missing: string[] = [];
        let matchCount = 0;

        requiredSkills.forEach(req => {
           const reqLower = req.toLowerCase();
           let found = false;
           if (studentSkills.has(reqLower)) found = true;
           else {
             for (const s of studentSkills) {
               if (s.includes(reqLower) || reqLower.includes(s)) { found = true; break; }
             }
           }
           if (found) matchCount++;
           else missing.push(req);
        });

        const score = Math.round((matchCount / (requiredSkills.length || 1)) * 100);

        const comparisonData = requiredSkills.slice(0, 6).map(req => ({
          subject: req,
          Student: studentSkills.has(req.toLowerCase()) ? 80 : 20,
          Required: 100,
          fullMark: 100
        }));

        setDynamicStats({
          matchScore: score,
          missing: missing,
          radarData: comparisonData
        });
      }
    } else {
      setDynamicStats(null);
    }
  }, [selectedStudentId, selectedRoleTitle, data]);


  // --- Derived State for Dropdowns ---
  const availableRoles = useMemo(() => {
    if (!data || !selectedStudentId) return [];
    const student = data.students?.find(s => s.id === selectedStudentId);
    if (!student) return [];
    
    const mapping = data.departmentMappings?.find(m => 
      m.department.toLowerCase() === (student.department || '').toLowerCase()
    );
    
    return mapping ? mapping.possibleRoles : (data.departmentMappings?.flatMap(m => m.possibleRoles) || []);
  }, [data, selectedStudentId]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Analyzing Cohort & Calculating Gaps...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-gray-50">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center border border-gray-100">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Database className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Student Dataset</h2>
          <p className="text-gray-500 mb-8">Upload an Excel or JSON file. We'll cluster skills, identify departments, and detect job roles automatically.</p>
          <label className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl cursor-pointer transition-transform hover:-translate-y-1 shadow-lg">
            Select File
            <input type="file" className="hidden" accept=".xlsx,.xls,.json,.csv" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    );
  }

  // --- Render Dashboard ---
  const radarData = dynamicStats ? dynamicStats.radarData : data.skills.slice(0, 6).map(s => ({
    subject: s.name, Student: s.userLevel, Required: s.marketDemand, fullMark: 100
  }));

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 pb-20">
      
      {/* 1. Header & Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
             <h1 className="text-2xl font-bold text-gray-900">{data.role || "Analysis Results"}</h1>
             <p className="text-gray-500 text-sm">{data.summary}</p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
             <div className="bg-blue-50 px-4 py-2 rounded-lg text-blue-700 font-bold text-lg border border-blue-100">
                {data.students?.length} <span className="text-xs font-normal text-blue-500">Students</span>
             </div>
             <div className="bg-purple-50 px-4 py-2 rounded-lg text-purple-700 font-bold text-lg border border-purple-100">
                {data.departmentMappings?.length} <span className="text-xs font-normal text-purple-500">Depts</span>
             </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1 uppercase">Filter by Student ID</label>
            <div className="relative">
              {/* Changed to Input+Datalist for searchable Student ID */}
              <input 
                list="student-ids"
                type="text"
                value={selectedStudentId} 
                onChange={(e) => { setSelectedStudentId(e.target.value); setSelectedRoleTitle(""); }}
                placeholder="Type or Select Student ID..."
                className="w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              />
              <datalist id="student-ids">
                {data.students?.map(s => (
                  <option key={s.id} value={s.id}>{s.department}</option>
                ))}
              </datalist>
              <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1 uppercase">Target Role</label>
            <div className="relative">
              <select 
                value={selectedRoleTitle} 
                onChange={(e) => setSelectedRoleTitle(e.target.value)}
                disabled={!selectedStudentId}
                className="w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none disabled:bg-gray-100 disabled:text-gray-400 text-gray-900"
              >
                <option value="">-- Select Target Role --</option>
                {availableRoles.map((r, i) => (
                  <option key={i} value={r.title}>{r.title}</option>
                ))}
              </select>
              <Target className="absolute right-3 top-2.5 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-end">
             {dynamicStats && (
               <div className="w-full flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-blue-200 shadow-sm">
                 <span className="text-sm font-medium text-gray-600">Match Score</span>
                 <span className={`text-xl font-bold ${dynamicStats.matchScore > 70 ? 'text-emerald-600' : dynamicStats.matchScore > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                   {dynamicStats.matchScore}%
                 </span>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* 2. Visuals Grid - No Overlap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Left: Radar Chart (Dynamic or Static) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" />
            {dynamicStats ? `Gap Analysis: ${selectedRoleTitle}` : "Cohort Skill Overview"}
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name={dynamicStats ? "Student" : "Cohort"} dataKey="Student" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                <Radar name={dynamicStats ? "Required" : "Market"} dataKey="Required" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Dynamic Info or Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[400px]">
          {dynamicStats ? (
            <>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center text-amber-600">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Missing Critical Skills
              </h3>
              <div className="flex-1 overflow-y-auto pr-2">
                {dynamicStats.missing.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {dynamicStats.missing.map((skill, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="font-medium text-amber-900">{skill}</span>
                        <span className="text-xs bg-white px-2 py-1 rounded border border-amber-200 text-amber-600">Required</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-emerald-600">
                    <CheckCircle className="w-12 h-12 mb-3" />
                    <p className="font-bold">No Critical Gaps Found!</p>
                    <p className="text-sm">Ready for this role.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                Top Cohort Skills
              </h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.skills.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="userLevel" name="Frequency" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Detailed List (Optional view) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-700">Departments Detected</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.departmentMappings?.map((dept, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-2">{dept.department}</h4>
              <p className="text-xs text-gray-500 mb-2 uppercase font-semibold">Possible Roles:</p>
              <div className="flex flex-wrap gap-2">
                {dept.possibleRoles.map((r, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">
                    {r.title}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};