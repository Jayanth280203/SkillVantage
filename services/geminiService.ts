import { GoogleGenAI, Type, FunctionDeclaration, Schema } from "@google/genai";
import { AnalysisResult, JobListing, StudentProfile, ResumeAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper to clean JSON ---
const cleanJson = (text: string) => {
  if (!text) return "{}";
  let cleaned = text;
  if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/```json/g, "").replace(/```/g, "").trim();
  }
  return cleaned;
};

// --- Analysis Service ---

export const analyzeSkillset = async (payloadJson: string): Promise<AnalysisResult> => {
  const model = "gemini-2.5-flash"; 
  
  const inputData = JSON.parse(payloadJson);
  const summaryForAI = JSON.stringify({
    topSkills: inputData.topSkills,
    detectedDepartments: inputData.departments || [],
    sampleData: inputData.sample || []
  });

  const prompt = `
    You are an expert technical recruiter and data analyst.
    
    Data Summary:
    ${summaryForAI}

    Tasks:
    1. ANALYZE departments found in the data.
    2. For EACH detected department, list 3-5 possible "job roles" that students from this department typically apply for (e.g., CS -> Software Engineer, Data Scientist).
    3. For EACH role, list "requiredSkills" (top 10 essential skills).
    4. "summary": Provide a high-level insight about the entire cohort.
    5. "clustering": Group the raw top skills provided into categories.
    6. "skills": Map the top skills provided to market demand (0-100).
    7. "missingSkills": List global skills missing from the top skills list that are critical for the identified departments.

    Output JSON matching the schema.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      role: { type: Type.STRING, description: "General label for the dataset (e.g. 'Engineering Cohort')" },
      summary: { type: Type.STRING },
      skills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            userLevel: { type: Type.INTEGER },
            marketDemand: { type: Type.INTEGER },
            category: { type: Type.STRING },
            gapAnalysis: { type: Type.STRING }
          }
        }
      },
      departmentMappings: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            department: { type: Type.STRING },
            possibleRoles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          }
        }
      },
      missingSkills: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      clustering: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (response.text) {
      const jsonText = cleanJson(response.text);
      const aiResult = JSON.parse(jsonText);

      // --- Post-Processing: Initial Student processing (Default view) ---
      const students: StudentProfile[] = [];
      
      if (inputData.rawStudents && Array.isArray(inputData.rawStudents)) {
        inputData.rawStudents.forEach((raw: any) => {
          // Find relevant department mapping
          const deptMap = aiResult.departmentMappings?.find((d: any) => 
            d.department.toLowerCase().includes((raw.department || '').toLowerCase()) ||
            (raw.department || '').toLowerCase().includes(d.department.toLowerCase())
          ) || aiResult.departmentMappings?.[0]; // Fallback

          const defaultRole = deptMap?.possibleRoles?.[0];
          const requiredSet = new Set<string>((defaultRole?.requiredSkills || []).map((s: string) => s.toLowerCase()));
          const studentSkillsLower = new Set<string>((raw.skills || []).map((s: string) => s.toLowerCase()));
          
          const missing: string[] = [];
          let matchCount = 0;

          requiredSet.forEach((req: string) => {
            let found = false;
            if (studentSkillsLower.has(req)) found = true;
            else {
              for (const ss of studentSkillsLower) {
                if (ss.includes(req) || req.includes(ss)) {
                  found = true;
                  break;
                }
              }
            }
            if (found) matchCount++;
            else missing.push(req.charAt(0).toUpperCase() + req.slice(1));
          });

          const totalReq = requiredSet.size || 1;
          const score = Math.round((matchCount / totalReq) * 100);

          students.push({
            id: raw.id,
            department: raw.department,
            rawSkills: raw.skills,
            matchScore: score,
            missingSkills: missing.slice(0, 5)
          });
        });
      }

      return {
        ...aiResult,
        students: students,
        cleaningReport: inputData.report
      } as AnalysisResult;
    }
    throw new Error("No response text generated");
  } catch (error) {
    console.error("Analysis failed", error);
    throw error;
  }
};

// --- Resume Analysis Service ---

export const analyzeResume = async (resumeText: string): Promise<ResumeAnalysisResult> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Analyze the following resume content text.
    
    INSTRUCTIONS:
    1. Scan the text specifically for a "Skills", "Technical Skills", "Technologies", or "Core Competencies" section.
    2. Identify the target job role based on the skills and experience present (e.g. "Frontend Developer", "Data Analyst").
    3. Compare the candidate's skills against standard market requirements for that role.
    4. Calculate an ATS Compatibility Score (0-100). Be strict. A generic resume should score lower.
    5. List missing skills that are standard for the identified role but absent in the text.
    6. List the candidate's strengths.
    7. List specific improvements (e.g. "Add x skill", "Quantify results").

    NOTE: The text is extracted from a PDF and may have formatting artifacts (e.g. joined words, missing spaces). Please infer the skills despite formatting issues.

    Resume Content:
    ${resumeText.slice(0, 12000)} 
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      atsScore: { type: Type.INTEGER },
      detectedRole: { type: Type.STRING },
      missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
    }
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema }
    });

    const cleanText = cleanJson(response.text || "{}");
    return JSON.parse(cleanText) as ResumeAnalysisResult;
  } catch (error) {
    console.error("Resume analysis failed", error);
    throw error;
  }
}

// --- Image Editing Service ---

export const editProfileImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  const model = "gemini-2.5-flash-image";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    }
    throw new Error("No image generated in response");
  } catch (error) {
    console.error("Image editing failed", error);
    throw error;
  }
};

// --- Job Search Service (Grounding) ---

export const searchJobs = async (role: string, workplaceType: string = "All"): Promise<JobListing[]> => {
  const model = "gemini-2.5-flash"; 
  
  let typeQuery = "";
  if (workplaceType !== "All") {
    typeQuery = ` (${workplaceType} only)`;
  }

  const query = `Find current open job listings for ${role}${typeQuery}. Provide a list with the job title, company name, and a specific URL to apply. Focus on recent openings.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: query,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const listings: JobListing[] = [];

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          listings.push({
            title: chunk.web.title || "Job Opening",
            company: "See Link",
            url: chunk.web.uri,
            snippet: "Click to view details from source."
          });
        }
      });
    }

    return listings;

  } catch (error) {
    console.error("Job search failed", error);
    return [];
  }
};

// --- Chat Service ---

export const streamChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  contextData?: string
) => {
  const model = 'gemini-2.5-flash'; 

  let systemInstruction = `You are a knowledgeable Career Mentor AI. Help students identify skill gaps, explain technical concepts, and provide career advice.`;
  
  if (contextData) {
    systemInstruction += `\n\nCONTEXT ABOUT CURRENT DATASET:\n${contextData}\n\nUse this context to answer questions about specific skills, gaps, or roles in the uploaded data.`;
  }

  const chat = ai.chats.create({
    model: model, 
    history: history,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  return await chat.sendMessageStream({ message });
};