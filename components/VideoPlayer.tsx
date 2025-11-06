import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TimedLyric } from '../types';
import { generateVisualsForLyrics } from '../services/geminiService';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import PrevIcon from './icons/PrevIcon';
import Loader from './Loader';
import KaraokeLyric from './KaraokeLyric';
import SparklesIcon from './icons/SparklesIcon';
import { Toast } from './Toast';

declare global {
  interface Window {
    FFmpeg: any;
  }
}

interface AiImage {
  url: string;
  startTime: number;
  endTime: number;
}

interface VideoPlayerProps {
  timedLyrics: TimedLyric[];
  audioUrl: string;
  imageUrl: string;
  backgroundImage: File | null;
  duration: number;
  onBack: () => void;
  songTitle: string;
  artistName: string;
  isAiUnlocked: boolean;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const fonts = [
  { name: '思源黑體 (預設)', value: "'Noto Sans TC', sans-serif" },
  { name: '馬善政 (書法)', value: "'Ma Shan Zheng', cursive" },
  { name: '龍藏體 (手寫)', value: "'Long Cang', cursive" },
  { name: '快樂體 (可愛)', value: "'ZCOOL KuaiLe', sans-serif" },
  { name: '思源宋體 (優雅)', value: "'Noto Serif TC', serif" },
];

const { createFFmpeg, fetchFile } = window.FFmpeg;
const ffmpeg = createFFmpeg({
  log: true,
  corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js',
});


const VideoPlayer: React.FC<VideoPlayerProps> = ({ timedLyrics, audioUrl, imageUrl, backgroundImage, duration, onBack, songTitle, artistName, isAiUnlocked, addToast }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [artSize, setArtSize] = useState(40);
  const [fontFamily, setFontFamily] = useState(fonts[0].value);
  
  const [aiImages, setAiImages] = useState<AiImage[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGenerationProgress, setAiGenerationProgress] = useState<{ message: string; progress: number } | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ message: string; progress?: number } | null>(null);

