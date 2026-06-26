import { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, 
  Search, 
  RotateCcw, 
  Database, 
  UserCheck, 
  Building2, 
  IdCard, 
  Briefcase, 
  AlertCircle, 
  WifiOff, 
  FileText, 
  History, 
  Download, 
  Filter, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  ArrowRight,
  Info,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  parseCSV, 
  normalizeId, 
  formatThaiDate, 
  formatThaiDateTime, 
  isHighlightField 
} from "./utils";

const SHEET_ID = '1Wj-PUpYmZ7BROgUlfLpxrg83m5_zGNQ7V19MRoBOH7I';
const GID = '1351239890';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

interface Stats {
  totalRecords: number;
  totalEmployers: number;
  duplicateCount: number;
  newCount: number;
}

export default function App() {
  const [allData, setAllData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Input states
  const [alienId, setAlienId] = useState<string>('');
  const [employerNumber, setEmployerNumber] = useState<string>('');
  const [activeForm, setActiveForm] = useState<'id' | 'employer' | null>(null);

  // Search Results states
  const [searchType, setSearchType] = useState<'id' | 'employer' | null>(null);
  const [searchResult, setSearchResult] = useState<string[][] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Table Page state & Table Filter state
  const [tableFilter, setTableFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Preload Google Sheet data
  const loadSheetData = async () => {
    try {
      setIsLoadingData(true);
      const res = await fetch(CSV_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch CSV data');
      const text = await res.text();
      const parsed = parseCSV(text);
      if (parsed.length >= 2) {
        setAllData({
          headers: parsed[0],
          rows: parsed.slice(1)
        });
        setLoadError(false);
      } else {
        throw new Error('Parsed data is empty or invalid');
      }
    } catch (err) {
      console.error("Error preloading eWorkPermit database: ", err);
      setLoadError(true);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadSheetData();
  }, []);

  // Compute live statistics
  const stats = useMemo<Stats | null>(() => {
    if (!allData) return null;
    const rows = allData.rows;

    let duplicateCount = 0;
    let newCount = 0;
    const uniqueEmployers = new Set<string>();

    rows.forEach(row => {
      // Index 2 is assumed to be Employer ID
      const empId = normalizeId(row[2] || '');
      if (empId) uniqueEmployers.add(empId);

      row.forEach(cell => {
        const str = String(cell || '');
        if (str.includes('⚠️ เลขต่างด้าวซ้ำ')) duplicateCount++;
        if (str.includes('✅ ข้อมูลใหม่')) newCount++;
      });
    });

    return {
      totalRecords: rows.length,
      totalEmployers: uniqueEmployers.size,
      duplicateCount,
      newCount
    };
  }, [allData]);

  // Handle auto-locking of form inputs
  const handleAlienIdChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 13);
    setAlienId(cleaned);
    if (cleaned.length > 0) {
      setActiveForm('id');
    } else if (employerNumber.length === 0) {
      setActiveForm(null);
    }
  };

  const handleEmployerIdChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 13);
    setEmployerNumber(cleaned);
    if (cleaned.length > 0) {
      setActiveForm('employer');
    } else if (alienId.length === 0) {
      setActiveForm(null);
    }
  };

  // Trigger search logic
  const performSearch = async (type: 'id' | 'employer') => {
    const queryValue = type === 'id' ? alienId : employerNumber;
    
    if (queryValue.length !== 13) {
      setErrorMsg(`กรุณากรอกหมายเลข 13 หลักให้ถูกต้องครบถ้วน`);
      return;
    }

    setErrorMsg(null);
    setIsSearching(true);
    setCurrentPage(1);

    try {
      // Ensure data is fresh or loaded
      let currentRows = allData?.rows;
      let currentHeaders = allData?.headers;

      if (!allData) {
        const res = await fetch(CSV_URL, { cache: 'no-store' });
        const text = await res.text();
        const parsed = parseCSV(text);
        if (parsed.length >= 2) {
          currentHeaders = parsed[0];
          currentRows = parsed.slice(1);
          setAllData({ headers: currentHeaders, rows: currentRows });
        }
      }

      if (!currentRows) {
        throw new Error('ไม่สามารถเชื่อมโยงระบบฐานข้อมูลสารบบได้');
      }

      const matchIndex = type === 'id' ? 4 : 2; // index 4: Alien ID, index 2: Employer ID
      const matched = currentRows.filter(row => normalizeId(row[matchIndex] || '') === queryValue);

      setSearchResult(matched);
      setSearchType(type);
    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดปัญหาในการสื่อสารกับโครงข่ายคลาวด์ โปรดตรวจสอบการเชื่อมต่อของคุณ');
    } finally {
      setIsSearching(false);
    }
  };

  // Reset inputs and states
  const handleReset = (type: 'id' | 'employer') => {
    if (type === 'id') {
      setAlienId('');
    } else {
      setEmployerNumber('');
    }
    setErrorMsg(null);
    setSearchResult(null);
    setSearchType(null);
    setTableFilter('');
    setActiveForm(null);
  };

  // Dynamic filter for employer worker tables
  const filteredRows = useMemo(() => {
    if (!searchResult || searchType !== 'employer') return [];
    if (!tableFilter.trim()) return searchResult;

    const lowerQuery = tableFilter.toLowerCase();
    return searchResult.filter(row => 
      row.some(cell => String(cell || '').toLowerCase().includes(lowerQuery))
    );
  }, [searchResult, searchType, tableFilter]);

  // Paginated rows for large employer lists
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  // Excel-friendly Thai CSV Export with UTF-8 BOM
  const handleExportCSV = () => {
    if (!searchResult || !allData) return;
    
    const rowsToExport = searchType === 'employer' ? filteredRows : searchResult;
    const csvContent = [
      allData.headers.join(','),
      ...rowsToExport.map(row => 
        row.map(cell => {
          const val = String(cell || '').replace(/"/g, '""');
          return `"${val}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `eworkpermit_export_${employerNumber || alienId || 'data'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      
      {/* ENTERPRISE GLOW HEADER */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-blue-900/60 shadow-xl overflow-hidden relative">
        {/* Abstract vector decor circles */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-20 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Logo area */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg border border-blue-400/40 relative">
                <ShieldCheck className="w-6 h-6 text-white" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                    ระบบตรวจสอบสถานะข้อมูลแรงงานต่างด้าว
                  </h1>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] bg-blue-500/25 border border-blue-400/40 text-blue-300 font-bold uppercase tracking-wider">
                    eWorkPermit
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-1 tracking-wide flex items-center gap-1">
                  <span>eWorkPermit Verification & Data Matching Platform</span>
                  <span className="text-blue-400">•</span>
                  <span className="text-emerald-400">กระทรวงแรงงาน</span>
                </p>
              </div>
            </div>

            {/* Right side live status & actions */}
            <div className="flex items-center gap-3 self-start md:self-center">
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-1.5 flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  ฐานข้อมูลพร้อมใช้งาน
                </span>
              </div>

              {loadError && (
                <button 
                  onClick={loadSheetData}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/40 text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-semibold"
                >
                  <WifiOff className="w-3.5 h-3.5" /> รีโหลดระบบ
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* DASHBOARD STATISTICS HERO SECTION */}
      <section className="bg-slate-900 border-b border-slate-800 text-white relative py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Real-time Ticking Clock */}
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-4">
            <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="font-mono tracking-wide">
              {formatThaiDateTime(currentTime)}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {isLoadingData ? (
              // Loading Stats Skeleton
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-1/2 mb-3"></div>
                    <div className="h-8 bg-slate-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              // Error Alert
              <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-4 flex items-center gap-3.5">
                <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-red-200">ไม่สามารถโหลดฐานข้อมูลกลางได้</h3>
                  <p className="text-xs text-red-300/80 mt-0.5">เกิดปัญหาขัดข้องชั่วคราวในการเข้าถึงข้อมูลพอร์ทัลของ Google Sheets โปรดกดปุ่ม "รีโหลดระบบ" ด้านบนเพื่อลองใหม่อีกครั้ง</p>
                </div>
              </div>
            ) : stats ? (
              // Real computed stats cards
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {/* Stat 1 */}
                <div className="bg-slate-800/55 border border-slate-700/60 rounded-xl p-4 shadow-sm hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 tracking-wide">
                      แรงงานในระบบทั้งหมด
                    </span>
                    <Database className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight text-white font-mono">
                      {stats.totalRecords.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">คน</span>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="bg-slate-800/55 border border-slate-700/60 rounded-xl p-4 shadow-sm hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 tracking-wide">
                      นายจ้าง / นิติบุคคล
                    </span>
                    <Briefcase className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight text-white font-mono">
                      {stats.totalEmployers.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">แห่ง</span>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="bg-slate-800/55 border border-slate-700/60 rounded-xl p-4 shadow-sm hover:border-red-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 tracking-wide">
                      ตรวจพบเอกสารซ้ำซ้อน
                    </span>
                    <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight text-red-400 font-mono">
                      {stats.duplicateCount.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">รายการ</span>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="bg-slate-800/55 border border-slate-700/60 rounded-xl p-4 shadow-sm hover:border-blue-400/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 tracking-wide">
                      รายการยื่นใหม่ยันยืนแล้ว
                    </span>
                    <CheckCircle2 className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold tracking-tight text-emerald-400 font-mono">
                      {stats.newCount.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">รายการ</span>
                  </div>
                </div>

              </motion.div>
            ) : null}
          </AnimatePresence>

        </div>
      </section>

      {/* MAIN LAYOUT */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-grow flex flex-col gap-8">
        
        {/* DUAL LOOKUP FORMS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          
          {/* INDIVIDUAL FORM (BLUE CARD) */}
          <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-300/60 flex flex-col justify-between min-h-[310px]">
            {/* Form Dim Lock Overlay */}
            {activeForm === 'employer' && (
              <div className="absolute inset-0 bg-slate-100/90 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                  <Briefcase className="w-6 h-6 text-slate-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">กำลังสืบค้นแบบนิติบุคคล / นายจ้าง</h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-[280px] leading-relaxed">
                  ระบบจำกัดสิทธิ์การป้อนข้อมูลพร้อมกันเพื่อลดความสับสน กรุณากดปุ่มล้างค่าในฟอร์มนายจ้างก่อนทำการสลับประเภท
                </p>
                <button 
                  onClick={() => handleReset('employer')}
                  className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> ล้างค่าฟอร์มนายจ้าง
                </button>
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">ค้นหาข้อมูลตามรายบุคคล</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Alien worker status lookup by individual ID</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                กรอกเลขประจำตัวคนต่างด้าว 13 หลักเพื่อดึงรายการประวัติ เอกสาร และตรวจดูผลการดำเนินการจากระบบ eWorkPermit
              </p>

              <form onSubmit={(e) => { e.preventDefault(); performSearch('id'); }} className="space-y-4">
                <div>
                  <label htmlFor="alien-id-input" className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">
                    เลขประจำตัวคนต่างด้าว (13 หลัก)
                  </label>
                  <div className="relative">
                    <input 
                      id="alien-id-input"
                      type="text" 
                      inputMode="numeric"
                      maxLength={13}
                      value={alienId}
                      onChange={(e) => handleAlienIdChange(e.target.value)}
                      placeholder="ระบุตัวเลข 13 หลัก เช่น 0xxxxxxxxxxxx"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm tracking-widest text-slate-900 transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400 placeholder:tracking-normal font-mono font-semibold"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center text-slate-400">
                      <IdCard className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReset('id')}
                    disabled={!alienId}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-bold border transition-colors ${
                      alienId 
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' 
                        : 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" /> ล้างค่า
                  </button>
                  <button
                    type="submit"
                    disabled={alienId.length !== 13 || isSearching}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-bold text-white transition-all shadow-sm ${
                      alienId.length === 13 && !isSearching
                        ? 'bg-blue-900 hover:bg-blue-950 active:scale-[0.98]' 
                        : 'bg-blue-900/40 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Search className="w-4 h-4" /> ตรวจสอบข้อมูล
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 py-3 px-6 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>ประเภทข้อมูล: รายบุคคล (Individual)</span>
              <span>รหัสเอกสาร: ท.ต. 4 สัญชาติ</span>
            </div>
          </div>

          {/* EMPLOYER FORM (GREEN CARD) */}
          <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-emerald-300/60 flex flex-col justify-between min-h-[310px]">
            {/* Form Dim Lock Overlay */}
            {activeForm === 'id' && (
              <div className="absolute inset-0 bg-slate-100/90 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                  <UserCheck className="w-6 h-6 text-slate-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">กำลังสืบค้นแบบบุคคลต่างด้าว</h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-[280px] leading-relaxed">
                  ระบบจำกัดสิทธิ์การป้อนข้อมูลพร้อมกันเพื่อลดความสับสน กรุณากดปุ่มล้างค่าในฟอร์มรายบุคคลก่อนทำการสลับประเภท
                </p>
                <button 
                  onClick={() => handleReset('id')}
                  className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> ล้างค่าฟอร์มรายบุคคล
                </button>
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">ค้นหาข้อมูลตามสถานประกอบการ</h2>
                  <p className="text-[11px] text-emerald-600/80 mt-0.5">Company or Employer master search</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                กรอกเลขทะเบียนนิติบุคคล หรือเลขนายจ้าง 13 หลัก เพื่อแสดงรายการคนต่างด้าวทั้งหมดภายใต้สังกัดและการแจ้งพิจารณา
              </p>

              <form onSubmit={(e) => { e.preventDefault(); performSearch('employer'); }} className="space-y-4">
                <div>
                  <label htmlFor="employer-id-input" className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">
                    เลขทะเบียนนิติบุคคล / เลขนายจ้าง (13 หลัก)
                  </label>
                  <div className="relative">
                    <input 
                      id="employer-id-input"
                      type="text" 
                      inputMode="numeric"
                      maxLength={13}
                      value={employerNumber}
                      onChange={(e) => handleEmployerIdChange(e.target.value)}
                      placeholder="ระบุตัวเลข 13 หลัก เช่น 0xxxxxxxxxxxx"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm tracking-widest text-slate-900 transition-all focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 placeholder:text-slate-400 placeholder:tracking-normal font-mono font-semibold"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center text-slate-400">
                      <Briefcase className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReset('employer')}
                    disabled={!employerNumber}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-bold border transition-colors ${
                      employerNumber 
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' 
                        : 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" /> ล้างค่า
                  </button>
                  <button
                    type="submit"
                    disabled={employerNumber.length !== 13 || isSearching}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-bold text-white transition-all shadow-sm ${
                      employerNumber.length === 13 && !isSearching
                        ? 'bg-emerald-850 hover:bg-emerald-900 active:scale-[0.98]' 
                        : 'bg-emerald-900/40 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Search className="w-4 h-4" /> ตรวจสอบข้อมูล
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 py-3 px-6 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>ประเภทข้อมูล: นายจ้าง (Employer)</span>
              <span>ครอบคลุมแรงงาน: เมียนมา กัมพูชา ลาว เวียดนาม</span>
            </div>
          </div>

        </div>

        {/* INPUT ERROR / FEEDBACK LINE */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold">{errorMsg}</p>
          </motion.div>
        )}

        {/* SEARCH AND RESULTS FEEDBACKS */}
        <section className="w-full">
          <AnimatePresence mode="wait">
            
            {/* INITIAL & IDLE GUIDE STATE */}
            {!searchType && !isSearching && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Info className="w-6 h-6 text-blue-900" />
                </div>
                <div className="flex-grow space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">ระบบสืบค้นสารบบเชื่อมต่อฐานข้อมูลคลาวด์แล้ว</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    กรุณาป้อนรหัส 13 หลักเพื่อดึงผลสรุปการประมวลผลและการยืนยันเอกสารตามสัญชาติ (กัมพูชา, ลาว, เมียนมา, เวียดนาม) ข้อมูลในระบบจะถูกซิงก์โดยตรงกับคลังสารสนเทศกลาง eWorkPermit
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
                      คัดกรองความผิดพลาดซ้ำซ้อนอัตโนมัติ
                    </span>
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-100">
                      แสดงวันที่แบบพุทธศักราช (พ.ศ.)
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-100">
                      ส่งออก Excel-friendly CSV
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* LOADING STATE WITH SHIMMER */}
            {isSearching && (
              <motion.div 
                key="searching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center gap-4"
              >
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-900 border-t-transparent animate-spin"></div>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">กำลังสแกนโครงข่ายคลาวด์ eWorkPermit...</h3>
                  <p className="text-xs text-slate-400 mt-1">กำลังจัดระเบียบและแมทชิ่งชุดรหัสประวัติ 13 หลัก โปรดรอสักครู่</p>
                </div>
              </motion.div>
            )}

            {/* RESULTS STATE */}
            {searchType && searchResult !== null && !isSearching && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full flex flex-col gap-5"
              >
                
                {/* Result Control Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-blue-900" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-800">
                        {searchType === 'id' ? 'ผลการตรวจสอบข้อมูลรายบุคคล' : 'รายการแรงงานในสถานประกอบการ'}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {searchType === 'id' 
                          ? `หมายเลขแรงงาน: ${alienId}` 
                          : `รหัสบริษัทนายจ้าง: ${employerNumber} (พบทั้งหมด ${searchResult.length} รายการ)`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* CSV Export Button (Only if we have results) */}
                    {searchResult.length > 0 && (
                      <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                      >
                        <Download className="w-4 h-4" /> ส่งออกเป็นไฟล์ CSV
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleReset(searchType)}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ตการค้นหา
                    </button>
                  </div>
                </div>

                {/* NO RECORDS FOUND */}
                {searchResult.length === 0 && (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3.5 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-amber-800" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-900">ไม่พบระเบียนประวัติข้อมูลแรงงานต่างด้าว</h3>
                      <p className="text-xs text-amber-700/85 mt-1 max-w-lg leading-relaxed">
                        ไม่พบหมายเลข 13 หลักที่คุณสืบค้นในระเบียนปัจจุบันของสารบบ eWorkPermit กรุณาตรวจสอบความถูกต้องของชุดตัวเลขหรือติดต่อเจ้าหน้าที่ฝ่ายทะเบียนเพื่อยื่นข้อมูลเพิ่ม
                      </p>
                    </div>
                  </div>
                )}

                {/* VIEW INDIVIDUAL CARD RESULTS */}
                {searchType === 'id' && searchResult.length > 0 && (
                  <div className="flex flex-col gap-5 w-full">
                    {searchResult.map((record, recIdx) => (
                      <div 
                        key={recIdx} 
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
                      >
                        {/* Record Title Header */}
                        <div className="bg-slate-50 border-b border-slate-100 py-3.5 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <span className="text-xs font-extrabold text-blue-900 tracking-wide flex items-center gap-1.5">
                            <History className="w-4 h-4 text-slate-500" /> 
                            ระเบียนข้อมูลที่ {recIdx + 1}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 
                            ประมวลผลสำเร็จ
                          </span>
                        </div>

                        {/* Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                          {allData?.headers.map((header, headIdx) => {
                            const labelText = header && header.trim() ? header.trim() : `ข้อมูลช่องที่ ${headIdx + 1}`;
                            let cellVal = record[headIdx] && record[headIdx].trim() ? record[headIdx].trim() : '-';

                            // Format dates
                            if (labelText.toLowerCase().includes('date') || labelText.toLowerCase().includes('วันที่') || labelText.toLowerCase().includes('เวลา')) {
                              cellVal = formatThaiDate(cellVal);
                            }

                            const isStatus = labelText.toLowerCase().includes('ผลการดำเนินการ') || labelText.toLowerCase().includes('result') || labelText.toLowerCase().includes('status') || labelText.includes('สถานะ');

                            return (
                              <div 
                                key={headIdx} 
                                className="border-b border-r border-slate-100 p-4 flex flex-col justify-between hover:bg-slate-50/50 transition-colors"
                              >
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  {labelText}
                                </span>
                                <div className="mt-1.5">
                                  {isStatus ? (
                                    cellVal.includes('⚠️ เลขต่างด้าวซ้ำ') ? (
                                      <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-lg border border-red-200 text-xs font-bold shadow-xs">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        {cellVal}
                                      </span>
                                    ) : cellVal.includes('✅ ข้อมูลใหม่') ? (
                                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg border border-emerald-200 text-xs font-bold shadow-xs">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {cellVal}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1">
                                        {cellVal}
                                      </span>
                                    )
                                  ) : (
                                    <span className={`text-xs font-medium ${isHighlightField(labelText) ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                                      {cellVal}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* VIEW EMPLOYER SEARCH RESULT SHEET */}
                {searchType === 'employer' && searchResult.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col gap-0">
                    
                    {/* Table Interactive Header & Real-time Filter */}
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row items-center justify-between gap-4">
                      
                      <div className="flex items-center gap-2 text-slate-700 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-800">ตัวกรองตารางรายชื่อ:</span>
                        <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2 py-0.5 rounded">
                          พบแรงงานตรงตามเงื่อนไข {filteredRows.length} จาก {searchResult.length} คน
                        </span>
                      </div>

                      {/* Filter Search Field */}
                      <div className="relative w-full md:w-72 shrink-0">
                        <input 
                          type="text"
                          value={tableFilter}
                          onChange={(e) => { setTableFilter(e.target.value); setCurrentPage(1); }}
                          placeholder="พิมพ์เพื่อกรองตาม ชื่อ, เลขต่างด้าว, สถานะ..."
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 pl-8 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
                        />
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        {tableFilter && (
                          <button 
                            onClick={() => { setTableFilter(''); setCurrentPage(1); }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-semibold"
                          >
                            ล้าง
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Table element */}
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            {allData?.headers.map((header, headIdx) => (
                              <th 
                                key={headIdx}
                                className="px-5 py-3.5 text-xs font-extrabold text-slate-600 tracking-wider whitespace-nowrap"
                              >
                                {header && header.trim() ? header.trim() : `ข้อมูล ${headIdx + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.length === 0 ? (
                            <tr>
                              <td colSpan={allData?.headers.length || 1} className="text-center py-12 bg-white text-slate-400 text-xs font-semibold">
                                ไม่พบคู่อันดับที่สอดคล้องกับคีย์คำที่กรอง
                              </td>
                            </tr>
                          ) : (
                            paginatedRows.map((record, recIdx) => {
                              // Dynamic status check for row highlights
                              const isDuplicate = record.some(cell => String(cell).includes('⚠️ เลขต่างด้าวซ้ำ'));
                              const isNew = record.some(cell => String(cell).includes('✅ ข้อมูลใหม่'));

                              let rowClass = "border-b border-slate-100 transition-colors hover:bg-slate-50 ";
                              if (isDuplicate) {
                                rowClass += "bg-red-50/40 hover:bg-red-50/80";
                              } else if (isNew) {
                                rowClass += "bg-emerald-50/20 hover:bg-emerald-50/40";
                              } else if (recIdx % 2 === 0) {
                                rowClass += "bg-slate-50/30";
                              }

                              return (
                                <tr key={recIdx} className={rowClass}>
                                  {record.map((cell, cellIdx) => {
                                    const headerLabel = allData?.headers[cellIdx] || '';
                                    let cellVal = cell && cell.trim() ? cell.trim() : '-';

                                    // Format Thai Date
                                    if (headerLabel.toLowerCase().includes('date') || headerLabel.toLowerCase().includes('วันที่') || headerLabel.toLowerCase().includes('เวลา')) {
                                      cellVal = formatThaiDate(cellVal);
                                    }

                                    const isHighlight = isHighlightField(headerLabel);

                                    return (
                                      <td 
                                        key={cellIdx}
                                        className="px-5 py-3.5 text-xs font-medium whitespace-nowrap align-middle"
                                      >
                                        {cellVal.includes('⚠️ เลขต่างด้าวซ้ำ') ? (
                                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-0.5 rounded-md border border-red-200 font-bold shadow-xs">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {cellVal}
                                          </span>
                                        ) : cellVal.includes('✅ ข้อมูลใหม่') ? (
                                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200 font-bold shadow-xs">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {cellVal}
                                          </span>
                                        ) : (
                                          <span className={isHighlight ? 'text-slate-900 font-bold' : 'text-slate-500'}>
                                            {cellVal}
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-semibold">
                          แสดงผลหน้าที่ {currentPage} จาก {totalPages} หน้า (ทั้งหมด {filteredRows.length} รายการ)
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-xl border text-slate-600 transition-all ${
                              currentPage === 1 
                                ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100' 
                                : 'border-slate-200 bg-white hover:bg-slate-100 active:scale-95'
                            }`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            // Limit the number of pages shown for usability
                            if (totalPages > 6 && Math.abs(currentPage - pageNum) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                              if (pageNum === 2 || pageNum === totalPages - 1) {
                                return <span key={pageNum} className="text-slate-400 text-xs px-1">...</span>;
                              }
                              return null;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  currentPage === pageNum
                                    ? 'bg-blue-900 text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-xl border text-slate-600 transition-all ${
                              currentPage === totalPages 
                                ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100' 
                                : 'border-slate-200 bg-white hover:bg-slate-100 active:scale-95'
                            }`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </section>

        {/* GUIDES AND COLLAPSIBLE ACCORDIONS */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-slate-100">
            <HelpCircle className="w-5 h-5 text-blue-900" />
            <h3 className="text-sm font-extrabold text-slate-800">คู่มือและคำแนะนำในการสืบค้นข้อมูล</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-600">
            
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                การตรวจสอบตามรายบุคคล
              </h4>
              <p className="leading-relaxed pl-3.5 text-slate-500">
                ระบุเลขประจำตัวคนต่างด้าว 13 หลักที่ขึ้นต้นด้วยรหัสสัญชาติตามเอกสารทางการ เพื่อดึงผลตรวจของแต่ละคนและระเบียนประวัติทีละรายการอย่างรวดเร็ว
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                การตรวจสอบตามสถานประกอบการ
              </h4>
              <p className="leading-relaxed pl-3.5 text-slate-500">
                ระบุเลขนายจ้างนิติบุคคล 13 หลักของบริษัทเพื่อเรียกดูตารางสรุปคนต่างด้าวทั้งหมดภายใต้บริษัทนั้นๆ ระบบสนับสนุนการค้นหาและฟิลเตอร์ย่อยในตารางได้ทันที
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                รหัสความหมายของสถานะ
              </h4>
              <p className="leading-relaxed pl-3.5 text-slate-500">
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 text-[10px]">✅ ข้อมูลใหม่</span> คือ ยื่นประวัติใหม่สมบูรณ์ <br />
                <span className="text-red-700 font-semibold bg-red-50 px-1 py-0.5 rounded border border-red-100 text-[10px]">⚠️ เลขต่างด้าวซ้ำ</span> คือ ตรวจสอบรหัสประวัติซ้ำซ้อนในฐานระบบ
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-10 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="text-center md:text-left space-y-1">
            <p className="text-xs font-bold text-slate-300 tracking-wider uppercase">
              eWorkPermit Processing Log and Verification Gateway Node
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              สืบค้น ตรวจสอบความถูกต้อง และจัดพิมพ์ข้อมูลสารบัญสำหรับแรงงานต่างด้าว 4 สัญชาติ ยื่นคำขอ eWorkPermit
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Secure SSL Connection</span>
              <span className="text-slate-700">|</span>
              <span>Cloud SQL & Sheets Synced</span>
            </div>
            <p>© {new Date().getFullYear()} eWorkPermit Data Verification Services.</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
