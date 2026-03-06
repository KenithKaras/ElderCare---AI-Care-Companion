
import { GoogleGenAI, Modality, Type } from "@google/genai";

// Guideline: Instantiate GoogleGenAI inside functions to ensure latest context/API key
export const geminiService = {
  /**
   * Provides health advice using Gemini 3 Flash.
   */
  async getHealthAdvice(query: string) {
    try {
      // Guideline: Initialize GoogleGenAI right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
          systemInstruction: "You are a helpful, compassionate Elder Care Assistant. Provide simple, clear health advice for senior citizens. Keep answers brief and encouraging. Always recommend consulting a doctor for serious issues."
        }
      });
      return response.text || "I'm sorry, I couldn't process that. Please try asking in a simpler way.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "I'm having trouble connecting right now.";
    }
  },

  /**
   * Generates memory game content (pairs of items).
   */
  async generateMemoryGamePairs(theme: string) {
    try {
      // Guideline: Initialize GoogleGenAI right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate 6 pairs of elder-friendly items for a memory matching game based on the theme: ${theme}. Return as JSON array of objects with 'id', 'content' (emoji), and 'name'.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                content: { type: Type.STRING },
                name: { type: Type.STRING }
              },
              required: ["id", "content", "name"]
            }
          }
        }
      });
      
      const text = response.text || "[]";
      return JSON.parse(text);
    } catch (error) {
      console.error("Memory Game Generation Error:", error);
      return [
        { id: '1', content: '🍎', name: 'Apple' },
        { id: '2', content: '🍞', name: 'Bread' },
        { id: '3', content: '☕', name: 'Coffee' },
        { id: '4', content: '🧶', name: 'Yarn' },
        { id: '5', content: '📚', name: 'Book' },
        { id: '6', content: '🪴', name: 'Plant' }
      ];
    }
  },

  /**
   * Generates a guided meditation audio clip using Gemini TTS.
   */
  async generateMeditationAudio(mood: string) {
    try {
      // Guideline: Initialize GoogleGenAI right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Say in a very calm, slow, and soothing voice: Welcome to your ${mood} meditation. Take a deep breath in... and hold it... now slowly let it out. Imagine you are in a peaceful place. You are safe, you are loved, and everything is okay. Focus on the gentle rhythm of your heart. You are doing wonderful.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64Audio;
    } catch (error) {
      console.error("Meditation Audio Error:", error);
      return null;
    }
  }
};

/**
 * Helper to decode raw PCM audio from Gemini TTS
 */
export async function playGeminiAudio(base64: string) {
  const decode = (b64: string) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioBytes = decode(base64);
  const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
  return source;
}
