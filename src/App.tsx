import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CloudRain, Clock, Waves, Mountain, Map, History, AlertTriangle, 
  ArrowRight, ArrowLeft, ShieldAlert, CheckCircle2, ChevronRight, 
  Activity, Settings, Bell, RefreshCw, Share2, Power, 
  Contact, FileBox, Navigation, Sun, Moon, Book, FileText, Info,
  Database, GitBranch, Cpu, Download, Printer, File, LogIn, UserPlus, MapPin, User, LogOut, Calculator, X, Eye, EyeOff
} from 'lucide-react';
import { FactMap, InferenceResult, LevelId } from './types';
import { VARIABLES_CONFIG } from './data';
import { runForwardChaining, LEVEL_INFO, BASE_RULES, MODIFIER_RULES } from './engine';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { LocationMap, LocationPickerMap } from './components/LocationMap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

type ViewState = 'home' | 'login' | 'register' | 'location' | 'input' | 'analyzing' | 'result' | 'knowledge' | 'about' | 'notifications' | 'settings' | 'history';

interface HistoryItem {
  id: string;
  date: string;
  location: string;
  result: InferenceResult;
  facts: FactMap;
}

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [currentStep, setCurrentStep] = useState(0);
  const [facts, setFacts] = useState<Partial<FactMap>>({});
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const [user, setUser] = useState<{name: string, email: string} | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [locationName, setLocationName] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' });

  const [showCalculator, setShowCalculator] = useState(false);
  const [calcArea, setCalcArea] = useState<string>('');
  const [calcRain, setCalcRain] = useState<string>('');
  const [calcRunoff, setCalcRunoff] = useState<string>('0.7');
  const [calcResult, setCalcResult] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleLocationChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocationName(val);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (val.length >= 3) {
      setIsLoadingSuggestions(true);
      searchTimeout.current = setTimeout(async () => {
        try {
          // Menggunakan Nominatim API (OpenStreetMap)
          // 100% Gratis dan tidak butuh API Key
          // countrycodes=id memastikan pencarian terbatas di Indonesia
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=id&limit=8`);
          const data = await res.json();
          const matches = data.map((item: any) => {
            // Sederhanakan nama jika terlalu panjang untuk tampilan lebih rapi
            let parts = item.display_name.split(', ');
            // Hapus "Indonesia" dan kode pos dari hasil jika ada untuk lebih ringkas
            parts = parts.filter((p: string) => p.toLowerCase() !== 'indonesia' && !/^\d{5}$/.test(p));
            return parts.slice(0, 4).join(', '); // Ambil hingga 4 tingkat administrasi (misal: Sruweng, Kebumen, Jawa Tengah)
          });
          
          // Hapus duplikat dari array hasil jika ada
          const uniqueMatches = Array.from(new Set(matches)) as string[];
          
          setLocationSuggestions(uniqueMatches);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Gagal mengambil data lokasi dari API pihak ketiga", error);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }, 800); // Penundaan 800ms agar API tidak menganggap ini spamming
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (city: string) => {
    setLocationName(city);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const protectedViews: ViewState[] = ['location', 'input', 'analyzing', 'result', 'history', 'settings', 'notifications'];
    if (protectedViews.includes(view) && !user) {
      setView('login');
    }
  }, [view, user]);

  const handleCalculateDebit = () => {
    if (calcArea && calcRain && calcRunoff) {
      const a = parseFloat(calcArea);
      const i = parseFloat(calcRain);
      const c = parseFloat(calcRunoff);
      if (!isNaN(a) && !isNaN(i) && !isNaN(c)) {
        setCalcResult((c * i * a) / 360);
      }
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setIsDark(true);
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleSelect = (variableId: keyof FactMap, optionId: string) => {
    setFacts((prev) => ({ ...prev, [variableId]: optionId }));
  };

  const handleNextStep = () => {
    if (currentStep < VARIABLES_CONFIG.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setView('analyzing');
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setView('home');
    }
  };

  const handleDiagnose = () => {
    const res = runForwardChaining(facts as FactMap);
    setResult(res);
    
    // Save to history
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      location: locationName || 'Lokasi Tidak Diketahui',
      result: res,
      facts: facts as FactMap
    };
    setHistoryItems(prev => [newItem, ...prev]);
  };

  const handleReset = () => {
    setFacts({});
    setResult(null);
    setCurrentStep(0);
    setShowTrace(false);
    setView('home');
    setShowExportMenu(false);
    setLocationName('');
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `Diagnosa Potensi Banjir: ${LEVEL_INFO[result.finalLevel].label}\nBerdasarkan data observasi terkini.\nCek lokasi Anda sekarang!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hasil Diagnosa Potensi Banjir',
          text: text,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Tautan dan hasil disalin ke clipboard!');
    }
  };

  const handleExportPDF = () => {
    window.print();
    setShowExportMenu(false);
  };

  const handleExportDocx = async () => {
    if (!result) return;
    
    const info = LEVEL_INFO[result.finalLevel];
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "Laporan Hasil Diagnosa Potensi Banjir",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `Tanggal: ${new Date().toLocaleDateString('id-ID')}`,
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "Tingkat Risiko Banjir:",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: info.label,
          }),
          new Paragraph({
            text: info.action,
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "Data Observasi:",
            heading: HeadingLevel.HEADING_2,
          }),
          ...VARIABLES_CONFIG.map(v => {
            const valId = facts[v.id as keyof FactMap];
            const option = v.options.find(o => o.id === valId);
            return new Paragraph({
              text: `${v.label}: ${option?.label || 'Tidak diketahui'}`,
            });
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Laporan_Potensi_Banjir.docx");
    setShowExportMenu(false);
  };

  const handleExportTxt = () => {
    if (!result) return;
    const info = LEVEL_INFO[result.finalLevel];
    let txt = `Laporan Hasil Diagnosa Potensi Banjir\nTanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
    txt += `Tingkat Risiko Banjir: ${info.label}\n`;
    txt += `${info.action}\n\nData Observasi:\n`;
    VARIABLES_CONFIG.forEach(v => {
      const valId = facts[v.id as keyof FactMap];
      const option = v.options.find(o => o.id === valId);
      txt += `- ${v.label}: ${option?.label || 'Tidak diketahui'}\n`;
    });
    
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, "Laporan_Potensi_Banjir.txt");
    setShowExportMenu(false);
  };

  useEffect(() => {
    if (view === 'analyzing') {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setAnalyzingProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          handleDiagnose();
          setView('result');
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [view]);

  return (
    <div className={`${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen font-sans bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-300">
        {/* Top App Bar */}
        <header className="fixed top-0 w-full z-50 border-b bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="flex justify-between items-center px-4 md:px-6 h-16 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 font-bold text-lg cursor-pointer" onClick={handleReset}>
              <ShieldAlert className="text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Sistem Pakar Potensi Banjir</span>
            </div>
            <div className="flex gap-2 md:gap-4 items-center">
              {user ? (
                <>
                  <button onClick={() => setView('history')} className={`hidden md:flex font-semibold text-sm px-4 h-10 items-center gap-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${view === 'history' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    <History className="w-4 h-4" /> Riwayat
                  </button>
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{user.name}</span>
                  </div>
                  <button onClick={() => {
                    setUser(null);
                    localStorage.removeItem('user');
                    setView('login');
                  }} className="hidden md:flex font-semibold text-sm px-3 h-10 items-center gap-2 rounded-full transition-colors hover:bg-red-50 text-red-600 dark:text-red-400 dark:hover:bg-red-900/30" title="Keluar">
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setView('login')} className="hidden md:flex font-semibold text-sm px-4 h-10 items-center gap-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <LogIn className="w-4 h-4" /> Masuk
                  </button>
                  <button onClick={() => setView('register')} className="hidden md:flex font-semibold text-sm px-4 h-10 bg-blue-600 text-white items-center gap-2 rounded-full transition-colors hover:bg-blue-700">
                    <UserPlus className="w-4 h-4" /> Daftar
                  </button>
                </>
              )}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Ganti Tema"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => setView('notifications')} className={`p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${view === 'notifications' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                <Bell className="w-5 h-5" />
              </button>
              <button onClick={() => setView('settings')} className={`p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${view === 'settings' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="pt-16 min-h-[calc(100vh-64px)] flex flex-col">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
            >
              {/* Decorative Background */}
              <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,#e0f2fe_0%,transparent_40%),radial-gradient(circle_at_bottom_left,#f1f5f9_0%,transparent_40%)] opacity-50" />
              <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5NGExYjIiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzR2LTRoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6bTAtMzBWMGgtMnY0aC00djJoNHY0aDJWNmg0VjRoLTR6TTYgMzR2LTRINFY0SDB2Mmg0djRoMnYtNGg0di0ySDZ6TTYgNFYwSDR2NEgwdjJoNHY0aDJWNmg0VjRINnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
              
              <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-12">
                <div className="w-full md:w-1/2 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                    <Activity className="w-4 h-4" /> Sistem Deteksi Dini
                  </div>
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    Sistem Pakar Peringatan Potensi Banjir
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                    Sistem deteksi dini potensi banjir berbasis metode Forward Chaining menggunakan parameter curah hujan, durasi, dan kondisi lingkungan berdasarkan data BMKG.
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4">
                    <button 
                      onClick={() => {
                        if (user) {
                          setView('location');
                        } else {
                          setView('login');
                        }
                      }}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                      <Activity className="w-5 h-5" />
                      Mulai Diagnosa
                    </button>
                    <button 
                      onClick={() => setView('knowledge')}
                      className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Book className="w-5 h-5" />
                      Aturan & Knowledge Base
                    </button>
                    <button onClick={() => setView('about')} className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all shadow-sm">
                      Pelajari Lebih Lanjut
                    </button>
                  </div>
                </div>

                <div className="w-full md:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 p-6 rounded-2xl shadow-xl shadow-blue-900/5 dark:shadow-none">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                      <CloudRain className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Curah Hujan</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Analisis intensitas hujan secara real-time untuk mendeteksi anomali cuaca ekstrim.</p>
                  </div>
                  <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 p-6 rounded-2xl shadow-xl shadow-blue-900/5 dark:shadow-none">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                      <Clock className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Durasi</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Pemantauan durasi curah hujan berkesinambungan untuk memprediksi akumulasi debit air.</p>
                  </div>
                  <div className="sm:col-span-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 p-6 rounded-2xl shadow-xl shadow-blue-900/5 dark:shadow-none flex items-start gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Mountain className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2">Kondisi Lingkungan</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Evaluasi kondisi topografi dan daya serap tanah di wilayah observasi untuk memberikan peringatan dini yang akurat dan terkalibrasi.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 w-full max-w-md mx-auto px-4 py-12 flex flex-col justify-center"
            >
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-3xl shadow-xl">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <LogIn className="w-8 h-8" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">Selamat Datang Kembali</h2>
                <p className="text-slate-500 text-center mb-8">Masuk untuk menyimpan riwayat diagnosa Anda</p>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (loginForm.email) {
                    const newUser = { name: loginForm.email.split('@')[0], email: loginForm.email };
                    setUser(newUser);
                    localStorage.setItem('user', JSON.stringify(newUser));
                    setView('home');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input type="email" required value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" placeholder="nama@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kata Sandi</label>
                    <input type="password" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" placeholder="••••••••" />
                  </div>
                  <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md mt-4">
                    Masuk
                  </button>
                </form>
                <div className="mt-6 text-center text-sm text-slate-500">
                  Belum punya akun? <button onClick={() => setView('register')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Daftar sekarang</button>
                </div>
                <div className="mt-4 text-center">
                  <button onClick={() => setView('home')} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium">
                    Kembali ke Beranda
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 w-full max-w-md mx-auto px-4 py-12 flex flex-col justify-center"
            >
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-3xl shadow-xl">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <UserPlus className="w-8 h-8" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">Buat Akun Baru</h2>
                <p className="text-slate-500 text-center mb-8">Daftar untuk menyimpan riwayat diagnosa Anda</p>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (registerForm.email && registerForm.name) {
                    const newUser = { name: registerForm.name, email: registerForm.email };
                    setUser(newUser);
                    localStorage.setItem('user', JSON.stringify(newUser));
                    setView('home');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                    <input type="text" required value={registerForm.name} onChange={e => setRegisterForm({...registerForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" placeholder="Nama Anda" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input type="email" required value={registerForm.email} onChange={e => setRegisterForm({...registerForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" placeholder="nama@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kata Sandi</label>
                    <input type="password" required value={registerForm.password} onChange={e => setRegisterForm({...registerForm, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" placeholder="••••••••" />
                  </div>
                  <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md mt-4">
                    Daftar
                  </button>
                </form>
                <div className="mt-6 text-center text-sm text-slate-500">
                  Sudah punya akun? <button onClick={() => setView('login')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Masuk di sini</button>
                </div>
                <div className="mt-4 text-center">
                  <button onClick={() => setView('home')} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium">
                    Kembali ke Beranda
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'location' && (
            <motion.div 
              key="location"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 w-full max-w-2xl mx-auto px-4 py-12 flex flex-col justify-center"
            >
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-3xl shadow-xl">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <MapPin className="w-10 h-10" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">Tentukan Lokasi</h2>
                <p className="text-slate-500 text-center mb-8">Masukkan nama daerah atau tempat yang akan didiagnosa</p>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (locationName) {
                    setView('input');
                  }
                }} className="space-y-6">
                  <div className="relative">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Lokasi (Ketik atau Pilih di Peta)</label>
                    <input 
                      type="text" 
                      required 
                      value={locationName} 
                      onChange={handleLocationChange} 
                      onFocus={() => { if (locationSuggestions.length > 0) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full px-5 py-4 text-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white mb-4" 
                      placeholder="Contoh: Jakarta Selatan, Kemang..." 
                    />
                    
                    <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
                      <LocationPickerMap 
                        currentLocation={locationName} 
                        onLocationSelect={(name) => {
                          setLocationName(name);
                          setShowSuggestions(false);
                        }} 
                      />
                    </div>

                    <AnimatePresence>
                      {showSuggestions && locationSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 w-full top-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                        >
                          {locationSuggestions.map((city, idx) => (
                            <div 
                              key={idx}
                              onClick={() => selectSuggestion(city)}
                              className="px-5 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0"
                            >
                              {city}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setView('home')} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all">
                      Batal
                    </button>
                    <button type="submit" disabled={!locationName} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-md">
                      Mulai Diagnosa
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full max-w-4xl mx-auto px-4 lg:px-6 py-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('home')} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Diagnosa</h1>
              </div>

              {historyItems.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                    <History className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Belum ada riwayat</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Anda belum melakukan diagnosa potensi banjir. Mulai diagnosa pertama Anda sekarang.
                  </p>
                  <button onClick={() => setView('location')} className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md">
                    Mulai Diagnosa Baru
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {/* Grafik Tren */}
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Tren Tingkat Risiko
                    </h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...historyItems].reverse().map(item => ({
                          date: new Date(item.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
                          level: item.result.finalLevel,
                          location: item.location
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke={isDark ? '#94a3b8' : '#64748b'} 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={10} 
                          />
                          <YAxis 
                            domain={[1, 4]} 
                            ticks={[1, 2, 3, 4]} 
                            tickFormatter={(val) => {
                              if (val === 1) return 'Rendah';
                              if (val === 2) return 'Sedang';
                              if (val === 3) return 'Tinggi';
                              if (val === 4) return 'Sangat Tinggi';
                              return '';
                            }}
                            stroke={isDark ? '#94a3b8' : '#64748b'} 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            dx={-10}
                          />
                          <RechartsTooltip 
                            contentStyle={{ 
                              backgroundColor: isDark ? '#1e293b' : '#ffffff',
                              borderColor: isDark ? '#334155' : '#e2e8f0',
                              borderRadius: '0.75rem',
                              color: isDark ? '#f8fafc' : '#0f172a',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                            }}
                            labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', marginBottom: '0.25rem' }}
                            formatter={(value: number, name: string, props: any) => {
                              const labels = ['', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];
                              return [labels[value], props.payload.location];
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="level" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, fill: isDark ? '#1e293b' : '#ffffff' }}
                            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {historyItems.map(item => {
                    const info = LEVEL_INFO[item.result.finalLevel];
                    const isExtreme = item.result.finalLevel >= 3;
                    return (
                      <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isExtreme ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            <MapPin className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.location}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(item.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                            </div>
                            <div className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold ${isExtreme ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                              {info.label}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setFacts(item.facts);
                            setResult(item.result);
                            setView('result');
                          }}
                          className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors w-full md:w-auto text-center"
                        >
                          Lihat Hasil
                        </button>
                      </div>
                    )
                  })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 md:py-12 flex flex-col"
            >
              {/* Stepper */}
              <div className="mb-12">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />
                  {VARIABLES_CONFIG.map((v, idx) => (
                    <div key={v.id} className="flex flex-col items-center relative z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                        idx === currentStep ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-[0_0_0_4px_rgba(59,130,246,0.2)]' : 
                        idx < currentStep || facts[v.id as keyof FactMap] ? 'bg-slate-600 dark:bg-slate-700 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}>
                        {idx + 1}
                      </div>
                      {idx === currentStep && (
                        <span className="absolute top-10 font-bold text-xs text-blue-600 dark:text-blue-400">{v.id}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Question */}
              <div className="flex-1">
                <div className="mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">Tingkat {VARIABLES_CONFIG[currentStep].label} saat ini?</h1>
                  <p className="text-slate-500 dark:text-slate-400">Pilih kondisi berdasarkan observasi atau data terdekat Anda.</p>
                </div>

                <div className="space-y-3">
                  {VARIABLES_CONFIG[currentStep].options.map((opt) => {
                    const isSelected = facts[VARIABLES_CONFIG[currentStep].id as keyof FactMap] === opt.id;
                    const Icon = VARIABLES_CONFIG[currentStep].icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelect(VARIABLES_CONFIG[currentStep].id as keyof FactMap, opt.id)}
                        className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-slate-800 border-blue-600 dark:border-blue-500 shadow-sm' 
                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold ${isSelected ? 'text-blue-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{opt.label}</h3>
                          <p className={`text-sm ${isSelected ? 'text-blue-700 dark:text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>{opt.desc}</p>
                        </div>
                        <div className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                          <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {/* Calculator Section */}
                <div className="mt-8">
                  <button 
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg"
                  >
                    <Calculator className="w-4 h-4" />
                    Kalkulator Estimasi Debit Air
                  </button>
                  
                  <AnimatePresence>
                    {showCalculator && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="overflow-hidden mt-4"
                      >
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm relative">
                          <button 
                            onClick={() => setShowCalculator(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <h4 className="font-bold text-slate-900 dark:text-white mb-4">Estimasi Debit Air (Metode Rasional)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Luasan Area (Hektar)</label>
                              <input 
                                type="number" 
                                value={calcArea} 
                                onChange={e => setCalcArea(e.target.value)} 
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" 
                                placeholder="Contoh: 10" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Intensitas Hujan (mm/jam)</label>
                              <input 
                                type="number" 
                                value={calcRain} 
                                onChange={e => setCalcRain(e.target.value)} 
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" 
                                placeholder="Contoh: 50" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Koefisien Limpasan (C)</label>
                              <select 
                                value={calcRunoff} 
                                onChange={e => setCalcRunoff(e.target.value)} 
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                              >
                                <option value="0.9">Perkotaan / Beton (0.9)</option>
                                <option value="0.7">Permukiman (0.7)</option>
                                <option value="0.5">Ruang Terbuka Hijau (0.5)</option>
                                <option value="0.3">Hutan / Lahan Bervegetasi (0.3)</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <button 
                              onClick={handleCalculateDebit}
                              className="w-full sm:w-auto px-6 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
                            >
                              Hitung Debit
                            </button>
                            
                            {calcResult !== null && (
                              <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-800/50 flex-1 text-center sm:text-right">
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mr-2">Estimasi Debit:</span>
                                <span className="font-bold text-blue-900 dark:text-white text-lg">{calcResult.toFixed(2)} m³/s</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handlePrevStep}
                  className="px-6 py-3 rounded-full text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" /> Kembali
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!facts[VARIABLES_CONFIG[currentStep].id as keyof FactMap]}
                  className={`px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${
                    facts[VARIABLES_CONFIG[currentStep].id as keyof FactMap]
                      ? 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/25'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {currentStep === VARIABLES_CONFIG.length - 1 ? 'Analisis' : 'Lanjut'} <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {view === 'analyzing' && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col lg:flex-row relative overflow-hidden"
            >
              <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,#e0f2fe_0%,transparent_50%),radial-gradient(circle_at_bottom_left,#f1f5f9_0%,transparent_50%)] dark:opacity-5 opacity-50" />
              
              <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 z-10 w-full lg:w-1/2">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl shadow-blue-900/5 dark:shadow-none border border-slate-200 dark:border-slate-800 flex flex-col items-center max-w-md w-full text-center">
                  <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                    <motion.div 
                      animate={{ scale: [1, 2.5], opacity: [0.8, 0], borderWidth: ['4px', '1px'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute border-blue-500 rounded-full w-16 h-16"
                    />
                    <motion.div 
                      animate={{ scale: [1, 2.5], opacity: [0.8, 0], borderWidth: ['4px', '1px'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                      className="absolute border-blue-400 rounded-full w-16 h-16"
                    />
                    <div className="relative z-10 bg-blue-600 rounded-full w-20 h-20 flex items-center justify-center shadow-lg">
                      <CloudRain className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 mb-2">Menganalisis data...</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 min-h-[24px]">
                    {analyzingProgress < 25 ? 'Mengecek curah hujan...' :
                     analyzingProgress < 50 ? 'Menilai kondisi topografi...' :
                     analyzingProgress < 75 ? 'Menganalisis sistem drainase...' :
                     analyzingProgress < 90 ? 'Memeriksa riwayat banjir sebelumnya...' :
                     'Menyimpulkan potensi banjir...'}
                  </p>
                  
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative mb-2">
                    <motion.div 
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${analyzingProgress}%` }}
                      transition={{ ease: "linear" }}
                    />
                  </div>
                  <div className="text-xs font-medium text-slate-400 w-full flex justify-between px-1">
                    <span>{analyzingProgress}% Selesai</span>
                    <span>Estimasi: {Math.ceil((100 - analyzingProgress) / 25)} detik</span>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-[400px] bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800 p-6 z-10 flex flex-col h-full overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-[#0f172a] z-20 pb-4 pt-2">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Parameter Evaluasi
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Memproses {VARIABLES_CONFIG.length} titik data observasi</p>
                </div>
                
                <div className="flex flex-col gap-3">
                  {VARIABLES_CONFIG.map((v, idx) => {
                    const Icon = v.icon;
                    const isProcessing = analyzingProgress > (idx * 15) && analyzingProgress < ((idx + 2) * 15);
                    const isDone = analyzingProgress >= ((idx + 2) * 15);
                    const opacity = analyzingProgress > (idx * 15) ? 'opacity-100' : 'opacity-40';
                    
                    return (
                      <div key={v.id} className={`bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-start transition-all duration-500 ${opacity}`}>
                        <div className="mr-3 mt-1 text-blue-500">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{v.label}</div>
                          <div className="font-bold text-slate-900 dark:text-slate-200">{v.options.find(o => o.id === facts[v.id as keyof FactMap])?.label || 'Menunggu...'}</div>
                        </div>
                        <div className="mt-2 text-slate-400">
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : isProcessing ? (
                            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'result' && result && (
            <motion.div 
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-6 py-8 flex flex-col gap-6"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400">Hasil Diagnosa Sistem Pakar</h1>
                  <p className="text-slate-500 dark:text-slate-400">Berdasarkan analisis data observasi terkini</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto relative no-print">
                  <button onClick={handleReset} className="flex-1 sm:flex-none px-6 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm">
                    <RefreshCw className="w-4 h-4" /> Diagnosa Ulang
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex-1 sm:flex-none px-6 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm">
                      <Printer className="w-4 h-4" /> Cetak
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700">
                          <File className="w-4 h-4 text-red-500" /> <span className="font-medium text-sm">Cetak / PDF</span>
                        </button>
                        <button onClick={handleExportDocx} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700">
                          <FileText className="w-4 h-4 text-blue-500" /> <span className="font-medium text-sm">Download DOCX</span>
                        </button>
                        <button onClick={handleExportTxt} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <FileText className="w-4 h-4 text-slate-500" /> <span className="font-medium text-sm">Download TXT</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <button onClick={handleShare} className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg flex items-center justify-center gap-2 text-sm">
                    <Share2 className="w-4 h-4" /> Bagikan
                  </button>
                </div>
              </div>

              {/* Status Alert Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
              {(() => {
                const info = LEVEL_INFO[result.finalLevel];
                // Map logical colors to dark mode equivalents for the alert banner
                const bannerStyle = 
                  result.finalLevel === 4 ? 'bg-red-950/40 border-red-900/50 text-red-500' :
                  result.finalLevel === 3 ? 'bg-orange-950/40 border-orange-900/50 text-orange-500' :
                  result.finalLevel === 2 ? 'bg-yellow-950/40 border-yellow-900/50 text-yellow-500' :
                  'bg-emerald-950/40 border-emerald-900/50 text-emerald-500';

                const badgeBg = 
                  result.finalLevel === 4 ? 'bg-red-600' :
                  result.finalLevel === 3 ? 'bg-orange-600' :
                  result.finalLevel === 2 ? 'bg-yellow-600' :
                  'bg-emerald-600';

                return (
                  <div className={`rounded-2xl p-8 border ${bannerStyle} flex flex-col items-center text-center relative overflow-hidden backdrop-blur-md`}>
                    <div className="absolute -right-12 -top-12 opacity-10 pointer-events-none">
                      <AlertTriangle className="w-64 h-64" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-wider mb-4 z-10 opacity-80">Tingkat Risiko Banjir</h2>
                    <div className={`${badgeBg} text-white px-8 py-3 rounded-full flex items-center gap-3 mb-6 z-10 shadow-lg`}>
                      <ShieldAlert className="w-8 h-8" />
                      <span className="text-3xl font-extrabold tracking-tight">{info.label}</span>
                    </div>
                    <p className="text-xl font-bold z-10 max-w-xl mx-auto opacity-90">{info.action}</p>
                  </div>
                );
              })()}
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Tips Mitigasi Cepat */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="lg:col-span-5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <ShieldAlert className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tips Mitigasi Cepat</h3>
                  </div>
                  <ul className="space-y-3 flex-1">
                    {result.finalLevel === 4 && (
                      <>
                        <li className="flex gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
                          <Navigation className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-red-900 dark:text-red-200 mb-1">1. Segera Evakuasi</div>
                            <div className="text-sm text-red-700 dark:text-red-300/70">Tinggalkan lokasi menuju titik kumpul evakuasi terdekat yang lebih tinggi.</div>
                          </div>
                        </li>
                        <li className="flex gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
                          <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-red-900 dark:text-red-200 mb-1">2. Hindari Genangan</div>
                            <div className="text-sm text-red-700 dark:text-red-300/70">Jangan menerobos arus banjir dengan berjalan kaki maupun berkendara.</div>
                          </div>
                        </li>
                        <li className="flex gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
                          <Contact className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-red-900 dark:text-red-200 mb-1">3. Hubungi Bantuan Darurat</div>
                            <div className="text-sm text-red-700 dark:text-red-300/70">Segera hubungi tim SAR (115) atau nomor darurat setempat (112).</div>
                          </div>
                        </li>
                      </>
                    )}
                    {result.finalLevel === 3 && (
                      <>
                        <li className="flex gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40">
                          <Power className="w-6 h-6 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-orange-900 dark:text-orange-200 mb-1">1. Matikan Listrik & Gas</div>
                            <div className="text-sm text-orange-700 dark:text-orange-300/70">Putuskan arus dari meteran utama untuk mencegah korsleting dan kebakaran.</div>
                          </div>
                        </li>
                        <li className="flex gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40">
                          <Navigation className="w-6 h-6 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-orange-900 dark:text-orange-200 mb-1">2. Siapkan Rute Evakuasi</div>
                            <div className="text-sm text-orange-700 dark:text-orange-300/70">Pastikan seluruh keluarga mengetahui rute aman menuju tempat tinggi.</div>
                          </div>
                        </li>
                        <li className="flex gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40">
                          <FileBox className="w-6 h-6 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-orange-900 dark:text-orange-200 mb-1">3. Amankan Dokumen</div>
                            <div className="text-sm text-orange-700 dark:text-orange-300/70">Simpan surat-surat berharga dalam plastik kedap air di tempat yang aman.</div>
                          </div>
                        </li>
                      </>
                    )}
                    {result.finalLevel === 2 && (
                      <>
                        <li className="flex gap-4 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900/40">
                          <ArrowRight className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5 -rotate-45" />
                          <div>
                            <div className="font-bold text-yellow-900 dark:text-yellow-200 mb-1">1. Pindahkan Barang Berharga</div>
                            <div className="text-sm text-yellow-700 dark:text-yellow-300/70">Pindahkan barang elektronik dan dokumen ke area yang lebih tinggi di dalam rumah.</div>
                          </div>
                        </li>
                        <li className="flex gap-4 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900/40">
                          <Bell className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-yellow-900 dark:text-yellow-200 mb-1">2. Pantau Peringatan Dini</div>
                            <div className="text-sm text-yellow-700 dark:text-yellow-300/70">Ikuti perkembangan informasi dari aparat desa atau peringatan BMKG.</div>
                          </div>
                        </li>
                        <li className="flex gap-4 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900/40">
                          <FileBox className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-yellow-900 dark:text-yellow-200 mb-1">3. Siapkan Tas Siaga</div>
                            <div className="text-sm text-yellow-700 dark:text-yellow-300/70">Siapkan pakaian ganti, makanan instan, obat-obatan, dan senter.</div>
                          </div>
                        </li>
                      </>
                    )}
                    {result.finalLevel === 1 && (
                      <>
                        <li className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                          <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-200 mb-1">1. Bersihkan Saluran Air</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Pastikan selokan dan drainase di sekitar rumah bebas dari tumpukan sampah.</div>
                          </div>
                        </li>
                        <li className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                          <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-200 mb-1">2. Pantau Cuaca Berkala</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Cek prakiraan curah hujan secara rutin melalui aplikasi BMKG.</div>
                          </div>
                        </li>
                        <li className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                          <FileBox className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-200 mb-1">3. Edukasi Keluarga</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Pahami kembali langkah-langkah dasar keselamatan menghadapi musim hujan.</div>
                          </div>
                        </li>
                      </>
                    )}
                  </ul>
                </motion.div>

                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* Peta Lokasi */}
                  {locationName && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.25 }}
                      className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Map className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          Peta Lokasi ({locationName})
                        </h3>
                        <button
                          onClick={() => setShowMap(!showMap)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                        >
                          {showMap ? <><EyeOff className="w-4 h-4" /> Sembunyikan</> : <><Eye className="w-4 h-4" /> Tampilkan</>}
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {showMap && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="relative w-full h-64 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 mb-2 mt-2">
                              <LocationMap locationName={locationName} riskLevel={result.finalLevel} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* Peringatan BMKG */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6"
                  >
                    <div className="w-16 h-16 shrink-0 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Map className="w-8 h-8" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Informasi Cuaca Resmi BMKG</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 sm:mb-0">Untuk panduan mitigasi dan pembaruan cuaca secara real-time yang lebih komprehensif, silakan kunjungi portal BMKG.</p>
                    </div>
                    <a href="https://www.bmkg.go.id" target="_blank" rel="noopener noreferrer" className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm">
                      Kunjungi BMKG
                    </a>
                  </motion.div>

                  {/* Ringkasan Input */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                      <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ringkasan Input</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {VARIABLES_CONFIG.map(v => {
                        const valId = facts[v.id as keyof FactMap];
                        const option = v.options.find(o => o.id === valId);
                        // Highlight extreme inputs
                        const isExtreme = valId?.endsWith('4') || valId?.endsWith('5') || (v.id === 'KD' && valId === 'KD2') || (v.id === 'KS' && valId === 'KS3');
                        
                        return (
                          <div key={v.id} className="bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-700/50 p-3 rounded-xl">
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{v.label}</div>
                            <div className={`text-sm font-bold ${isExtreme ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-200'}`}>
                              {option?.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Jejak Penalaran */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm flex-1 no-print"
                  >
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                      <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Jejak Penalaran (Inference)</h3>
                    </div>
                    <div className="space-y-3">
                      {result.trace.map((t, idx) => {
                        const isFinal = idx === result.trace.length - 1;
                        return (
                          <details key={idx} className="group bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden" open={isFinal}>
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors list-none">
                              <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">Rule {t.ruleId.replace('R', '')} Triggered</span>
                              <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                            </summary>
                            <div className="p-4 pt-0 text-slate-600 dark:text-slate-400 text-sm border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 font-mono">
                              <div className="bg-white dark:bg-slate-950 p-3 rounded-lg mt-3 border border-slate-200 dark:border-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm dark:shadow-none text-xs">
                                {t.description.replace('IF ', 'IF \n  ').replace(/ AND /g, '\n  AND ').replace(' THEN ', '\nTHEN \n  ')}
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'knowledge' && (
            <motion.div 
              key="knowledge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full max-w-5xl mx-auto px-4 lg:px-6 py-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('home')} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rulebase & Knowledge Base</h1>
                    <p className="text-slate-500 dark:text-slate-400">Aturan Inferensi Sistem Pakar</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Method Info Card */}
                <div className="lg:col-span-3 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                    <Cpu className="w-64 h-64" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/20">
                      <Database className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-3">Forward Chaining Engine</h2>
                      <p className="text-blue-100 leading-relaxed max-w-3xl text-lg">
                        Sistem ini menggunakan algoritma <strong className="text-white">Forward Chaining</strong> yang memulai proses penalaran dari fakta-fakta yang diketahui (data observasi) untuk mendeduksi kesimpulan (Tingkat Potensi Banjir).
                      </p>
                      <div className="flex flex-wrap gap-3 mt-6">
                        <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 text-sm font-medium">
                          {BASE_RULES.length} Aturan Dasar
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 text-sm font-medium">
                          {MODIFIER_RULES.length} Aturan Pengubah
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 text-sm font-medium">
                          {VARIABLES_CONFIG.length} Parameter Input
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Base Rules */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 md:p-8 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-5 mb-6">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <GitBranch className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Base Rules (Aturan Dasar)</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {BASE_RULES.map((r, i) => (
                        <div key={r.id} className="group bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm dark:shadow-none hover:border-blue-300 dark:hover:border-blue-700/50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-xs">Rule {r.id.replace('R', '')}</span>
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 font-mono text-sm leading-loose">
                            {r.description.split(/ (IF|AND|THEN) /).map((part, index) => {
                              if (part === 'IF' || part === 'AND' || part === 'THEN') {
                                return <span key={index} className="font-bold text-blue-600 dark:text-blue-400 mx-1">{part}</span>;
                              }
                              return part;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modifier Rules & Legend */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 md:p-8 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-5 mb-6">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                        <GitBranch className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Modifier Rules</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {MODIFIER_RULES.map((r, i) => (
                        <div key={r.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:border-orange-300 dark:hover:border-orange-700/50 transition-colors">
                          <div className="font-bold text-orange-600 dark:text-orange-400 mb-2 text-xs">Rule {r.id.replace('R', '')}</div>
                          <div className="text-slate-700 dark:text-slate-300 font-mono text-xs leading-relaxed">
                            {r.description.split(/ (IF|THEN) /).map((part, index) => {
                              if (part === 'IF' || part === 'THEN') {
                                return <span key={index} className="font-bold text-orange-600 dark:text-orange-400 mx-1">{part}</span>;
                              }
                              return part;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Book className="w-5 h-5 text-blue-400" /> Glosarium Variabel
                    </h3>
                    <div className="space-y-3 text-sm">
                      {VARIABLES_CONFIG.map(v => (
                        <div key={v.id} className="flex items-start justify-between border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                          <span className="text-blue-300 font-bold">{v.id}</span>
                          <span className="text-slate-400 text-right">{v.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'about' && (
            <motion.div 
              key="about"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full max-w-3xl mx-auto px-4 lg:px-6 py-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('home')} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pelajari Lebih Lanjut</h1>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-2xl space-y-6">
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Info className="w-12 h-12" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Sistem Pakar Potensi Banjir</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Versi 1.0.0</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p className="mb-4">
                    Sistem pakar ini dirancang untuk mendeteksi potensi bahaya banjir secara dini menggunakan observasi lingkungan sekitar. Dengan menerapkan metode Forward Chaining, sistem mencocokkan fakta-fakta yang Anda masukkan dengan basis aturan (Rulebase) yang terkalibrasi dari pola mitigasi bencana, guna memberikan rekomendasi tindakan yang tepat dan cepat.
                  </p>
                  <p>
                    Aplikasi ini dapat digunakan sebagai panduan awal bagi masyarakat dalam mengambil tindakan preventif, namun tidak menggantikan informasi peringatan dini resmi dari instansi pemerintah seperti BMKG atau BNPB.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'notifications' && (
            <motion.div 
              key="notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full max-w-3xl mx-auto px-4 lg:px-6 py-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('home')} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifikasi</h1>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                  <Bell className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Belum ada notifikasi</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Sistem akan memberi tahu Anda jika ada peringatan cuaca ekstrem atau pembaruan sistem yang penting.
                </p>
              </div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full max-w-3xl mx-auto px-4 lg:px-6 py-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('home')} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaturan Sistem</h1>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-lg">Sinkronisasi Data BMKG</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Otomatis memperbarui parameter batas hujan. (Sedang dikembangkan)</div>
                  </div>
                  <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 rounded-full relative cursor-not-allowed opacity-60">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-lg">Notifikasi Suara</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Putar suara sirine saat potensi Sangat Tinggi.</div>
                  </div>
                  <div className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-lg">Hapus Riwayat Penilaian</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Bersihkan data observasi sementara di perangkat Anda.</div>
                  </div>
                  <button onClick={handleReset} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg font-semibold transition-colors text-sm">
                    Bersihkan
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}

