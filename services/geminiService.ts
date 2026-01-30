import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ModelTier, Role, Message, Attachment } from "../types";

// Helper to determine capability from the model name string
const getModelConfig = (modelId: string) => {
  // Video Generation (Vias)
  if (modelId.includes("Vias")) {
     // Vias 1.0 Pro -> veo-3.1-generate-preview
     // Others -> veo-3.1-fast-generate-preview
     const model = modelId.includes("Pro") ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
     return { type: 'video', model };
  }
  
  // Image Generation (Plaza or Imaja)
  if (modelId.includes("Plaza") || modelId.includes("Imaja")) {
     // Pro -> gemini-3-pro-image-preview
     // Others -> gemini-2.5-flash-image
     const model = modelId.includes("Pro") ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
     return { type: 'image', model };
  }
  
  // Audio Generation (Sonix)
  if (modelId.includes("Sonix")) {
      return { type: 'audio', model: 'gemini-2.5-flash-preview-tts' };
  }

  // Specialized Useful AIs
  // NOTE: Switched Pro models to Flash to prevent 429 Resource Exhausted errors
  if (modelId.includes("Research")) return { type: 'text', model: 'gemini-3-flash-preview', thinkingBudget: 0, tool: 'search' };
  if (modelId.includes("Travel")) return { type: 'text', model: 'gemini-2.5-flash', thinkingBudget: 0, tool: 'maps' };
  if (modelId.includes("Reasoner")) return { type: 'text', model: 'gemini-3-flash-preview', thinkingBudget: 24000 };
  if (modelId.includes("Polyglot")) return { type: 'text', model: 'gemini-3-flash-preview', thinkingBudget: 0, instruction: 'translate' };
  if (modelId.includes("Quantum")) return { type: 'text', model: 'gemini-3-flash-preview', thinkingBudget: 16000, instruction: 'stem' };

  // Hynix Text/Code Models
  let model = 'gemini-3-flash-preview'; 
  let thinkingBudget = 0;

  if (modelId.includes("Creatore")) {
      if (modelId.includes("Mini")) {
          // Fast code generation, no deep reasoning
          model = 'gemini-3-flash-preview';
          thinkingBudget = 0; 
      } else if (modelId.includes("Flash")) {
          // Balanced speed and reasoning
          model = 'gemini-3-flash-preview';
          thinkingBudget = 16000; 
      } else {
          // Pro: Max reasoning capability
          // Switched to Flash to avoid 429 errors
          model = 'gemini-3-flash-preview';
          thinkingBudget = 24000; 
      }
  } else if (modelId.includes("1.2") || modelId.includes("1.3")) {
    model = 'gemini-3-flash-preview'; // Switched to Flash
    // Optimized latency for 1.3
    if (modelId.includes("1.3")) thinkingBudget = 0; 
  } else {
    model = 'gemini-3-flash-preview';
  }
  
  return { type: 'text', model, thinkingBudget };
};

// Initialize the client using ONLY the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Array buffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to wrap raw PCM in WAV header so standard players can play it
// Assumes 24kHz, 1 channel, 16-bit PCM (standard for Gemini TTS)
const pcmToWav = (base64PCM: string): string => {
  const binaryString = window.atob(base64PCM);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // WAV Header construction
  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
      }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true); // File size
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);

  const headerBytes = new Uint8Array(wavHeader);
  const wavBytes = new Uint8Array(headerBytes.length + bytes.length);
  wavBytes.set(headerBytes);
  wavBytes.set(bytes, headerBytes.length);

  // Convert back to base64
  let binary = '';
  const l = wavBytes.byteLength;
  for (let i = 0; i < l; i++) {
    binary += String.fromCharCode(wavBytes[i]);
  }
  return window.btoa(binary);
}

export interface GenerationOptions {
    codeStyle?: string;
    includeTests?: boolean;
    signal?: AbortSignal;
    temperature?: number;
    systemInstruction?: string;
    topP?: number;
    topK?: number;
}

