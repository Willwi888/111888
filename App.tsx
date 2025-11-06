import React, { useState, useCallback, useRef, useEffect } from 'react';
import LyricsTiming from './components/LyricsTiming';
import VideoPlayer from './components/VideoPlayer';
import { TimedLyric } from './types';

import ImageIcon from './components/icons/ImageIcon';
import MusicIcon from './components/icons/MusicIcon';
import SrtIcon from './components/icons/SrtIcon';
import WillWiMusicLogo from './components/icons/WillWiMusicLogo';
import InfoIcon from './components/icons/InfoIcon';
import Modal from './components/Modal';
import PasswordModal from './components/PasswordModal';
import LockIcon from './components/icons/LockIcon';
import SparklesIcon from './components/icons/SparklesIcon';
import ToastContainer from './components/Toast';
import { useToasts } from './hooks/useToasts';

type AppState = 'UPLOAD' | 'TIMING' | 'PREVIEW';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('UPLOAD');
  const { toasts, addToast, removeToast } = useToasts();

  // Input states
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [lyricsText, setLyricsText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Derived object URLs
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // From timing component
  const [timedLyrics, setTimedLyrics] = useState<TimedLyric[]>([]);
  const [duration, setDuration] = useState(0);

  // Ref for file inputs to trigger click
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAiUnlocked, setIsAiUnlocked] = useState(false);

  // Effect for robust object URL management to prevent memory leaks
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);


  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file);
    }
  };

  const handleLyricsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLyricsText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };
  
  const isStartTimingDisabled = !songTitle || !artistName || !lyricsText || !audioFile || !imageFile;

  const handleStartTiming = () => {
    if (!isStartTimingDisabled) {
      setAppState('TIMING');
    }
  };

  const handleTimingComplete = useCallback((lyrics: TimedLyric[], audioDuration: number) => {
    setTimedLyrics(lyrics);
    setDuration(audioDuration);
    setAppState('PREVIEW');
  }, []);

  const handleBackToTiming = useCallback(() => {
    setAppState('TIMING');
  }, []);
  
  const handleBackToUpload = useCallback(() => {
      setAppState('UPLOAD');
  }, []);
  
  const handlePasswordSuccess = () => {
      setIsAiUnlocked(true);
      setIsPasswordModalOpen(false);
      addToast({ type: 'success', message: '天選之桶已成功解鎖！' });
  };

  const renderContent = () => {
    switch (appState) {
      case 'UPLOAD':
        return (
          <div className="w-full max-w-2xl mx-auto p-8 bg-black/50 backdrop-blur-md rounded-2xl border border-yellow-700/50 shadow-2xl animate-fade-in-up">
              <h1 className="text-4xl font-bold text-center text-yellow-300 mb-2" style={{textShadow: '0 0 10px rgba(252, 211, 77, 0.5)'}}>AI 卡拉OK MV 產生器</h1>
              <p className="text-center text-gray-400 mb-8">三步驟，將你的音樂變成獨一無二的動態歌詞影片！</p>
              
              <div className="space-y-6">
                 {/* Song Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="歌曲名稱" value={songTitle} onChange={e => setSongTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-900/50 text-white border border-gray-700 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition"/>
                  <input type="text" placeholder="歌手名稱" value={artistName} onChange={e => setArtistName(e.target.value)} className="w-full px-4 py-3 bg-gray-900/50 text-white border border-gray-700 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition"/>
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <button onClick={() => audioInputRef.current?.click()} className={`flex flex-col items-center justify-center p-4 border-2 ${audioFile ? 'border-yellow-400' : 'border-dashed border-gray-600'} rounded-lg hover:bg-gray-800/50 transition`}>
                        <MusicIcon className={`w-8 h-8 ${audioFile ? 'text-yellow-400' : 'text-gray-400'}`} />
                        <span className="mt-2 text-sm text-center">{audioFile ? audioFile.name : '上傳音訊 (.mp3)'}</span>
                   </button>
                   <button onClick={() => imageInputRef.current?.click()} className={`flex flex-col items-center justify-center p-4 border-2 ${imageFile ? 'border-yellow-400' : 'border-dashed border-gray-600'} rounded-lg hover:bg-gray-800/50 transition`}>
                        <ImageIcon className={`w-8 h-8 ${imageFile ? 'text-yellow-400' : 'text-gray-400'}`} />
                        <span className="mt-2 text-sm text-center">{imageFile ? imageFile.name : '上傳封面'}</span>
                   </button>
                   <button onClick={() => lyricsInputRef.current?.click()} className={`flex flex-col items-center justify-center p-4 border-2 ${lyricsText ? 'border-yellow-400' : 'border-dashed border-gray-600'} rounded-lg hover:bg-gray-800/50 transition`}>
                        <SrtIcon className={`w-8 h-8 ${lyricsText ? 'text-yellow-400' : 'text-gray-400'}`} />
                        <span className="mt-2 text-sm text-center">{lyricsText ? '歌詞已載入' : '上傳歌詞 (.txt)'}</span>
                   </button>
                </div>

                 {/* Hidden File Inputs */}
                <input type="file" ref={audioInputRef} onChange={(e) => handleFileChange(e, setAudioFile)} accept="audio/mpeg" className="hidden" />
                <input type="file" ref={imageInputRef} onChange={(e) => handleFileChange(e, setImageFile)} accept="image/*" className="hidden" />
                <input type="file" ref={lyricsInputRef} onChange={handleLyricsFileChange} accept=".txt,.lrc" className="hidden" />
              
                <textarea 
                  placeholder="或直接貼上歌詞..." 
                  value={lyricsText} 
                  onChange={e => setLyricsText(e.target.value)} 
                  className="w-full h-32 px-4 py-3 bg-gray-900/50 text-white border border-gray-700 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition resize-none custom-scrollbar"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button 
                    onClick={() => setIsPasswordModalOpen(true)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
                      isAiUnlocked 
                        ? 'bg-green-600 text-white cursor-default'
                        : 'bg-yellow-400 text-black hover:bg-yellow-300'
                    }`}
                    style={isAiUnlocked ? {} : {boxShadow: '0 0 10px rgba(252, 211, 77, 0.6)'}}
                  >
                    {isAiUnlocked ? <SparklesIcon className="w-5 h-5" /> : <LockIcon className="w-5 h-5" />}
                    <span>{isAiUnlocked ? '天選之人已解鎖' : '解鎖天選之桶'}</span>
                  </button>
                  <button 
                    onClick={handleStartTiming} 
                    disabled={isStartTimingDisabled}
                    className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    下一步：歌詞計時
                  </button>
                </div>
              </div>
          </div>
        );
      case 'TIMING':
        return <LyricsTiming 
                 lyricsText={lyricsText} 
                 audioUrl={audioUrl!} 
                 backgroundImageUrl={imageUrl!}
                 onComplete={handleTimingComplete} 
                 onBack={handleBackToUpload}
               />;
      case 'PREVIEW':
        return <VideoPlayer 
                  timedLyrics={timedLyrics}
                  audioUrl={audioUrl!}
                  imageUrl={imageUrl!}
                  backgroundImage={imageFile}
                  duration={duration}
                  onBack={handleBackToTiming}
                  songTitle={songTitle}
                  artistName={artistName}
                  isAiUnlocked={isAiUnlocked}
                  addToast={addToast}
               />;
    }
  };

  return (
    <main className="min-h-screen w-full bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="absolute inset-0 bg-grid-yellow-500/10 [mask-image:linear-gradient(to_bottom,white_5%,transparent_90%)]"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
      
      <WillWiMusicLogo />

      <button onClick={() => setIsInfoModalOpen(true)} className="absolute top-4 right-4 z-20 text-gray-400 hover:text-yellow-300 transition-colors p-2 rounded-full hover:bg-black/50">
        <InfoIcon className="w-6 h-6" />
      </button>

      {renderContent()}

      <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)}>
         <h2 className="text-2xl font-bold text-yellow-300 mb-4">關於 AI 卡拉OK MV 產生器</h2>
         <div className="space-y-4 text-gray-300">
           <p>這是一個由 <a href="https://willwi.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">WillWi Music</a> 基於 Google Gemini API 打造的實驗性專案。</p>
           <p>您可以上傳您喜愛的歌曲、封面和歌詞，透過簡單的計時介面，為歌詞的每一行都標上精確的時間戳。完成後，不僅可以預覽卡拉OK效果，更能啟用「天選之桶」功能，讓 AI 根據您的歌詞意境，自動生成一系列充滿電影感的動態背景畫面，最終匯出成一部完整的 MP4 影片！</p>
           <h3 className="text-xl font-semibold text-yellow-300 pt-2">技術棧</h3>
           <ul className="list-disc list-inside space-y-1">
              <li>前端框架: React + TypeScript + Tailwind CSS</li>
              <li>AI 模型: Google Gemini (Imagen 2 for Image Generation)</li>
              <li>影片處理: FFmpeg.wasm (在瀏覽器端直接編碼影片)</li>
           </ul>
           <p className="pt-4 text-sm text-gray-500">注意：AI 生成和影片匯出過程會消耗較多運算資源，請耐心等候。所有檔案處理均在您的瀏覽器本機完成，我們不會上傳或儲存您的任何檔案。</p>
         </div>
      </Modal>

      <PasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
        addToast={addToast}
      />
      
      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        .bg-grid-yellow-500\\/10 {
            background-image: linear-gradient(to right, rgba(202, 138, 4, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(202, 138, 4, 0.1) 1px, transparent 1px);
            background-size: 3rem 3rem;
        }
         .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ca8a04; border-radius: 4px; }
      `}</style>
    </main>
  );
};

export default App;