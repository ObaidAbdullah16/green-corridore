import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Construction,
  Car,
  AlertTriangle,
  X,
  MapPin,
  Loader2,
  Image as ImageIcon,
  Landmark as LandmarkIcon,
  Sparkles,
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { reportHazard } from '../../services/api';
import {
  TEST_HAZARD_PRESETS,
  inspectHazardImage,
  drawAiBoundingBox
} from '../../services/aiVisionService';

const HAZARD_TYPES = [
  {
    type: 'pothole',
    label: 'Pothole',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    desc: 'Road depression / crater causing speed reduction'
  },
  {
    type: 'construction',
    label: 'Construction',
    icon: <Construction className="w-5 h-5 text-yellow-400" />,
    desc: 'Road work, narrowing, or flyover work'
  },
  {
    type: 'roadblock',
    label: 'Roadblock',
    icon: <AlertOctagon className="w-5 h-5 text-rose-500" />,
    desc: 'Impassable barrier, barricade, or total closure'
  },
  {
    type: 'accident',
    label: 'Accident',
    icon: <Car className="w-5 h-5 text-purple-400" />,
    desc: 'Vehicle collision causing congestion or blockage'
  },
  {
    type: 'other',
    label: 'Other Hazard',
    icon: <ShieldAlert className="w-5 h-5 text-slate-300" />,
    desc: 'Waterlogging, debris, or broken traffic signals'
  }
];

const SEVERITY_LEVELS = [
  { level: 'low', label: 'Minor', penalty: 'Slight delay' },
  { level: 'medium', label: 'Moderate', penalty: 'Moderate delay' },
  { level: 'high', label: 'Severe', penalty: 'Major detour recommended' },
  { level: 'critical', label: 'Impassable', penalty: 'Total avoidance / blocked' }
];