  const handleAiGenerate = async () => {
    if (!isAiUnlocked) {
      addToast({ type: 'error', message: "請先返回主畫面解鎖 AI 功能！" });
      return;
    }
    setIsGeneratingAi(true);
    setAiGenerationProgress({ message: 'AI 引擎啟動中...', progress: 0 });
    try {
      const images = await generateVisualsForLyrics(timedLyrics, songTitle, artistName, (progress, message) => {
        setAiGenerationProgress({ progress, message });
      });
      setAiImages(images);
      addToast({ type: 'success', message: 'AI 動態背景生成完畢！' });
    } catch(error) {
      console.error("AI image generation failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      addToast({ type: 'error', message: `AI影像生成失敗: ${message}`});
    } finally {
      setIsGeneratingAi(false);
      setAiGenerationProgress(null);
    }
  };


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const endedHandler = () => {
      setIsPlaying(false);
      setCurrentTime(duration);
    };
    audio.addEventListener('ended', endedHandler);
    return () => {
      audio.removeEventListener('ended', endedHandler);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [duration]);

  useEffect(() => {
    const animate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);
  
 const lyricLines = useMemo(() => {
    const realLyrics = timedLyrics.filter(l => l.text.trim() !== '');
    if (realLyrics.length === 0) {
      return { prev: null, current: null, next: null };
    }

    const currentIndex = realLyrics.findIndex(lyric => currentTime >= lyric.startTime && currentTime < lyric.endTime);

    if (currentTime < realLyrics[0].startTime) {
      return { prev: null, current: null, next: realLyrics[0] };
    }

    const lastLyric = realLyrics[realLyrics.length - 1];
    if (currentTime >= lastLyric.endTime) {
      return { prev: lastLyric, current: null, next: null };
    }

    if (currentIndex !== -1) {
      return {
        prev: realLyrics[currentIndex - 1] || null,
        current: realLyrics[currentIndex],
        next: realLyrics[currentIndex + 1] || null,
      };
    }
    
    let prevLyricIndex = -1;
    for(let i = realLyrics.length - 1; i >= 0; i--) {
        if(currentTime >= realLyrics[i].endTime) {
            prevLyricIndex = i;
            break;
        }
    }
    if (prevLyricIndex !== -1) {
        return {
            prev: realLyrics[prevLyricIndex],
            current: null,
            next: realLyrics[prevLyricIndex + 1] || null,
        }
    }

    return { prev: null, current: null, next: null };
  }, [currentTime, timedLyrics]);


  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (audioRef.current.currentTime >= duration - 0.1) {
          audioRef.current.currentTime = 0;
        }
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return isNaN(minutes) || isNaN(secs) ? '0:00' : `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress({ message: '準備匯出引擎...', progress: 0 });

    try {
        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
        }

        setExportProgress({ message: '讀取音訊檔案...', progress: 5 });
        ffmpeg.FS('writeFile', 'input.mp3', await fetchFile(audioUrl));
        
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('無法取得 Canvas Context');

        const frameRate = 30;
        const totalFrames = Math.floor(duration * frameRate);

        setExportProgress({ message: '預載入所有圖片資源...', progress: 8 });
        const allImageUrls = [imageUrl, ...aiImages.map(i => i.url)];
        const imageElements: { [key: string]: HTMLImageElement } = {};
        await Promise.all(allImageUrls.map(url => {
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    imageElements[url] = img;
                    resolve();
                };
                img.onerror = reject;
                img.src = url;
            });
        }));


        for (let i = 0; i < totalFrames; i++) {
            const frameTime = i / frameRate;
            
            const progress = 10 + Math.floor((i / totalFrames) * 80);
            setExportProgress({ message: `正在渲染畫面 ${i}/${totalFrames}`, progress });
            
            // --- Drawing logic copied and adapted for canvas ---
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const currentExportBgUrl = aiImages.length > 0
              ? (aiImages.find(img => frameTime >= img.startTime && frameTime < img.endTime)?.url || aiImages[0].url)
              : imageUrl;
            
            const bgImg = imageElements[currentExportBgUrl];
            if(bgImg) {
                const aspectRatio = bgImg.width / bgImg.height;
                let drawWidth = canvas.width;
                let drawHeight = canvas.width / aspectRatio;
                if (drawHeight < canvas.height) {
                    drawHeight = canvas.height;
                    drawWidth = canvas.height * aspectRatio;
                }
                ctx.drawImage(bgImg, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
            }
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const artWidthPx = canvas.width * (artSize / 100);
            const lyricsWidthPx = canvas.width - artWidthPx;
            const artImg = imageElements[imageUrl];
            if (artImg) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(artWidthPx/2, canvas.height/2, (artWidthPx - 60)/2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(artImg, 30, (canvas.height - (artWidthPx - 60)) / 2, artWidthPx - 60, artWidthPx - 60);
                ctx.restore();
            }
            
            // Lyrics
            const currentLyricLines = (() => {
                const realLyrics = timedLyrics.filter(l => l.text.trim() !== '');
                 if (realLyrics.length === 0) return { prev: null, current: null, next: null };
                const currentIndex = realLyrics.findIndex(lyric => frameTime >= lyric.startTime && frameTime < lyric.endTime);
                if (frameTime < realLyrics[0].startTime) return { prev: null, current: null, next: realLyrics[0] };
                const lastLyric = realLyrics[realLyrics.length - 1];
                if (frameTime >= lastLyric.endTime) return { prev: lastLyric, current: null, next: null };
                if (currentIndex !== -1) return { prev: realLyrics[currentIndex - 1] || null, current: realLyrics[currentIndex], next: realLyrics[currentIndex + 1] || null };
                let prevLyricIndex = -1;
                for (let i = realLyrics.length - 1; i >= 0; i--) { if (frameTime >= realLyrics[i].endTime) { prevLyricIndex = i; break; } }
                if (prevLyricIndex !== -1) return { prev: realLyrics[prevLyricIndex], current: null, next: realLyrics[prevLyricIndex + 1] || null };
                return { prev: null, current: null, next: null };
            })();
            
            ctx.save();
            ctx.translate(artWidthPx + (lyricsWidthPx / 2), canvas.height / 2);
            ctx.rotate(-5 * Math.PI / 180);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const fontSize = 48;
            
            // prev
            ctx.font = `bold ${fontSize * 0.6}px ${fontFamily}`;
            ctx.fillStyle = 'rgba(209, 213, 219, 0.7)'; // gray-300
            ctx.fillText(currentLyricLines.prev?.text || '', 0, -fontSize * 1.5);
            
            // current
            if (currentLyricLines.current) {
                const currentText = currentLyricLines.current.text;
                const karaokeProgress = (frameTime - currentLyricLines.current.startTime) / (currentLyricLines.current.endTime - currentLyricLines.current.startTime);
                
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
                
                // Base
                ctx.fillStyle = 'rgba(156, 163, 175, 1)'; // gray-400
                ctx.fillText(currentText, 0, 0);

                // Highlight
                const textWidth = ctx.measureText(currentText).width;
                const gradient = ctx.createLinearGradient(-textWidth / 2, 0, textWidth / 2, 0);
                gradient.addColorStop(0, '#fde047'); // yellow-300
                gradient.addColorStop(0.5, '#ffffff'); // white
                gradient.addColorStop(1, '#fbbf24'); // yellow-400
                ctx.fillStyle = gradient;
                
                ctx.save();
                ctx.beginPath();
                ctx.rect(-textWidth / 2, -fontSize, textWidth * karaokeProgress, fontSize * 2);
                ctx.clip();
                ctx.fillText(currentText, 0, 0);
                ctx.restore();
            }

            // next
            ctx.font = `bold ${fontSize * 0.6}px ${fontFamily}`;
            ctx.fillStyle = 'rgba(209, 213, 219, 0.7)';
            ctx.fillText(currentLyricLines.next?.text || '', 0, fontSize * 1.5);

            ctx.restore();
            // --- End drawing logic ---
            
            const frameData = canvas.toDataURL('image/jpeg', 0.8);
            const frameNum = String(i).padStart(5, '0');
            ffmpeg.FS('writeFile', `frame-${frameNum}.jpg`, await fetchFile(frameData));
        }

        setExportProgress({ message: '正在編碼影片...請稍候', progress: 90 });
        await ffmpeg.run('-framerate', String(frameRate), '-i', 'frame-%05d.jpg', '-i', 'input.mp3', '-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental', '-b:a', '192k', '-shortest', '-pix_fmt', 'yuv420p', 'output.mp4');

        setExportProgress({ message: '編碼完成，準備下載...', progress: 99 });
        const data = ffmpeg.FS('readFile', 'output.mp4');
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${songTitle} - ${artistName}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        
        addToast({ type: 'success', message: 'MP4 影片匯出成功！' });
        
        // Cleanup
        for (let i = 0; i < totalFrames; i++) {
             ffmpeg.FS('unlink', `frame-${String(i).padStart(5, '0')}.jpg`);
        }
        ffmpeg.FS('unlink', 'input.mp3');
        ffmpeg.FS('unlink', 'output.mp4');

    } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : String(err);
        addToast({ type: 'error', message: `匯出失敗: ${message}`});
    } finally {
        setIsExporting(false);
        setExportProgress(null);
    }
};

  const baseLyricClass = 'font-bold drop-shadow-lg';
  const highlightLyricClass = 'bg-gradient-to-r from-yellow-300 via-white to-yellow-400 bg-clip-text text-transparent';
      
  const currentBg = useMemo(() => {
    if (aiImages.length === 0) return { current: imageUrl, next: null, blend: 0 };

    const currentImageIndex = aiImages.findIndex(img => currentTime >= img.startTime && currentTime < img.endTime);

    // Before the first AI image, show the cover.
    if (currentTime < aiImages[0].startTime) {
        return { current: imageUrl, next: null, blend: 0 };
    }

    // After the last lyric, show the last AI image.
    const lastLyric = timedLyrics[timedLyrics.length - 1];
    if (lastLyric && currentTime >= lastLyric.endTime && aiImages.length > 0) {
        return { current: aiImages[aiImages.length - 1].url, next: null, blend: 0 };
    }
    
    // If we are in a scene with an AI image.
    if (currentImageIndex !== -1) {
        const current = aiImages[currentImageIndex];
        const next = aiImages[currentImageIndex + 1];

        const transitionDuration = 1.0; // 1 second crossfade
        let blend = 0;
        // Start blending 'transitionDuration' seconds before the next image starts.
        if (next && currentTime > (next.startTime - transitionDuration)) {
            blend = Math.min(1, (currentTime - (next.startTime - transitionDuration)) / transitionDuration);
        }

        return { current: current.url, next: next ? next.url : null, blend };
    }

    // Fallback: If we're between scenes (no current AI image found), find the last one that played.
    let lastImageIndex = -1;
    for(let i = aiImages.length - 1; i >= 0; i--) {
        if (currentTime >= aiImages[i].endTime) {
            lastImageIndex = i;
            break;
        }
    }
    if (lastImageIndex !== -1) {
        return { current: aiImages[lastImageIndex].url, next: null, blend: 0 };
    }
    
    // Default fallback to cover image if nothing else matches.
    return { current: imageUrl, next: null, blend: 0 };
  }, [aiImages, currentTime, imageUrl, timedLyrics]);

// FIX: Add missing return statement and JSX for the component UI.
  return (
    <div className="w-full h-[90vh] max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 p-4 animate-fade-in-up">
      {/* Loader */}
      {(isGeneratingAi && aiGenerationProgress) && <Loader message={aiGenerationProgress.message} progress={aiGenerationProgress.progress} />}
      {(isExporting && exportProgress) && <Loader message={exportProgress.message} progress={exportProgress.progress} />}
      
      <audio ref={audioRef} src={audioUrl} />

      {/* Main Player View */}
      <div className="flex-grow h-full relative overflow-hidden rounded-2xl bg-black border border-yellow-700/50 shadow-2xl">
        {/* Background Image(s) */}
        <div className="absolute inset-0 w-full h-full">
          <img src={currentBg.current} alt="Background" className="w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: 1 - currentBg.blend }} />
          {currentBg.next && (
            <img src={currentBg.next} alt="Next Background" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: currentBg.blend }} />
          )}
        </div>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        
        {/* Content Layout */}
        <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
            <div className="w-full h-full flex" style={{ perspective: '1000px' }}>
                {/* Album Art (Left side) */}
                <div className="flex-shrink-0 flex items-center justify-center" style={{ width: `${artSize}%`}}>
                    <div className="relative w-full aspect-square max-w-md" style={{ transform: 'rotateY(15deg)', transformStyle: 'preserve-3d' }}>
                        <img src={imageUrl} alt="Album Art" className="w-full h-full object-cover rounded-full shadow-2xl ring-4 ring-yellow-400/50" />
                    </div>
                </div>

                {/* Lyrics (Right side) */}
                <div className="flex-grow flex flex-col items-center justify-center pl-8" style={{ width: `${100 - artSize}%` }}>
                    <div className="w-full max-w-2xl text-center space-y-4" style={{ transform: 'rotateY(-5deg)' }}>
                         {lyricLines.prev && <p className={`${baseLyricClass} text-3xl text-gray-300 opacity-70`} style={{ fontFamily }}>{lyricLines.prev.text}</p>}
                         {lyricLines.current && (
                            <KaraokeLyric 
                                text={lyricLines.current.text}
                                startTime={lyricLines.current.startTime}
                                endTime={lyricLines.current.endTime}
                                currentTime={currentTime}
                                className={`${baseLyricClass} text-6xl`}
                                highlightClassName={highlightLyricClass}
                                style={{ fontFamily }}
                                isCurrent={true}
                            />
                         )}
                         {lyricLines.next && <p className={`${baseLyricClass} text-3xl text-gray-300 opacity-70`} style={{ fontFamily }}>{lyricLines.next.text}</p>}
                    </div>
                </div>
            </div>
        </div>

        {/* Playback Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-4 text-white">
            <button onClick={handlePlayPause} className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors">
              {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </button>
            <span className="text-sm font-mono w-14 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step="0.01"
              value={currentTime}
              onChange={handleTimelineChange}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-yellow-400"
            />
            <span className="text-sm font-mono w-14">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full lg:w-80 flex-shrink-0 bg-black/50 backdrop-blur-md rounded-2xl border border-yellow-700/50 p-6 space-y-6 overflow-y-auto custom-scrollbar">
        <h2 className="text-2xl font-bold text-yellow-300">控制面板</h2>
        
        {/* Style Controls */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">封面/歌詞比例 ({artSize}%)</label>
          <input type="range" min="20" max="60" value={artSize} onChange={(e) => setArtSize(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
        </div>
        <div>
          <label htmlFor="font-select" className="block text-sm font-medium text-gray-300 mb-2">歌詞字體</label>
          <select id="font-select" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-3 py-2 bg-gray-900/50 text-white border border-gray-700 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition">
            {fonts.map(font => <option key={font.value} value={font.value}>{font.name}</option>)}
          </select>
        </div>

        <hr className="border-yellow-800/50" />

        {/* AI Controls */}
        <div>
            <h3 className="text-lg font-semibold text-yellow-300 mb-3">AI 動態背景</h3>
            <button 
              onClick={handleAiGenerate}
              disabled={isGeneratingAi || isExporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-400 text-black font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-300"
              style={{boxShadow: '0 0 10px rgba(252, 211, 77, 0.6)'}}
            >
              <SparklesIcon className="w-5 h-5" />
              <span>{aiImages.length > 0 ? '重新生成' : 'AI 生成畫面'}</span>
            </button>
            <p className="text-xs text-gray-400 mt-2">AI 將根據歌詞意境生成一系列背景畫面。此功能需要解鎖。</p>
        </div>
        
        <hr className="border-yellow-800/50" />

        {/* Export and Back */}
        <div className="space-y-4">
          <button 
            onClick={handleExport}
            disabled={isExporting || isGeneratingAi}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            匯出 MP4 影片
          </button>
          <button 
            onClick={onBack} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-300 font-semibold bg-gray-700/50 border border-gray-600 hover:bg-gray-600/50 rounded-lg transition-colors"
          >
            <PrevIcon className="w-5 h-5" />
            返回計時
          </button>
        </div>
      </div>
       <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ca8a04; border-radius: 4px; }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default VideoPlayer;
