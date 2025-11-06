// FIX: Implement the Gemini service to generate visuals, resolving module errors.
import { GoogleGenAI } from "@google/genai";
import { TimedLyric } from '../types';

// Per guidelines, API key must come from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

interface AiImage {
  url: string;
  startTime: number;
  endTime: number;
}

export const generateVisualsForLyrics = async (
  timedLyrics: TimedLyric[],
  songTitle: string,
  artistName: string,
  onProgress: (progress: number, message: string) => void
): Promise<AiImage[]> => {
  onProgress(5, "分析歌詞...");
  
  // Group lyrics into scenes (e.g., every 4 lines or based on timing)
  const scenes: TimedLyric[][] = [];
  let currentScene: TimedLyric[] = [];
  const sceneDurationThreshold = 15; // seconds
  let currentSceneDuration = 0;
  
  timedLyrics.forEach(lyric => {
      if (lyric.text.trim() === '') return;
      currentScene.push(lyric);
      currentSceneDuration += (lyric.endTime - lyric.startTime);
      if (currentScene.length >= 4 || currentSceneDuration >= sceneDurationThreshold) {
          scenes.push(currentScene);
          currentScene = [];
          currentSceneDuration = 0;
      }
  });
  if (currentScene.length > 0) {
      scenes.push(currentScene);
  }

  onProgress(10, `已將歌詞分為 ${scenes.length} 個場景...`);

  const generatedImages: AiImage[] = [];
  const totalScenes = scenes.length;

  for (let i = 0; i < totalScenes; i++) {
    const scene = scenes[i];
    const sceneLyrics = scene.map(l => l.text).join('\n');
    const progress = 10 + Math.floor((i / totalScenes) * 85);
    onProgress(progress, `正在為場景 ${i + 1}/${totalScenes} 生成畫面...`);

    const prompt = `
      為一首名為「${songTitle}」、由 ${artistName} 演唱的歌曲生成一張MV畫面。
      這個畫面的情境靈感來自以下歌詞：
      ---
      ${sceneLyrics}
      ---
      請生成一張富有情感、電影感的唯美畫面，風格可以是動漫、寫實或抽象，但要與歌詞意境高度契合。
      畫面應為 16:9 的寬螢幕比例。
    `;
    
    try {
      // Use ai.models.generateImages to generate images with the Imagen model as per guidelines.
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        
        const startTime = scene[0].startTime;
        const endTime = scene[scene.length - 1].endTime;
        
        generatedImages.push({
          url: imageUrl,
          startTime,
          endTime,
        });
      }
    } catch (error) {
        console.error(`Error generating image for scene ${i + 1}:`, error);
        // For better UX, we'll continue and maybe the user can re-generate later
        onProgress(progress, `場景 ${i + 1} 生成失敗，已跳過...`);
    }
  }
  
  // Ensure the entire duration is covered
  if (generatedImages.length > 0 && timedLyrics.length > 0) {
      const lastLyric = timedLyrics[timedLyrics.length - 1];
      const totalDuration = lastLyric.endTime;
      if (generatedImages.length > 0) {
        generatedImages[generatedImages.length - 1].endTime = totalDuration;
      }
  }
  
  onProgress(100, "影像生成完畢！");

  return generatedImages;
};
