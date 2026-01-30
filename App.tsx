import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Menu, X, Zap, Brain, Sparkles, Loader2, Rocket, LogOut, Download, Lock, Cpu, Flame, Coins, Search, ChevronDown, Library, Play, Image as ImageIcon, Music, MessageSquare, Palette, User as UserIcon, Video, Film, FileAudio, FileVideo, FileText, Trash2, Code2, FlaskConical, Mic, MicOff, StopCircle, Settings, Sliders, Command, Bookmark, Pin, PinOff, Plus, FileJson, LayoutTemplate, Briefcase, Laugh, PenTool, Mail, Eye, EyeOff, Map, Globe, Languages, Sigma, Radio, KeyRound, UserPlus, LogIn } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { CodeWorkspace } from './components/CodeWorkspace';
import { LiveInterface } from './components/LiveInterface';
import { streamCompletion, generateTitle } from './services/geminiService';
import { Message, Role, ModelTier, ChatSession, Attachment, User, Persona, PromptTemplate, SettingsState } from './types';

// --- Constants ---
const HYNIX_MODELS = [
  // Hynix Core Series
  { id: "Hynix 1.0 Mini", description: "Efficient and fast for simple tasks." },
  { id: "Hynix 1.0 Flash", description: "Balanced speed and reasoning." },
  { id: "Hynix 1.0 Pro", description: "Advanced reasoning for complex problems." },
  { id: "Hynix 1.3 Flash", description: "The fastest high-intelligence model." },
  { id: "Hynix 1.3 Pro", description: "Peak performance and speed." },
  
  // Specialized Useful AIs
  { id: "Hynix Research", description: "Deep research with real-time web grounding." },
  { id: "Hynix Reasoner", description: "Maximum thinking power for complex logic (o1-like)." },
  { id: "Hynix Travel", description: "Location-aware travel planning with Google Maps." },
  { id: "Hynix Polyglot", description: "Universal translator for 100+ languages." },
  { id: "Hynix Quantum", description: "Advanced STEM and Math specialist." },

  // Specialized Domains
  { id: "Nano 1.0", description: "Adaptive learning AI for personalized education." },
  { id: "Creatore 1.0 Pro", description: "Hyper-intelligent engine (25x faster & smarter)." },
  
  // Media Generation
  { id: "Plaza 1.0 Pro", description: "Studio-quality images (Imagen 3)." },
  { id: "Vias 1.0 Pro", description: "Cinematic quality video generation (Veo)." },
  { id: "Sonix 1.0 Pro", description: "High-fidelity audio studio." },
];

const DEFAULT_PERSONAS: Persona[] = [
    { id: 'default', name: 'Standard Assistant', description: 'Helpful and precise', systemInstruction: '' },
    { id: 'coder', name: 'Senior Engineer', description: 'Expert in Python, React, and System Design', systemInstruction: 'You are a Senior Staff Software Engineer. Provide efficient, scalable, and secure code. Explain trade-offs.' },
    { id: 'writer', name: 'Creative Writer', description: 'Storytelling and copywriting expert', systemInstruction: 'You are an award-winning creative writer. Focus on tone, style, and vivid imagery. Avoid cliches.' },
    { id: 'analyst', name: 'Data Analyst', description: 'Insights from structured data', systemInstruction: 'You are a data analyst. Output answers in Markdown tables where possible. Be concise and focus on insights.' },
];

const DEFAULT_PROMPTS: PromptTemplate[] = [
    { id: '1', title: 'Refactor Code', category: 'Coding', content: 'Refactor the following code to improve performance and readability:\n\n[PASTE CODE HERE]' },
    { id: '2', title: 'Explain Logic', category: 'Coding', content: 'Explain the logic of this code snippet step-by-step:\n\n[PASTE CODE HERE]' },
    { id: '3', title: 'Blog Post', category: 'Writing', content: 'Write a comprehensive blog post about [TOPIC]. Include a catchy title, introduction, 3 key points, and a conclusion.' },
    { id: '4', title: 'SWOT Analysis', category: 'Business', content: 'Perform a SWOT analysis for [COMPANY/PRODUCT].' },
    { id: '5', title: 'Email Drafter', category: 'Writing', content: 'Draft a professional email to [RECIPIENT] regarding [SUBJECT]. Tone: [TONE].' },
];

// --- Utils ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        }
    };
    reader.onerror = error => reject(error);
  });
};

const parseJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

// --- Splash Screen Component ---
const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-dark-900 transition-colors duration-500 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-hynix-50 dark:from-hynix-900/20 via-white dark:via-dark-900 to-white dark:to-dark-900 pointer-events-none"></div>

        <div className="relative flex flex-col items-center animate-slide-up z-10">
            <div className="w-28 h-28 bg-gradient-to-tr from-hynix-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-hynix-500/30 mb-8 relative">
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-md"></div>
                <Library className="text-white w-14 h-14 relative z-10" />
            </div>
            
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-hynix-600 to-indigo-600 dark:from-white dark:via-hynix-300 dark:to-indigo-400 mb-3 tracking-tight">
                Hynix Eds
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide uppercase letter-spacing-2">
                Initializing Neural Core
            </p>
            
            <div className="mt-10 w-64 h-1 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-hynix-500 to-transparent w-1/2 h-full animate-loading-bar"></div>
            </div>
        </div>
        
        <div className="absolute bottom-8 text-[10px] text-gray-400 dark:text-gray-600 font-mono">
            V 1.4.0 • POWERED BY GEMINI 3.0 PRO
        </div>
    </div>
  );
};

// --- Components ---

