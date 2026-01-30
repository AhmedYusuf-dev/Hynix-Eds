import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

// Types
export interface LiveConfig {
  voiceName?: string;
  systemInstruction?: string;
}

// Audio Utils
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class LiveSession {
  private client: GoogleGenAI;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sessionPromise: Promise<any> | null = null;
  private currentSession: any = null;
  private isConnected = false;

  public onVolumeChange: ((volume: number) => void) | null = null;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(config: LiveConfig, callbacks: {
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (err: any) => void;
    onMessage?: (msg: any) => void;
  }) {
    if (this.isConnected) return;

    try {
      // 1. Setup Audio Contexts
      this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 2. Setup Input Stream
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 3. Connect to Live API
      this.sessionPromise = this.client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName || 'Kore' } },
          },
          systemInstruction: config.systemInstruction || "You are Hynix Live, a helpful and friendly AI assistant. Keep responses concise and conversational.",
        },
        callbacks: {
          onopen: () => {
            console.log("Hynix Live Connected");
            this.isConnected = true;
            this.startAudioInput();
            callbacks.onOpen?.();
          },
          onmessage: async (msg: LiveServerMessage) => {
            this.handleServerMessage(msg);
            callbacks.onMessage?.(msg);
          },
          onclose: () => {
            console.log("Hynix Live Closed");
            this.disconnect();
            callbacks.onClose?.();
          },
          onerror: (err) => {
            console.error("Hynix Live Error", err);
            callbacks.onError?.(err);
          },
        },
      });
      
      this.currentSession = await this.sessionPromise;

    } catch (error) {
      console.error("Failed to connect to Live API", error);
      callbacks.onError?.(error);
      this.disconnect();
    }
  }

  private startAudioInput() {
    if (!this.inputContext || !this.stream) return;

    this.inputSource = this.inputContext.createMediaStreamSource(this.stream);
    this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      if (this.onVolumeChange) this.onVolumeChange(rms);

      // Convert to PCM 16-bit
      const pcm16 = floatTo16BitPCM(inputData);
      
      // Send to API
      if (this.currentSession) {
          const base64Data = arrayBufferToBase64(pcm16.buffer);
          this.currentSession.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }
          });
      }
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
  }

  private async handleServerMessage(message: LiveServerMessage) {
    if (!this.outputContext) return;

    // Handle Audio
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        try {
            const audioData = base64ToUint8Array(base64Audio);
            
            // Decode raw PCM 24kHz (Gemini Output)
            // We need to manually convert PCM buffer to AudioBuffer because decodeAudioData expects file headers (WAV/MP3)
            // Gemini sends raw PCM (S16LE)
            const audioBuffer = await this.pcmToAudioBuffer(audioData, this.outputContext);
            
            this.playAudioBuffer(audioBuffer);
        } catch (e) {
            console.error("Error decoding audio", e);
        }
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
       this.nextStartTime = this.outputContext.currentTime; // Reset queue
    }
  }

  private pcmToAudioBuffer(data: Uint8Array, context: AudioContext): AudioBuffer {
      // Data is 16-bit little-endian PCM at 24kHz
      const sampleRate = 24000;
      const numChannels = 1;
      const frameCount = data.length / 2;
      
      const buffer = context.createBuffer(numChannels, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);
      const view = new DataView(data.buffer);
      
      for (let i = 0; i < frameCount; i++) {
          // Normalize 16-bit int to -1.0 -> 1.0 float
          channelData[i] = view.getInt16(i * 2, true) / 32768.0;
      }
      
      return buffer;
  }

  private playAudioBuffer(buffer: AudioBuffer) {
      if (!this.outputContext) return;

      const source = this.outputContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputContext.destination);
      
      // Scheduling
      const currentTime = this.outputContext.currentTime;
      if (this.nextStartTime < currentTime) {
          this.nextStartTime = currentTime;
      }
      
      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;
  }

  disconnect() {
    this.isConnected = false;
    this.currentSession = null;
    this.sessionPromise = null;

    if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
    }
    if (this.inputSource) {
        this.inputSource.disconnect();
        this.inputSource = null;
    }
    if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
    }
    if (this.inputContext) {
        this.inputContext.close();
        this.inputContext = null;
    }
    if (this.outputContext) {
        this.outputContext.close();
        this.outputContext = null;
    }
  }
}