export const streamCompletion = async (
  history: Message[],
  currentPrompt: string,
  attachments: Attachment[],
  modelId: string,
  options: GenerationOptions,
  onChunk: (text: string, metadata?: any, generatedAttachments?: Attachment[]) => void
) => {
  const config = getModelConfig(modelId);

  // --- Video Generation Logic ---
  if (config.type === 'video') {
    try {
        onChunk("Initializing video generation engine...");
        
        if (typeof (window as any).aistudio !== 'undefined') {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            if (!hasKey) {
                onChunk("Please select a paid API key to use Vias video generation models. Opening selection dialog...");
                await (window as any).aistudio.openSelectKey();
            }
        }
        
        onChunk("Dreaming up your video... This may take a moment.");

        // Check abort before expensive operation
        if (options.signal?.aborted) return;

        // Use strict API key for video generation
        const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let operation = await currentAi.models.generateVideos({
            model: config.model,
            prompt: currentPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            if (options.signal?.aborted) throw new Error("Aborted by user");
            onChunk("Rendering video frames... (this can take ~1-2 minutes)");
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await currentAi.operations.getVideosOperation({operation: operation});
        }
        
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            onChunk("Finalizing video download...");
            const videoRes = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
            const videoBlob = await videoRes.blob();
            const base64 = await new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onloadend = () => {
                     const res = reader.result as string;
                     resolve(res.split(',')[1]);
                 };
                 reader.readAsDataURL(videoBlob);
            });

            onChunk("Video generated successfully.", undefined, [{
                mimeType: 'video/mp4',
                data: base64,
                name: 'generated_video.mp4'
            }]);
        } else {
             onChunk("Video generation completed but no URI returned.");
        }

    } catch (e: any) {
        if (options.signal?.aborted) {
            onChunk("Video generation stopped.");
            return;
        }
        if (e.message && e.message.includes("Requested entity was not found")) {
             if (typeof (window as any).aistudio !== 'undefined') {
                 await (window as any).aistudio.openSelectKey();
             }
             onChunk("Session expired or key invalid. Please try again after selecting a key.");
        } else {
             onChunk(`Video generation failed: ${e.message}`);
        }
    }
    return;
  }

  // --- Image Generation Logic ---
  if (config.type === 'image') {
      try {
          onChunk("Generating image...");
          if (options.signal?.aborted) return;
          
          const response = await ai.models.generateContent({
              model: config.model,
              contents: {
                  parts: [{ text: currentPrompt }]
              },
              config: {}
          });

          if (options.signal?.aborted) return;

          const parts = response.candidates?.[0]?.content?.parts || [];
          const generatedAttachments: Attachment[] = [];
          let textOutput = "Image generated.";

          for (const part of parts) {
              if (part.inlineData) {
                  generatedAttachments.push({
                      mimeType: part.inlineData.mimeType || 'image/png',
                      data: part.inlineData.data,
                      name: 'generated_image.png'
                  });
              } else if (part.text) {
                  textOutput = part.text;
              }
          }
          
          if (generatedAttachments.length > 0) {
              onChunk(textOutput, undefined, generatedAttachments);
          } else {
              onChunk("No image was generated. The model might have refused the prompt.");
          }

      } catch (e: any) {
          onChunk(`Image generation failed: ${e.message}`);
      }
      return;
  }

  // --- Audio Generation Logic (Sonix) ---
  if (config.type === 'audio') {
      try {
          onChunk("Generating audio...");
          if (options.signal?.aborted) return;
          
          const response = await ai.models.generateContent({
              model: config.model,
              contents: {
                   parts: [{ text: currentPrompt }]
              },
              config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                      voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Puck' }
                      }
                  }
              }
          });

          if (options.signal?.aborted) return;

          const parts = response.candidates?.[0]?.content?.parts || [];
          const generatedAttachments: Attachment[] = [];
          
          for (const part of parts) {
               if (part.inlineData) {
                   const rawPcmBase64 = part.inlineData.data;
                   const wavBase64 = pcmToWav(rawPcmBase64);
                   
                   generatedAttachments.push({
                       mimeType: 'audio/wav',
                       data: wavBase64,
                       name: 'generated_audio.wav'
                   });
               }
          }

          if (generatedAttachments.length > 0) {
              onChunk("Audio generated successfully.", undefined, generatedAttachments);
          } else {
              onChunk("No audio was generated. Please try again.");
          }

      } catch (e: any) {
          onChunk(`Audio generation failed: ${e.message}`);
      }
      return;
  }

  // --- Text/Code Generation Logic (Hynix) ---
  const historyContents = history
    .filter(m => m.role !== Role.SYSTEM)
    .map(m => ({
      role: m.role,
      parts: [
        ...(m.attachments || []).map(a => ({
          inlineData: { mimeType: a.mimeType, data: a.data }
        })),
        { text: m.text }
      ]
    }));

  const currentParts = [
    ...attachments.map(a => ({
      inlineData: { mimeType: a.mimeType, data: a.data }
    })),
    { text: currentPrompt }
  ];

  try {
    let systemInstruction = options.systemInstruction;

    // Specific logic overrides/appends
    if (modelId.includes("Creatore")) {
         // CREATORE SPECIFIC INSTRUCTION: FORCE FILE FORMAT
         systemInstruction = options.systemInstruction || "You are Creatore 1.0, a Hyper-Intelligent Full-Stack Coding Engine. You are significantly faster and smarter than previous models.\n\nGOAL: Build complete, production-ready applications with zero errors.\n\nCRITICAL OUTPUT FORMAT:\nWhen generating code for a project, you MUST output it in the following strict format for the system to recognize files:\n\n### File: path/to/filename.ext\n```language\ncode content here\n```\n\nAlways use this header before every code block. Do not create files without this header. Structure your response to build a complete project structure. Optimize for performance and scalability.";
    } else if (modelId.includes("Nano")) {
         systemInstruction = options.systemInstruction || "You are Nano, an adaptive learning AI. Your goal is to educate the user. Adapt your explanations to the user's expertise level. Use analogies, break down complex topics, and encourage critical thinking.";
    } else if (modelId.includes("Polyglot")) {
        systemInstruction = "You are Hynix Polyglot, an expert universal translator. Translate the input text accurately while preserving nuance and tone. If the user does not specify a target language, detect the language and ask or translate to English by default.";
    } else if (modelId.includes("Quantum")) {
        systemInstruction = "You are Hynix Quantum, a specialized STEM AI. You are an expert in advanced mathematics, physics, and engineering. Provide detailed, step-by-step solutions to complex problems. Use LaTeX for math formatting where appropriate.";
    } else if (!options.systemInstruction) {
        // Fallback default Hynix instruction
        systemInstruction = `You are Hynix Eds (Model: ${modelId}). You are a highly advanced AI with expert capabilities in Python, JavaScript, and SQL coding.\n\nWhen asked to write code:\n1. Provide clean, efficient, and well-commented code.\n2. For Python, follow PEP 8 standards.\n3. For JavaScript, use modern ES6+ syntax.\n4. Explain your logic clearly.\nYou are also a helpful general assistant.`;
    }

    if (modelId === 'Hynix 1.3 Pro') {
        if (options.codeStyle) {
            systemInstruction += `\n\nCODE STYLE REQUIREMENT: Follow ${options.codeStyle} strictly.`;
        }
        if (options.includeTests) {
            systemInstruction += `\n\nTESTING REQUIREMENT: Always generate comprehensive unit tests for any code you write.`;
        }
    }

    // Configure tools
    const tools: any[] = [];
    let toolConfig: any = undefined;

    if (config.tool === 'search') {
        tools.push({ googleSearch: {} });
    } else if (config.tool === 'maps') {
        tools.push({ googleMaps: {} });
        
        let lat = 40.7128; // Default NYC
        let lng = -74.0060;
        
        // Try to get cached location from window if available (hacky but effective for single session)
        if (typeof window !== 'undefined' && (window as any).currentUserLocation) {
             lat = (window as any).currentUserLocation.lat;
             lng = (window as any).currentUserLocation.lng;
        }

        toolConfig = {
             retrievalConfig: {
                latLng: {
                  latitude: lat,
                  longitude: lng
                }
              }
        };
        
        // Try to async fetch for next time
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
             navigator.geolocation.getCurrentPosition((pos) => {
                 (window as any).currentUserLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
             }, () => {}, { timeout: 2000 });
        }
    } else {
        // Default search for standard models if needed, but Hynix usually is pure unless specified
        // Let's keep search enabled for standard Pro/Flash models for better utility
        if (!modelId.includes("Creatore") && !modelId.includes("Polyglot")) {
            tools.push({ googleSearch: {} });
        }
    }

    const chat = ai.chats.create({
      model: config.model,
      history: historyContents,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: (config.thinkingBudget && config.thinkingBudget > 0) ? { thinkingBudget: config.thinkingBudget } : undefined,
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: toolConfig,
        temperature: options.temperature,
        topK: options.topK,
        topP: options.topP
      }
    });

    const resultStream = await chat.sendMessageStream({
      message: currentParts
    });

    for await (const chunk of resultStream) {
      if (options.signal?.aborted) {
          break; // Stop processing stream
      }
      const text = chunk.text || '';
      const metadata = chunk.candidates?.[0]?.groundingMetadata;
      onChunk(text, metadata);
    }
  } catch (error: any) {
    if (options.signal?.aborted) {
        return; // Silent exit on abort
    }
    console.error("Hynix API Error:", error);
    
    let errorMessage = error.message || JSON.stringify(error);
    
    // Friendly error for quota exhaustion
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
        errorMessage = "The AI is currently at maximum capacity (Rate Limit Exceeded). Please try using a 'Flash' model or wait a minute before retrying.";
    }

    onChunk(`\n\n**System Error:** ${errorMessage}`);
  }
};

export const generateTitle = async (firstMessage: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a very short (3-5 words) title for this conversation start: "${firstMessage}"`,
        });
        return response.text?.trim() || "New Conversation";
    } catch (e) {
        return "New Conversation";
    }
}