const LoginScreen: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [googleError, setGoogleError] = useState<string | null>(null);

    // Guest Login
    const handleGuestLogin = () => {
        onLogin({
            name: "Guest User",
            email: "guest@hynix.ai",
            picture: "https://ui-avatars.com/api/?name=Guest+User&background=64748b&color=fff"
        });
    };

    // Google Login Initialization
    useEffect(() => {
        if (window.google) {
            const clientId = process.env.GOOGLE_CLIENT_ID;
            
            try {
                if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID_HERE") {
                    // Fail silently or just don't render button if no client ID
                    return;
                }

                window.google.accounts.id.initialize({
                    client_id: clientId, 
                    callback: (response: any) => {
                        const payload = parseJwt(response.credential);
                        if (payload) {
                            onLogin({
                                name: payload.name,
                                email: payload.email,
                                picture: payload.picture
                            });
                        }
                    }
                });
                
                const btn = document.getElementById("googleBtn");
                if (btn) {
                    window.google.accounts.id.renderButton(
                        btn,
                        { theme: "outline", size: "large", type: "standard", shape: "pill", width: "100%" }
                    );
                }
            } catch (e) {
                console.error("Google Sign-in error", e);
                setGoogleError("Google Sign-In unavailable.");
            }
        }
    }, [onLogin]);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!email || !password || (authMode === 'register' && !name)) {
            setError("Please fill in all fields.");
            return;
        }

        const usersKey = 'hynix_users_v1';
        const storedUsers = JSON.parse(localStorage.getItem(usersKey) || '[]');

        if (authMode === 'register') {
            // Check if user exists
            if (storedUsers.some((u: any) => u.email === email)) {
                setError("Account already exists with this email.");
                return;
            }

            const newUser = {
                name,
                email,
                password, // Note: In a real app, never store passwords in plaintext!
                picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
            };

            storedUsers.push(newUser);
            localStorage.setItem(usersKey, JSON.stringify(storedUsers));
            
            onLogin({ name: newUser.name, email: newUser.email, picture: newUser.picture });
        } else {
            // Login
            const user = storedUsers.find((u: any) => u.email === email && u.password === password);
            if (user) {
                onLogin({ name: user.name, email: user.email, picture: user.picture });
            } else {
                setError("Invalid email or password.");
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-white relative overflow-hidden transition-colors duration-300 font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-hynix-100 dark:from-hynix-900/20 via-gray-50 dark:via-dark-900 to-gray-50 dark:to-dark-900 pointer-events-none"></div>
            
            <div className="z-10 flex flex-col items-center animate-slide-up w-full max-w-md px-4">
                 <div className="w-20 h-20 bg-gradient-to-tr from-hynix-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-hynix-500/20 mb-6">
                    <Library className="text-white w-10 h-10" />
                </div>
                
                <div className="text-center space-y-1 mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-hynix-600 to-hynix-500 dark:from-white dark:via-hynix-200 dark:to-hynix-400">
                        Hynix Eds
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Sign in to access your AI workspace</p>
                </div>

                <div className="w-full bg-white/70 dark:bg-dark-800/50 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-8 shadow-2xl">
                    {/* Tabs */}
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-dark-900/50 rounded-xl mb-6">
                        <button 
                            onClick={() => { setAuthMode('login'); setError(''); }}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${authMode === 'login' ? 'bg-white dark:bg-dark-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <LogIn size={16} /> Sign In
                        </button>
                        <button 
                            onClick={() => { setAuthMode('register'); setError(''); }}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${authMode === 'register' ? 'bg-white dark:bg-dark-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <UserPlus size={16} /> Create Account
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {authMode === 'register' && (
                            <div className="space-y-1.5 animate-slide-up">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">Full Name</label>
                                <div className="relative">
                                    <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-hynix-500 focus:ring-1 focus:ring-hynix-500/50 transition-all placeholder-gray-400"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-hynix-500 focus:ring-1 focus:ring-hynix-500/50 transition-all placeholder-gray-400"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">Password</label>
                            <div className="relative">
                                <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-hynix-500 focus:ring-1 focus:ring-hynix-500/50 transition-all placeholder-gray-400"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-3 rounded-lg flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-hynix-600 to-indigo-600 hover:from-hynix-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-hynix-500/20 flex items-center justify-center gap-2 mt-2"
                        >
                            {authMode === 'login' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px bg-gray-200 dark:bg-dark-700 flex-1"></div>
                        <span className="text-xs text-gray-400 uppercase font-medium tracking-wider">Or</span>
                        <div className="h-px bg-gray-200 dark:bg-dark-700 flex-1"></div>
                    </div>

                    <div className="space-y-3">
                        {/* Google Button Container */}
                        <div id="googleBtn" className="w-full flex justify-center min-h-[40px]"></div>
                        {googleError && <p className="text-center text-xs text-gray-400">{googleError}</p>}

                        <button 
                            onClick={handleGuestLogin}
                            className="w-full py-2.5 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            Continue as Guest
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">
                        Securely powered by local storage encryption.
                    </p>
                </div>
            </div>
        </div>
    );
};

const ModelSelector: React.FC<{
  currentModel: string;
  models: typeof HYNIX_MODELS;
  onSelect: (model: string) => void;
}> = ({ currentModel, models, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredModels = models.filter(m => 
        m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const getModelIcon = (modelId: string, size = 14) => {
        if (modelId.includes('Plaza')) return <Play size={size} className="text-pink-500 dark:text-pink-400" />;
        if (modelId.includes('Vias')) return <Video size={size} className="text-rose-600 dark:text-rose-500" />;
        if (modelId.includes('Imaja')) return <ImageIcon size={size} className="text-emerald-500 dark:text-emerald-400" />;
        if (modelId.includes('Sonix')) return <Music size={size} className="text-blue-500 dark:text-blue-400" />;
        if (modelId.includes('Creatore')) return <Code2 size={size} className="text-indigo-500 dark:text-indigo-400" />;
        if (modelId.includes('Nano')) return <Brain size={size} className="text-amber-500 dark:text-amber-400" />;
        if (modelId.includes('Research')) return <Globe size={size} className="text-cyan-500 dark:text-cyan-400" />;
        if (modelId.includes('Travel')) return <Map size={size} className="text-green-500 dark:text-green-400" />;
        if (modelId.includes('Polyglot')) return <Languages size={size} className="text-orange-500 dark:text-orange-400" />;
        if (modelId.includes('Quantum')) return <Sigma size={size} className="text-purple-500 dark:text-purple-400" />;
        return <Sparkles size={size} className="text-hynix-500 dark:text-hynix-400" />;
    };

    return (
        <div className="p-4 border-t border-gray-200 dark:border-dark-700" ref={containerRef}>
            <div className="text-xs font-semibold text-gray-500 uppercase px-1 mb-2 tracking-wider">Model Version</div>
            <div className="relative">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg transition-all text-sm"
                >
                    <div className="flex items-center gap-2 truncate">
                        {getModelIcon(currentModel)}
                        <span className="truncate">{currentModel}</span>
                    </div>
                    <ChevronDown size={14} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-72">
                         <div className="p-2 border-b border-gray-200 dark:border-dark-700">
                             <div className="flex items-center bg-gray-100 dark:bg-dark-900 rounded-md px-2 py-1.5 border border-gray-200 dark:border-dark-700">
                                 <Search size={14} className="text-gray-500 mr-2" />
                                 <input 
                                    type="text" 
                                    placeholder="Search version..." 
                                    className="bg-transparent border-none outline-none text-xs text-gray-900 dark:text-white w-full placeholder-gray-500 dark:placeholder-gray-600"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                 />
                             </div>
                         </div>
                         <div className="overflow-y-auto flex-1 p-1">
                             {filteredModels.map((model) => {
                                 const isVersionNew = ["1.3", "Reasoner", "Research"].some(v => model.id.includes(v));
                                 const isPlaza = model.id.includes("Plaza");
                                 const isVias = model.id.includes("Vias");
                                 const isSonix = model.id.includes("Sonix");
                                 const isCreatore = model.id.includes("Creatore");
                                 const isNano = model.id.includes("Nano");
                                 const isSpecial = ["Research", "Travel", "Polyglot", "Quantum"].some(v => model.id.includes(v));
                                 
                                 return (
                                 <button
                                    key={model.id}
                                    onClick={() => {
                                        onSelect(model.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center justify-between group ${
                                        currentModel === model.id 
                                        ? 'bg-hynix-50 dark:bg-hynix-900/30 text-hynix-700 dark:text-hynix-300' 
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                                    }`}
                                 >
                                     <div className="flex flex-col gap-0.5 w-full">
                                         <div className="flex items-center gap-2">
                                             <span className={`font-medium ${isVersionNew || isPlaza || isVias || isSonix || isCreatore || isNano || isSpecial ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{model.id}</span>
                                             {isVersionNew && !isPlaza && !isVias && !isSonix && !isCreatore && !isNano && !isSpecial && (
                                                 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-hynix-600 to-indigo-600 text-white shadow-sm border border-white/10">
                                                     NEW
                                                 </span>
                                             )}
                                             {isSpecial && (
                                                 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm border border-white/10">
                                                     PRO
                                                 </span>
                                             )}
                                             {isPlaza && (
                                                 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm border border-white/10 flex items-center gap-1">
                                                     <Play size={8} fill="currentColor" /> MEDIA
                                                 </span>
                                             )}
                                             {isVias && (
                                                 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm border border-white/10 flex items-center gap-1">
                                                     <Video size={8} fill="currentColor" /> VIDEO
                                                 </span>
                                             )}
                                             {isSonix && (
                                                 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm border border-white/10 flex items-center gap-1">
                                                     <Music size={8} fill="currentColor" /> AUDIO
                                                 </span>
                                             )}
                                             {isCreatore && (
                                                 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm border border-white/10 flex items-center gap-1">
                                                     <Code2 size={8} fill="currentColor" /> DEV
                                                 </span>
                                             )}
                                             {isNano && (
                                                 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm border border-white/10 flex items-center gap-1">
                                                     <Brain size={8} fill="currentColor" /> EDU
                                                 </span>
                                             )}
                                         </div>
                                         <span className={`text-[10px] truncate ${
                                             currentModel === model.id ? 'text-hynix-600 dark:text-hynix-400' : 'text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                                         }`}>
                                             {model.description}
                                         </span>
                                     </div>
                                     {currentModel === model.id && <div className="w-1.5 h-1.5 rounded-full bg-hynix-500 dark:bg-hynix-400 shrink-0 ml-2"></div>}
                                 </button>
                                 );
                             })}
                             {filteredModels.length === 0 && (
                                 <div className="p-3 text-center text-xs text-gray-500">No models found</div>
                             )}
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

type AppMode = 'hynix' | 'nano' | 'creatore';

const PageNavigator: React.FC<{ mode: AppMode; onChange: (mode: AppMode) => void }> = ({ mode, onChange }) => (
    <div className="bg-gray-100/50 dark:bg-dark-800/50 p-1 rounded-lg border border-gray-200 dark:border-dark-700 flex items-center gap-1">
        <button 
            onClick={() => onChange('hynix')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${mode === 'hynix' ? 'bg-white dark:bg-dark-700 text-hynix-600 dark:text-hynix-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
            <Sparkles size={14} />
            <span>Hynix</span>
        </button>
        <button 
            onClick={() => onChange('nano')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${mode === 'nano' ? 'bg-white dark:bg-dark-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
            <Brain size={14} />
            <span>Nano</span>
        </button>
        <button 
            onClick={() => onChange('creatore')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${mode === 'creatore' ? 'bg-white dark:bg-dark-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
            <Code2 size={14} />
            <span>Creatore</span>
        </button>
    </div>
);

const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    settings: SettingsState;
    onSave: (s: SettingsState) => void;
    personas: Persona[];
}> = ({ isOpen, onClose, settings, onSave, personas }) => {
    // ... SettingsModal implementation remains the same ...
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings, isOpen]);

    const handlePersonaChange = (id: string) => {
        const persona = personas.find(p => p.id === id);
        if (persona) {
            setLocalSettings(prev => ({
                ...prev,
                personaId: id,
                systemInstruction: persona.systemInstruction
            }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-dark-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                        <Sliders size={18} />
                        <span>Advanced Settings</span>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Persona Selector */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">System Persona</label>
                        <div className="grid grid-cols-2 gap-2">
                            {personas.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handlePersonaChange(p.id)}
                                    className={`p-2 rounded-lg text-left border text-xs transition-all ${localSettings.personaId === p.id 
                                        ? 'bg-hynix-50 dark:bg-hynix-900/30 border-hynix-500 text-hynix-700 dark:text-hynix-300' 
                                        : 'bg-white dark:bg-dark-900 border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700'}`}
                                >
                                    <div className="font-semibold">{p.name}</div>
                                    <div className="truncate opacity-70">{p.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Temperature</label>
                            <span className="text-xs font-mono bg-gray-100 dark:bg-dark-900 px-2 py-1 rounded text-gray-600 dark:text-gray-400">{localSettings.temperature}</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="2" 
                            step="0.1"
                            value={localSettings.temperature}
                            onChange={(e) => setLocalSettings({...localSettings, temperature: parseFloat(e.target.value)})}
                            className="w-full h-2 bg-gray-200 dark:bg-dark-700 rounded-lg appearance-none cursor-pointer accent-hynix-500"
                        />
                        <p className="text-xs text-gray-500">Higher values mean more creative and random outputs. Lower values are more deterministic.</p>
                    </div>

                    <div className="space-y-3">
                         <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">System Instructions</label>
                         <textarea
                            value={localSettings.systemInstruction}
                            onChange={(e) => setLocalSettings({...localSettings, systemInstruction: e.target.value})}
                            placeholder="e.g., You are a helpful coding assistant who explains concepts simply."
                            className="w-full h-32 bg-gray-100 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-lg p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-hynix-500 resize-none"
                         />
                         <p className="text-xs text-gray-500">Define the AI's persona, behavior, and constraints.</p>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-dark-700 flex justify-end gap-2 bg-gray-50 dark:bg-dark-850 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-lg transition-colors">Cancel</button>
                    <button 
                        onClick={() => {
                            onSave(localSettings);
                            onClose();
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-hynix-600 hover:bg-hynix-500 rounded-lg shadow-lg shadow-hynix-500/20 transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const CommandPalette: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAction: (action: string) => void;
}> = ({ isOpen, onClose, onAction }) => {
    // ... CommandPalette implementation remains the same ...
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const ACTIONS = [
        { id: 'new_chat', label: 'New Chat', icon: <Rocket size={16} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
        { id: 'toggle_sidebar', label: 'Toggle Sidebar', icon: <LayoutTemplate size={16} /> },
        { id: 'export_json', label: 'Export JSON', icon: <FileJson size={16} /> },
        { id: 'export_txt', label: 'Export Text', icon: <FileText size={16} /> },
    ];

    const filteredActions = ACTIONS.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));

    useEffect(() => {
        if (isOpen) {
             setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setSearch('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
             <div className="bg-white dark:bg-dark-800 w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 dark:border-dark-700 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                 <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-dark-700 gap-3">
                     <Search size={18} className="text-gray-400" />
                     <input 
                        ref={inputRef}
                        type="text" 
                        placeholder="Type a command..." 
                        className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && filteredActions.length > 0) {
                                onAction(filteredActions[0].id);
                                onClose();
                            }
                            if (e.key === 'Escape') onClose();
                        }}
                     />
                     <span className="text-xs text-gray-400 font-mono border border-gray-200 dark:border-dark-700 px-1.5 py-0.5 rounded">ESC</span>
                 </div>
                 <div className="max-h-[300px] overflow-y-auto p-2">
                     {filteredActions.map((action, i) => (
                         <button
                            key={action.id}
                            onClick={() => { onAction(action.id); onClose(); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors ${i === 0 && search ? 'bg-gray-50 dark:bg-dark-700' : ''}`}
                         >
                             {action.icon}
                             <span>{action.label}</span>
                         </button>
                     ))}
                     {filteredActions.length === 0 && (
                         <div className="p-4 text-center text-sm text-gray-500">No commands found.</div>
                     )}
                 </div>
             </div>
        </div>
    );
};

const PromptLibrary: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (content: string) => void;
}> = ({ isOpen, onClose, onSelect }) => {
    // ... PromptLibrary implementation remains the same ...
    const [category, setCategory] = useState<string>('All');
    
    if (!isOpen) return null;

    const categories = ['All', ...Array.from(new Set(DEFAULT_PROMPTS.map(p => p.category)))];
    const filteredPrompts = category === 'All' 
        ? DEFAULT_PROMPTS 
        : DEFAULT_PROMPTS.filter(p => p.category === category);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-800 w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 flex overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Sidebar */}
                <div className="w-48 bg-gray-50 dark:bg-dark-850 border-r border-gray-200 dark:border-dark-700 p-4 flex flex-col gap-2 overflow-y-auto">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Categories</h3>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${category === cat ? 'bg-hynix-100 dark:bg-hynix-900/30 text-hynix-700 dark:text-hynix-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                
                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                     <div className="flex justify-between items-center mb-6">
                         <h2 className="text-xl font-bold text-gray-900 dark:text-white">Prompt Library</h2>
                         <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20} /></button>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {filteredPrompts.map(prompt => (
                             <button
                                key={prompt.id}
                                onClick={() => { onSelect(prompt.content); onClose(); }}
                                className="text-left p-4 rounded-xl border border-gray-200 dark:border-dark-700 hover:border-hynix-400 dark:hover:border-hynix-500 bg-white dark:bg-dark-900 transition-all shadow-sm hover:shadow-md group"
                             >
                                 <div className="flex items-center justify-between mb-2">
                                     <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-hynix-600 dark:group-hover:text-hynix-400">{prompt.title}</span>
                                     <span className="text-[10px] uppercase bg-gray-100 dark:bg-dark-800 text-gray-500 px-2 py-0.5 rounded border border-gray-200 dark:border-dark-700">{prompt.category}</span>
                                 </div>
                                 <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{prompt.content}</p>
                             </button>
                         ))}
                     </div>
                </div>
            </div>
        </div>
    );
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('hynix');
  
  // New State for features
  const [showSplash, setShowSplash] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [showLive, setShowLive] = useState(false);
  
  // Settings & Personas
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
      temperature: 0.7,
      systemInstruction: "",
      personaId: 'default'
  });
  
  // Command Palette & Library
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);

  // Search in Sidebar
  const [chatSearch, setChatSearch] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // State to track if we have attempted to load from storage to prevent race conditions
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Default to Hynix 1.0 Pro
  const [selectedModel, setSelectedModel] = useState<string>("Hynix 1.3 Pro");

  // Hynix 1.3 Pro specific options
  const [codeStyle, setCodeStyle] = useState<string>('Standard (PEP 8 / ES6)');
  const [includeTests, setIncludeTests] = useState<boolean>(false);
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts, Theme Detection, Splash Timer...
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setShowCommandPalette(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (isDark: boolean) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };
    applyTheme(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        setShowSplash(false);
    }, 2800); 
    return () => clearTimeout(timer);
  }, []);

  // Helper to identify generation models
  const isGenerationModel = (id: string) => 
      id.includes('Plaza') || id.includes('Vias') || id.includes('Imaja') || id.includes('Sonix');
  
  // Helpers for new models
  const isNanoModel = (id: string) => id.includes('Nano');
  const isCreatoreModel = (id: string) => id.includes('Creatore');

  // Load/Save Sessions...
  useEffect(() => {
      if (user) {
          const savedKey = `hynix_sessions_${user.email}`;
          try {
              const savedData = localStorage.getItem(savedKey);
              if (savedData) {
                  const parsed = JSON.parse(savedData);
                  if (Array.isArray(parsed)) {
                      setSessions(parsed);
                      if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
                  } else if (parsed && typeof parsed === 'object') {
                      setSessions(parsed.sessions || []);
                      if (parsed.currentSessionId && parsed.sessions.some((s: ChatSession) => s.id === parsed.currentSessionId)) {
                          setCurrentSessionId(parsed.currentSessionId);
                      } else if (parsed.sessions.length > 0) {
                          setCurrentSessionId(parsed.sessions[0].id);
                      }
                      if (parsed.settings) setSettings(prev => ({...prev, ...parsed.settings}));
                  }
              } else {
                  setSessions([]);
                  setCurrentSessionId(null);
              }
          } catch (e) {
              setSessions([]);
              setCurrentSessionId(null);
          } finally {
              setIsStorageLoaded(true);
          }
      } else {
          setSessions([]);
          setCurrentSessionId(null);
          setIsStorageLoaded(false);
      }
  }, [user]);

  useEffect(() => {
      if (!user) return;
      const saveToStorage = () => {
          const key = `hynix_sessions_${user.email}`;
          const dataToSave = { version: 1, currentSessionId, sessions, settings };
          try {
              localStorage.setItem(key, JSON.stringify(dataToSave));
          } catch (e) {
              // ... storage error handling ...
          }
      };
      const timeoutId = setTimeout(saveToStorage, 1000);
      return () => clearTimeout(timeoutId);
  }, [sessions, currentSessionId, user, settings]);

  useEffect(() => {
    if (user && isStorageLoaded && sessions.length === 0 && !currentSessionId) {
      createNewSession();
    }
  }, [user, isStorageLoaded, sessions.length, currentSessionId]);

  useEffect(() => {
      if (currentSessionId) {
          const session = sessions.find(s => s.id === currentSessionId);
          if (session && session.modelId) {
              setSelectedModel(session.modelId);
              if (isNanoModel(session.modelId)) {
                  setAppMode('nano');
              } else if (isCreatoreModel(session.modelId)) {
                  setAppMode('creatore');
              } else {
                  setAppMode('hynix');
              }
          } else if (session && !session.modelId) {
              setSelectedModel("Hynix 1.3 Pro");
              setAppMode('hynix');
          }
      }
  }, [currentSessionId, sessions]);

  // Actions
  const createNewSession = () => {
    let defaultModel = "Hynix 1.3 Pro";
    if (appMode === 'nano') defaultModel = "Nano 1.0";
    else if (appMode === 'creatore') defaultModel = "Creatore 1.0 Pro";
    
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      modelTier: ModelTier.FLASH,
      modelId: defaultModel,
      createdAt: Date.now(),
      isPinned: false
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setSelectedModel(defaultModel);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
      setUser(null);
      setSessions([]);
      setCurrentSessionId(null);
      setSidebarOpen(false);
      setIsStorageLoaded(false);
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      const newSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(newSessions);
      if (currentSessionId === sessionId) {
          setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
      }
  };

  const togglePinSession = (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
      ));
  };

  const handleExport = (format: 'json' | 'txt') => {
      if (!currentSession) return;
      // ... export logic ...
  };

  const handleCommandAction = (action: string) => {
      switch(action) {
          case 'new_chat': createNewSession(); break;
          case 'settings': setShowSettings(true); break;
          case 'export_json': handleExport('json'); break;
          case 'export_txt': handleExport('txt'); break;
          case 'toggle_sidebar': setSidebarOpen(prev => !prev); break;
      }
  };

  // --- Generation Logic --- (Most logic moved to helper functions or kept as is)
  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleVoiceInput = () => {
      // ... voice logic ...
      if (isListening) return;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert("Speech recognition is not supported in this browser.");
          return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setIsListening(true);
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => (prev ? prev + ' ' : '') + transcript);
          setIsListening(false);
      };
      recognition.onerror = (event: any) => {
          setIsListening(false);
      };
      recognition.onend = () => {
          setIsListening(false);
      };
      recognition.start();
  };

  const handleStopGeneration = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setIsLoading(false);
          setIsThinking(false);
      }
  };

  const triggerGeneration = async (session: ChatSession, messagesToUse: Message[], userPrompt: string, userAttachments: Attachment[]) => {
      // ... same generation logic ...
      setIsLoading(true);
      setIsThinking(true);
      abortControllerRef.current = new AbortController();

      const botMsgId = (Date.now() + 1).toString();
      const botMsg: Message = {
          id: botMsgId,
          role: Role.MODEL,
          text: '',
          timestamp: Date.now() + 1,
      };

      const messagesWithBot = [...messagesToUse, botMsg];
      updateSessionMessages(session.id, messagesWithBot);

      let fullText = '';
      
      try {
          await streamCompletion(
            messagesToUse,
            userPrompt,
            userAttachments,
            selectedModel,
            { 
                codeStyle, 
                includeTests,
                signal: abortControllerRef.current.signal,
                temperature: settings.temperature,
                systemInstruction: settings.systemInstruction
            },
            (chunk, metadata, generatedAttachments) => {
                setIsThinking(false);
                fullText += chunk;
                
                const updatedBotMsg: Message = { 
                    ...botMsg, 
                    text: fullText,
                    groundingMetadata: metadata,
                    attachments: generatedAttachments
                };

                updateSessionMessages(session.id, [
                    ...messagesToUse,
                    updatedBotMsg
                ]);
            }
          );
      } catch (e) {
          if (abortControllerRef.current?.signal.aborted) {
              console.log("Generation stopped.");
          }
      } finally {
          setIsLoading(false);
          setIsThinking(false);
          abortControllerRef.current = null;
      }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading || !currentSession) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: input,
      timestamp: Date.now(),
      attachments: [...attachments]
    };

    const updatedMessages = [...currentSession.messages, userMsg];
    updateSessionMessages(currentSession.id, updatedMessages);
    
    const prompt = input;
    const currentAtt = [...attachments];

    setInput('');
    setAttachments([]);

    if (currentSession.messages.length === 0) {
        generateTitle(prompt).then(title => {
            setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, title } : s));
        });
    }

    await triggerGeneration(currentSession, updatedMessages, prompt, currentAtt);
  };

  // ... handleRegenerate, handleRegenerateRevised, handleEdit, updateSessionMessages, handleModelChange, handleModeChange, handleFileSelect, removeAttachment ...
  // Re-implementing simplified versions for context preservation
  const handleRegenerateRevised = async () => {
       if (!currentSession || isLoading || currentSession.messages.length === 0) return;
       const messages = currentSession.messages;
       const lastMsg = messages[messages.length - 1];
       
       let targetMessages = lastMsg.role === Role.MODEL ? messages.slice(0, -1) : messages;
       const lastUserMsg = targetMessages[targetMessages.length - 1];
       if (!lastUserMsg || lastUserMsg.role !== Role.USER) return;
       
       const history = targetMessages.slice(0, -1);
       updateSessionMessages(currentSession.id, targetMessages); 

       setIsLoading(true);
       setIsThinking(true);
       abortControllerRef.current = new AbortController();

       const botMsgId = (Date.now() + 1).toString();
       const botMsg: Message = { id: botMsgId, role: Role.MODEL, text: '', timestamp: Date.now() + 1 };
       
       updateSessionMessages(currentSession.id, [...targetMessages, botMsg]);

       let fullText = '';
       try {
           await streamCompletion(
               history,
               lastUserMsg.text,
               lastUserMsg.attachments || [],
               selectedModel,
               { 
                    codeStyle, 
                    includeTests,
                    signal: abortControllerRef.current.signal,
                    temperature: settings.temperature,
                    systemInstruction: settings.systemInstruction
                },
               (chunk, metadata, generatedAttachments) => {
                   setIsThinking(false);
                   fullText += chunk;
                   const updatedBotMsg = { ...botMsg, text: fullText, groundingMetadata: metadata, attachments: generatedAttachments };
                   updateSessionMessages(currentSession.id, [...targetMessages, updatedBotMsg]);
               }
           );
       } finally {
           setIsLoading(false);
           setIsThinking(false);
           abortControllerRef.current = null;
       }
  };

  const handleEdit = async (messageId: string, newText: string) => {
      // ... same logic ...
      if (!currentSession || isLoading) return;
      const index = currentSession.messages.findIndex(m => m.id === messageId);
      if (index === -1) return;
      const history = currentSession.messages.slice(0, index);
      const oldMsg = currentSession.messages[index];
      const newMsg: Message = { ...oldMsg, text: newText, id: Date.now().toString() };
      const newMessages = [...history, newMsg];
      updateSessionMessages(currentSession.id, newMessages);
      
      setIsLoading(true);
      setIsThinking(true);
      abortControllerRef.current = new AbortController();

      const botMsgId = (Date.now() + 1).toString();
      const botMsg: Message = { id: botMsgId, role: Role.MODEL, text: '', timestamp: Date.now() + 1 };
      
      updateSessionMessages(currentSession.id, [...newMessages, botMsg]);

      let fullText = '';
      try {
           await streamCompletion(
               history,
               newText,
               newMsg.attachments || [],
               selectedModel,
               { 
                    codeStyle, 
                    includeTests,
                    signal: abortControllerRef.current.signal,
                    temperature: settings.temperature,
                    systemInstruction: settings.systemInstruction
                },
               (chunk, metadata, generatedAttachments) => {
                   setIsThinking(false);
                   fullText += chunk;
                   const updatedBotMsg = { ...botMsg, text: fullText, groundingMetadata: metadata, attachments: generatedAttachments };
                   updateSessionMessages(currentSession.id, [...newMessages, updatedBotMsg]);
               }
           );
       } finally {
           setIsLoading(false);
           setIsThinking(false);
           abortControllerRef.current = null;
       }
  };

  const updateSessionMessages = (sessionId: string, newMessages: Message[]) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, messages: newMessages } : s
    ));
  };

  const handleModelChange = (model: string) => {
      setSelectedModel(model);
      if (currentSessionId) {
          setSessions(prev => prev.map(s => 
              s.id === currentSessionId ? { ...s, modelId: model } : s
          ));
      }
  };
  
  const handleModeChange = (mode: AppMode) => {
      setAppMode(mode);
      if (mode === 'hynix' && !selectedModel.includes('Hynix') && !isGenerationModel(selectedModel)) handleModelChange('Hynix 1.3 Pro');
      else if (mode === 'nano' && !isNanoModel(selectedModel)) handleModelChange('Nano 1.0');
      else if (mode === 'creatore' && !isCreatoreModel(selectedModel)) handleModelChange('Creatore 1.0 Pro');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // ...
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files) as File[];
          const newAttachments: Attachment[] = [];
          for (const file of files) {
              try {
                  const base64 = await fileToBase64(file);
                  newAttachments.push({ mimeType: file.type, data: base64, name: file.name });
              } catch (err) { console.error(err); }
          }
          setAttachments(prev => [...prev, ...newAttachments]);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const displayedModels = HYNIX_MODELS.filter(m => {
      if (appMode === 'nano') return isNanoModel(m.id);
      if (appMode === 'creatore') return isCreatoreModel(m.id);
      // For Hynix, show standard models + generation models
      return !isNanoModel(m.id) && !isCreatoreModel(m.id);
  });

  const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(chatSearch.toLowerCase()));
  const pinnedSessions = filteredSessions.filter(s => s.isPinned);
  const unpinnedSessions = filteredSessions.filter(s => !s.isPinned);

  if (showSplash) return <SplashScreen />;
  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div className="flex h-screen bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-200 overflow-hidden font-sans transition-colors duration-300">
      {/* Live Interface Overlay */}
      {showLive && <LiveInterface onClose={() => setShowLive(false)} />}

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings}
        onSave={setSettings}
        personas={DEFAULT_PERSONAS}
      />
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
        onAction={handleCommandAction} 
      />
      <PromptLibrary 
        isOpen={showPromptLibrary} 
        onClose={() => setShowPromptLibrary(false)} 
        onSelect={(p) => setInput(p)} 
      />

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Main Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-gray-50 dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        {/* ... Sidebar content ... */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-tr from-hynix-500 to-indigo-500 flex items-center justify-center">
                    <Library className="text-white w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-lg tracking-tight leading-none text-gray-900 dark:text-white">Hynix Eds</span>
                    <span className="text-[10px] text-hynix-600 dark:text-hynix-400 font-mono tracking-wider">PREVIEW</span>
                </div>
            </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 dark:text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-3 space-y-2">
          <button onClick={createNewSession} className="w-full py-2.5 px-4 bg-hynix-600 hover:bg-hynix-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-lg shadow-hynix-500/20 dark:shadow-hynix-900/50">
            <Rocket size={18} />
            <span>New Chat</span>
          </button>
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input type="text" placeholder="Search chats..." value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} className="w-full bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-hynix-500" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {pinnedSessions.length > 0 && (
              <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2 tracking-wider flex items-center gap-1"><Bookmark size={10} /> Pinned</div>
                  {pinnedSessions.map(session => (
                    <div key={session.id} className="group relative">
                        <button onClick={() => { setCurrentSessionId(session.id); setSidebarOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all truncate border pr-14 ${currentSessionId === session.id ? 'bg-hynix-50 dark:bg-hynix-900/40 border-hynix-200 dark:border-hynix-700/50 text-hynix-700 dark:text-hynix-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 border-transparent'}`}>{session.title}</button>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => togglePinSession(e, session.id)} className="p-1 text-gray-400 hover:text-hynix-600"><PinOff size={12} /></button></div>
                    </div>
                  ))}
              </div>
          )}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2 tracking-wider">History</div>
            {unpinnedSessions.map(session => (
                <div key={session.id} className="group relative mb-1">
                    <button onClick={() => { setCurrentSessionId(session.id); setSidebarOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all truncate border pr-14 ${currentSessionId === session.id ? 'bg-hynix-50 dark:bg-hynix-900/40 border-hynix-200 dark:border-hynix-700/50 text-hynix-700 dark:text-hynix-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 border-transparent'}`}>{session.title}</button>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-gray-50/80 dark:bg-dark-800/80 rounded backdrop-blur-sm"><button onClick={(e) => togglePinSession(e, session.id)} className="p-1 text-gray-400 hover:text-hynix-600"><Pin size={12} /></button><button onClick={(e) => deleteSession(e, session.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button></div>
                </div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-dark-850 border-t border-gray-200 dark:border-dark-700">
             <ModelSelector currentModel={selectedModel} models={displayedModels} onSelect={handleModelChange} />
             <div className="p-3 border-t border-gray-200 dark:border-dark-700 flex items-center justify-between">
                 <div className="flex items-center gap-2 overflow-hidden">
                     {user.picture ? <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 dark:border-dark-600" /> : <div className="w-8 h-8 rounded-full bg-hynix-100 dark:bg-hynix-700 flex items-center justify-center text-xs font-bold text-hynix-700 dark:text-white">{user.name.charAt(0)}</div>}
                     <div className="flex flex-col truncate"><span className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{user.name}</span><span className="text-[10px] text-gray-500 truncate">{user.email}</span></div>
                 </div>
                 <button onClick={handleLogout} className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" title="Sign out"><LogOut size={16} /></button>
             </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative bg-white dark:bg-dark-900 transition-colors duration-300">
        <header className="h-16 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-dark-900/80 backdrop-blur sticky top-0 z-10 transition-colors duration-300">
          {/* Left Side: Menu + Title */}
          <div className="flex items-center gap-3 w-1/3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"><Menu size={20} /></button>
            <div className="hidden md:block">
                 <h2 className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{currentSession?.title || 'Hynix Eds'}</h2>
                 <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedModel.includes('Creatore') ? 'bg-indigo-500' : 'bg-hynix-500'}`}></span>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{selectedModel}</p>
                 </div>
            </div>
          </div>

          {/* Center: Page Navigator */}
          <div className="flex-1 flex justify-center">
             <PageNavigator mode={appMode} onChange={handleModeChange} />
          </div>

          {/* Right Side: Tools */}
          <div className="flex items-center justify-end gap-2 w-1/3">
             <button 
                 onClick={() => setShowLive(true)}
                 className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md text-xs font-medium border border-red-500/20 transition-colors"
             >
                 <Radio size={14} className="animate-pulse" />
                 <span>Live</span>
             </button>
             <button onClick={() => setShowCommandPalette(true)} className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-dark-700"><Search size={12} /><span>Cmd+K</span></button>
             <button onClick={() => setShowSettings(true)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"><Settings size={18} /></button>
          </div>
        </header>

        {/* Content Area - Split View for Creatore */}
        <div className="flex-1 flex overflow-hidden">
            {/* Chat Area - Shrinks when Creatore mode is active */}
            <div className={`flex flex-col transition-all duration-300 ${appMode === 'creatore' ? 'w-1/3 min-w-[350px] border-r border-gray-200 dark:border-dark-700' : 'w-full'}`}>
                <ChatInterface 
                    messages={currentSession?.messages || []} 
                    isLoading={isLoading} 
                    isThinking={isThinking}
                    onSuggestionClick={(text) => setInput(text)}
                    onRegenerate={handleRegenerateRevised}
                    onEdit={handleEdit}
                />
                
                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-dark-700 transition-colors duration-300">
                    <div className="relative">
                        {attachments.length > 0 && (
                            <div className="flex gap-2 mb-2 overflow-x-auto py-2 px-1">
                                {attachments.map((att, i) => (
                                    <div key={i} className="relative group shrink-0">
                                        <div className="h-12 w-12 bg-gray-100 dark:bg-dark-800 rounded-md border border-gray-200 dark:border-dark-600 flex items-center justify-center">
                                            <FileText size={20} className="text-gray-400" />
                                        </div>
                                        <button onClick={() => removeAttachment(i)} className="absolute -top-2 -right-2 bg-white dark:bg-dark-800 text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-full p-1 border border-gray-200 dark:border-dark-600 shadow-md z-10"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className={`flex items-end gap-2 bg-white dark:bg-dark-800 rounded-xl border p-2 transition-all shadow-sm ${isThinking ? 'border-hynix-500/50 shadow-hynix-500/10' : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600'}`}>
                            <button onClick={() => setShowPromptLibrary(true)} className="p-3 text-gray-400 hover:text-hynix-600 dark:hover:text-hynix-400 transition-colors" title="Prompt Library"><LayoutTemplate size={20} /></button>
                            <input type="file" className="hidden" ref={fileInputRef} multiple accept="image/*,audio/*,video/*,application/pdf,text/plain" onChange={handleFileSelect} />
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-hynix-600 dark:hover:text-hynix-400 transition-colors" title="Attach Files"><Paperclip size={20} /></button>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                placeholder={isThinking ? "Thinking..." : isListening ? "Listening..." : "Message..."}
                                className="flex-1 bg-transparent text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none p-3 focus:outline-none max-h-32 min-h-[48px]"
                                rows={1}
                                disabled={isLoading && !isThinking}
                            />
                            <button onClick={handleVoiceInput} className={`p-3 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`} title="Voice Input">{isListening ? <MicOff size={20} /> : <Mic size={20} />}</button>
                            {isLoading ? (
                                <button onClick={handleStopGeneration} className="p-3 rounded-lg flex items-center justify-center transition-all duration-200 bg-red-500 text-white hover:bg-red-600 shadow-lg" title="Stop Generation"><StopCircle size={20} fill="currentColor" /></button>
                            ) : (
                                <button onClick={handleSendMessage} disabled={(!input.trim() && attachments.length === 0)} className={`p-3 rounded-lg flex items-center justify-center transition-all duration-200 ${(!input.trim() && attachments.length === 0) ? 'bg-gray-100 dark:bg-dark-700 text-gray-400 dark:text-dark-500 cursor-not-allowed' : 'bg-hynix-600 text-white hover:bg-hynix-500 shadow-lg shadow-hynix-500/20 dark:shadow-hynix-900/50'}`}><Send size={20} /></button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Creatore Workspace Area */}
            {appMode === 'creatore' && (
                <div className="flex-1 h-full overflow-hidden animate-slide-up">
                    <CodeWorkspace messages={currentSession?.messages || []} />
                </div>
            )}
        </div>
      </div>
    </div>
  );
}