export function ReportHazardModal({
  coordinates, // [lat, lon]
  userRole = 'citizen',
  theme = 'dark',
  onClose,
  onHazardReported
}) {
  const [selectedType, setSelectedType] = useState('pothole');
  const [selectedSeverity, setSelectedSeverity] = useState('medium');
  const [landmark, setLandmark] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // AI Computer Vision State
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiDetection, setAiDetection] = useState(null);
  const [showAiHud, setShowAiHud] = useState(true);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const previewImgRef = useRef(null);
  const canvasRef = useRef(null);

  const isDark = theme === 'dark';

  if (!coordinates) return null;

  // Re-draw bounding box whenever image is loaded or detection updates
  const renderBoundingBox = () => {
    try {
      if (!previewImgRef.current || !canvasRef.current || !aiDetection) return;
      const img = previewImgRef.current;
      const canvas = canvasRef.current;

      canvas.width = img.clientWidth || img.naturalWidth || 400;
      canvas.height = img.clientHeight || img.naturalHeight || 220;

      if (showAiHud) {
        drawAiBoundingBox(canvas, img, aiDetection);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (err) {
      console.warn('renderBoundingBox safely caught error:', err);
    }
  };

  useEffect(() => {
    renderBoundingBox();
  }, [aiDetection, showAiHud]);

  // Execute AI Analysis on an image source
  const triggerAiAnalysis = async (imgSource, filename = '') => {
    setIsAiScanning(true);
    setAiDetection(null);
    setErrorMsg(null);

    try {
      const result = await inspectHazardImage({
        imageUrl: imgSource.startsWith('data:') ? null : imgSource,
        image: imgSource.startsWith('data:') ? imgSource : null,
        filename
      });

      if (result) {
        setAiDetection(result);

        if (result.isRoadHazard) {
          // Auto-fill form fields with AI suggestions ONLY when a real hazard is detected
          if (result.primaryType) {
            setSelectedType(result.primaryType);
          }
          if (result.recommendedSeverity) {
            setSelectedSeverity(result.recommendedSeverity);
          }
          if (result.summary && (!description || description.length < 10 || description.startsWith('[AI Vision'))) {
            setDescription(`[AI Vision Verified]: ${result.summary}`);
          }
        } else {
          // Clean road / non-hazard detected!
          if (!description || description.startsWith('[AI Vision')) {
            setDescription(`[AI Vision Audit]: Surface inspected. No severe road defects or closures detected.`);
          }
        }
      }
    } catch (err) {
      console.warn('AI Vision scan completed with fallback defaults:', err);
    } finally {
      setIsAiScanning(false);
    }
  };

  // Handle local file / camera upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setImageUrl(base64);
      triggerAiAnalysis(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Handle Preset selection
  const handleSelectPreset = (preset) => {
    setImageUrl(preset.url);
    if (!landmark) setLandmark(preset.locationHint);
    triggerAiAnalysis(preset.url, preset.type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // coordinates passed as [lat, lon], API expects GeoJSON [lon, lat]
      const payload = {
        type: selectedType,
        severity: selectedSeverity,
        landmark: landmark.trim(),
        imageUrl: imageUrl.trim(),
        description: description.trim(),
        coordinates: [coordinates[1], coordinates[0]]
      };

      const result = await reportHazard(payload);
      if (onHazardReported) {
        onHazardReported(result.hazard);
      }
      onClose();
    } catch (err) {
      console.error('Hazard report submission failed:', err);
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md pointer-events-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-2xl border space-y-4 max-h-[92vh] overflow-y-auto ${
          isDark
            ? 'bg-[#181B22] border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header with AI Badge */}
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20 flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`font-black text-base leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Report Road Hazard
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" />
                  <span>AI Vision Assisted</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Instantly recalibrates safe detours on Indore OSM graph
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-600/50 text-rose-200 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Coordinates indicator */}
          <div
            className={`flex items-center justify-between px-3.5 py-2 rounded-2xl border text-xs ${
              isDark ? 'bg-[#242831] border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span className="font-mono text-[11px]">
                {coordinates[0].toFixed(5)}° N, {coordinates[1].toFixed(5)}° E
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {userRole === 'authority' ? 'Municipal Officer 🛡️' : 'Citizen Reporter 👤'}
            </span>
          </div>

          {/* AI COMPUTER VISION PHOTO UPLOAD SECTION */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-[#1F232B] border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  AI Road Defect Inspection
                </span>
              </div>
              {aiDetection && (
                <button
                  type="button"
                  onClick={() => setShowAiHud(!showAiHud)}
                  className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>{showAiHud ? 'Hide Bounding Box' : 'Show Bounding Box'}</span>
                </button>
              )}
            </div>

            {/* Image Preview with Bounding Box Canvas Overlay */}
            {imageUrl ? (
              <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 flex items-center justify-center group">
                <img
                  ref={previewImgRef}
                  src={imageUrl}
                  alt="Hazard preview"
                  onLoad={renderBoundingBox}
                  className="w-full h-full object-cover"
                />

                {/* Interactive HUD Canvas Overlay */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none w-full h-full"
                />

                {/* Laser scan animation when actively scanning */}
                {isAiScanning && (
                  <div className="absolute inset-0 bg-sky-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-lg shadow-sky-400 animate-pulse absolute top-1/2 -translate-y-1/2" />
                    <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
                    <span className="text-xs font-black text-white bg-black/75 px-3 py-1 rounded-full border border-sky-400/50">
                      Vision Engine Analyzing Surface Morphology...
                    </span>
                  </div>
                )}

                {/* Action overlay buttons */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => triggerAiAnalysis(imageUrl)}
                    disabled={isAiScanning}
                    className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-sky-500/40 text-[11px] font-bold flex items-center space-x-1 backdrop-blur-md shadow"
                    title="Re-run AI Vision Model"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAiScanning ? 'animate-spin' : ''}`} />
                    <span>Re-Scan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setAiDetection(null);
                    }}
                    className="px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-[11px] font-bold backdrop-blur-md shadow"
                    title="Clear image"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone / Upload Triggers */
              <div className="flex flex-col sm:flex-row gap-2">
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 py-3 px-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center space-y-1 transition ${
                    isDark
                      ? 'border-slate-700 hover:border-sky-500 hover:bg-slate-800/50 text-slate-300'
                      : 'border-slate-300 hover:border-sky-500 hover:bg-sky-50/50 text-slate-700'
                  }`}
                >
                  <Upload className="w-5 h-5 text-sky-400" />
                  <span className="text-xs font-bold">Upload Local Photo</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WebP</span>
                </button>

                {/* Direct Camera Capture */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className={`flex-1 py-3 px-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center space-y-1 transition ${
                    isDark
                      ? 'border-slate-700 hover:border-amber-500 hover:bg-slate-800/50 text-slate-300'
                      : 'border-slate-300 hover:border-amber-500 hover:bg-amber-50/50 text-slate-700'
                  }`}
                >
                  <Camera className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold">Take Live Photo</span>
                  <span className="text-[10px] text-slate-400">Native Camera</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* 1-Click Test Presets (Super easy for developer & recruiter testing) */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                ⚡ Quick Test Sample Road Hazards (1-Click AI Test):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TEST_HAZARD_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center space-x-1 transition active:scale-95 ${
                      imageUrl === p.url
                        ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                        : isDark
                        ? 'bg-[#242831] border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Results Pill when detected */}
            {aiDetection && (
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
                  aiDetection.isRoadHazard
                    ? isDark
                      ? 'bg-sky-950/40 border-sky-800/60 text-sky-200'
                      : 'bg-sky-50 border-sky-200 text-sky-900'
                    : isDark
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2
                    className={`w-4 h-4 flex-shrink-0 ${
                      aiDetection.isRoadHazard ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  />
                  <div>
                    {aiDetection.isRoadHazard ? (
                      <>
                        <span className="font-bold">
                          🎯 Defect Detected: {String(aiDetection.primaryType || 'Hazard').toUpperCase()} ({((Number(aiDetection.confidence) || 0.94) * 100).toFixed(1)}% match)
                        </span>
                        <p className="text-[10px] opacity-80 leading-tight">
                          Recommended: {String(aiDetection.recommendedSeverity || 'medium').toUpperCase()} Severity • Auto-filled form below
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-emerald-400">
                          ✓ Surface Verified: Clean Road / No Defect Detected
                        </span>
                        <p className="text-[10px] opacity-85 leading-tight">
                          {aiDetection.summary || 'Road surface appears normal. You may still report manually if needed.'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hazard Type Selector with AI Match Highlight */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Hazard Type
              </label>
              {aiDetection?.isRoadHazard && (
                <span className="text-[10px] text-sky-400 font-bold">
                  ✓ AI Auto-Selected: {String(selectedType || 'pothole').toUpperCase()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HAZARD_TYPES.map((item) => {
                const isSelected = selectedType === item.type;
                const isAiRecommended = aiDetection?.isRoadHazard && aiDetection?.primaryType === item.type;

                return (
                  <button
                    type="button"
                    key={item.type}
                    onClick={() => setSelectedType(item.type)}
                    className={`p-2.5 rounded-2xl border flex flex-col items-start text-left transition relative ${
                      isSelected
                        ? 'bg-[#007AFF] border-sky-400 text-white shadow-lg shadow-blue-500/20'
                        : isDark
                        ? 'bg-[#242831] border-slate-700/80 hover:border-slate-600 text-slate-300'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {isAiRecommended && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-mono shadow">
                        AI Match
                      </span>
                    )}
                    {item.icon}
                    <span className={`font-bold text-xs mt-1 ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.label}
                    </span>
                    <span className={`text-[10px] line-clamp-1 ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Severity Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEVERITY_LEVELS.map((s) => {
                const isSelected = selectedSeverity === s.level;
                const isAiCalibrated = aiDetection?.isRoadHazard && aiDetection?.recommendedSeverity === s.level;

                return (
                  <button
                    type="button"
                    key={s.level}
                    onClick={() => setSelectedSeverity(s.level)}
                    className={`py-2 px-2 rounded-2xl border text-center transition relative ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                        : isDark
                        ? 'bg-[#242831] border-slate-700/80 text-slate-400 hover:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isAiCalibrated && (
                      <span className="absolute -top-1.5 right-2 text-[7px] font-black uppercase px-1 rounded-full bg-emerald-500 text-white">
                        AI
                      </span>
                    )}
                    <span className="block text-xs capitalize">{s.label}</span>
                    <span className="block text-[9px] opacity-75 mt-0.5">{s.penalty}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Landmark Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Nearby Landmark / Reference
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <LandmarkIcon className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite IET DAVV Gate / Near Bhanwarkua Square"
                maxLength={150}
                className={`w-full rounded-2xl pl-9 pr-3 py-2 text-xs outline-none border transition ${
                  isDark
                    ? 'bg-[#242831] border-slate-700/80 text-white placeholder-slate-400 focus:border-[#007AFF]'
                    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#007AFF]'
                }`}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Detailed Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe road blockage depth, lane obstruction, or detours..."
              rows={2}
              maxLength={400}
              className={`w-full rounded-2xl px-3 py-2 text-xs outline-none border transition resize-none ${
                isDark
                  ? 'bg-[#242831] border-slate-700/80 text-white placeholder-slate-400 focus:border-[#007AFF]'
                  : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#007AFF]'
              }`}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-2xl font-bold text-xs transition ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 active:scale-95 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Map...</span>
                </>
              ) : (
                <span>Publish Hazard Report</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
