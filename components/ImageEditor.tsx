import React, { useState } from 'react';
import { editProfileImage } from '../services/geminiService';
import { Image as ImageIcon, Wand2, Download, Upload } from 'lucide-react';

export const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // Store base64 string without the prefix for API, but with prefix for display
          const res = event.target.result as string;
          setOriginalImage(res);
          setEditedImage(null); // Reset edited image
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!originalImage || !prompt) return;

    setLoading(true);
    try {
      // Extract MIME type and base64 data
      const matches = originalImage.match(/^data:(.+);base64,(.+)$/);
      let mimeType = 'image/jpeg';
      let base64Data = '';

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      } else {
        // Fallback for data URL format
        base64Data = originalImage.split(',')[1];
      }

      const resultBase64 = await editProfileImage(base64Data, mimeType, prompt);
      // Gemini generated images are typically PNGs
      setEditedImage(`data:image/png;base64,${resultBase64}`);
    } catch (error) {
      console.error(error);
      alert("Failed to process image. Ensure API key is valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Profile Studio</h2>
            <p className="text-gray-500 text-sm">Use AI to professionalize your profile picture. Powered by Gemini 2.5 Flash Image.</p>
          </div>
          <div className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-medium flex items-center">
            <Wand2 className="w-3 h-3 mr-1" /> Nano Banana Features
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* Original */}
          <div className="flex flex-col items-center">
            <h3 className="font-semibold text-gray-700 mb-3">Original</h3>
            <div className="w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
              {originalImage ? (
                <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center h-full w-full hover:bg-gray-50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Upload Image</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Result */}
          <div className="flex flex-col items-center">
            <h3 className="font-semibold text-gray-700 mb-3">AI Result</h3>
            <div className="w-full aspect-square bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden relative">
              {loading ? (
                <div className="flex flex-col items-center animate-pulse">
                  <Wand2 className="w-8 h-8 text-blue-500 mb-2 animate-spin" />
                  <span className="text-xs text-blue-500">Generating...</span>
                </div>
              ) : editedImage ? (
                <>
                  <img src={editedImage} alt="Edited" className="w-full h-full object-cover" />
                  <a href={editedImage} download="profile-edit.png" className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white text-gray-700 transition-all">
                    <Download className="w-5 h-5" />
                  </a>
                </>
              ) : (
                <div className="text-gray-400 text-sm">Edited image will appear here</div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Add a professional studio background', 'Make it a pencil sketch', 'Add a retro filter'" 
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button 
            onClick={handleEdit}
            disabled={!originalImage || !prompt || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50"
          >
            <Wand2 className="w-5 h-5 mr-2" />
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};