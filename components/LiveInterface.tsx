import React, { useEffect, useRef, useState } from 'react';
import { LiveSession } from '../services/liveService';
import { Mic, MicOff, PhoneOff, Zap, Activity } from 'lucide-react';

interface LiveInterfaceProps {
  onClose: () => void;
}

export const LiveInterface: React.FC<LiveInterfaceProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const sessionRef = useRef<LiveSession | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // Initialize Session
    const session = new LiveSession();
    sessionRef.current = session;

    session.onVolumeChange = (vol) => {
        // Smooth volume for visuals
        setVolume(prev => prev * 0.8 + vol * 0.2);
    };

    session.connect(
        { voiceName: 'Kore' }, // Voices: Puck, Charon, Kore, Fenrir, Zephyr
        {
            onOpen: () => setStatus('connected'),
            onError: () => setStatus('error'),
            onClose: () => setStatus('disconnected'),
        }
    );

    return () => {
        session.disconnect();
    };
  }, []);

  // Visualizer Animation
  useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     if (!ctx) return;

     const draw = () => {
         const width = canvas.width;
         const height = canvas.height;
         const centerX = width / 2;
         const centerY = height / 2;

         ctx.clearRect(0, 0, width, height);

         if (status === 'connected') {
             // Main pulsing orb
             const baseRadius = 60;
             const scale = 1 + Math.min(volume * 5, 1.5); // React to volume
             
             // Outer glow
             const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, baseRadius * scale * 2);
             gradient.addColorStop(0, 'rgba(14, 165, 233, 0.8)'); // Hynix 500
             gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.2)');
             gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
             
             ctx.fillStyle = gradient;
             ctx.beginPath();
             ctx.arc(centerX, centerY, baseRadius * scale * 2, 0, Math.PI * 2);
             ctx.fill();

             // Core
             ctx.fillStyle = '#0ea5e9';
             ctx.beginPath();
             ctx.arc(centerX, centerY, baseRadius * (1 + volume), 0, Math.PI * 2);
             ctx.fill();
             
             // Inner white
             ctx.fillStyle = '#fff';
             ctx.beginPath();
             ctx.arc(centerX, centerY, baseRadius * 0.8, 0, Math.PI * 2);
             ctx.fill();

             // Orbiting particles
             const time = Date.now() / 1000;
             for (let i = 0; i < 3; i++) {
                 const angle = time * (1 + i * 0.5) + (i * Math.PI * 2) / 3;
                 const orbitRadius = baseRadius * 2.5 + Math.sin(time * 2 + i) * 10;
                 const px = centerX + Math.cos(angle) * orbitRadius;
                 const py = centerY + Math.sin(angle) * orbitRadius;
                 
                 ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                 ctx.beginPath();
                 ctx.arc(px, py, 4, 0, Math.PI * 2);
                 ctx.fill();
             }
         }

         animationRef.current = requestAnimationFrame(draw);
     };
     
     // Resize handler
     const resize = () => {
         canvas.width = window.innerWidth;
         canvas.height = window.innerHeight;
     }
     window.addEventListener('resize', resize);
     resize();
     draw();

     return () => {
         cancelAnimationFrame(animationRef.current);
         window.removeEventListener('resize', resize);
     };
  }, [status, volume]);

  const toggleMute = () => {
      // In a real implementation we would mute the media stream track
      // For this simplified version we just toggle state
      setIsMuted(!isMuted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-between py-12 text-white animate-slide-up">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                <Activity size={16} className={status === 'connected' ? 'text-green-400' : 'text-gray-400'} />
                <span className="text-sm font-medium tracking-wide uppercase">
                    {status === 'connecting' ? 'Connecting...' : status === 'connected' ? 'Hynix Live' : 'Offline'}
                </span>
            </div>
            {status === 'connected' && (
                <p className="text-white/50 text-sm">Listening...</p>
            )}
        </div>

        {/* Error State */}
        {status === 'error' && (
            <div className="relative z-10 bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-sm text-center backdrop-blur-md">
                <p className="text-red-200 mb-4">Connection Failed</p>
                <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-white text-red-600 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                >
                    Close
                </button>
            </div>
        )}

        {/* Controls */}
        <div className="relative z-10 flex items-center gap-6">
            <button 
                onClick={toggleMute}
                className={`p-6 rounded-full transition-all duration-300 ${isMuted ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
                {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
            
            <button 
                onClick={onClose}
                className="p-8 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-300 shadow-lg shadow-red-500/30 transform hover:scale-105"
            >
                <PhoneOff size={40} fill="currentColor" />
            </button>

            <button className="p-6 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-300">
                <Zap size={32} />
            </button>
        </div>
    </div>
  );
};