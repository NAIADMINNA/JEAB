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
  getThaiDateTimeParts,
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

  // Excel-friendly Thai HTML/XLS Export
  const handleExportExcel = () => {
    if (!searchResult || !allData) return;
    
    const rowsToExport = searchType === 'employer' ? filteredRows : searchResult;
    
    // Construct HTML table content for Excel
    const tableHeader = allData.headers.map(h => `<th style="background-color: #1e3a8a; color: #FFFFFF; font-weight: bold; border: 1px solid #CBD5E1; padding: 10px; font-size: 14px;">${h}</th>`).join('');
    
    const tableRows = rowsToExport.map(row => {
      const cells = row.map(cell => {
        const val = String(cell || '');
        // We use mso-number-format:'\@' to prevent Excel from converting 13-digit numbers to scientific notation
        return `<td style="border: 1px solid #CBD5E1; padding: 8px; font-size: 13px; mso-number-format:'\\@';">${val}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>eWorkPermit Export</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family: 'Segoe UI', 'Tahoma', sans-serif;">
        <table style="border-collapse: collapse;">
          <thead>
            <tr>${tableHeader}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `eworkpermit_export_${employerNumber || alienId || 'data'}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-amber-500 selection:text-white antialiased relative overflow-hidden">
      
      {/* Ambient colorful background blobs */}
      <div className="absolute top-[10%] left-[-15%] w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/5 via-indigo-600/5 to-transparent rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[-15%] w-[600px] h-[600px] bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-transparent rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[50%] left-[30%] w-[500px] h-[500px] bg-gradient-to-r from-blue-500/5 to-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ENTERPRISE GLOW HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-md overflow-hidden relative border-b border-amber-500/20">
        {/* Abstract vector decor circles */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-20 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Logo area */}
            <div className="flex items-center gap-3.5">
              <div className="w-12.5 h-12.5 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20 border border-amber-300/40 relative">
                <ShieldCheck className="w-6.5 h-6.5 text-slate-950" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    ระบบตรวจสอบสถานะข้อมูลแรงงานต่างด้าว
                  </h1>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 border border-amber-400/30 text-amber-700 font-bold uppercase tracking-wider">
                    eWorkPermit
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1 tracking-wide flex items-center gap-1.5">
                  <span className="text-amber-700 font-bold">eWorkPermit Verification & Data Matching Platform</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-amber-600 font-bold">สำนักบริหารแรงงานต่างด้าว</span>
                </p>
              </div>
            </div>

            {/* Right side live status & actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 self-start md:self-center">
              {/* Real-time Ticking Clock */}
              <div className="flex items-center gap-2.5 text-slate-700 text-xs font-bold bg-amber-50/70 border border-amber-200/60 rounded-xl px-4 py-2.5 shadow-sm hover:border-amber-300 hover:bg-amber-50 transition-all duration-300">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                <span className="font-mono tracking-wide text-slate-800 font-black flex flex-wrap gap-x-2">
                  <span className="text-slate-600">{getThaiDateTimeParts(currentTime).date}</span>
                  <span className="whitespace-nowrap text-amber-700">{getThaiDateTimeParts(currentTime).time}</span>
                </span>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-sm hover:border-emerald-300 transition-all duration-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black text-emerald-700 tracking-wide">
                  ฐานข้อมูลพร้อมใช้งาน
                </span>
              </div>

              {loadError && (
                <button 
                  onClick={loadSheetData}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-lg"
                >
                  <WifiOff className="w-3.5 h-3.5" /> รีโหลดระบบ
                </button>
              )}
            </div>

          </div>
        </div>
        
        {/* Dynamic color stripe at bottom of header */}
        <div className="h-[3px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 w-full shrink-0"></div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex-grow flex flex-col gap-6 relative z-10">
        
        {/* DUAL LOOKUP FORMS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          
          {/* INDIVIDUAL FORM (BLUE CARD) */}
          <div className="relative rounded-3xl bg-white border border-slate-200/80 shadow-md shadow-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#1e3a8a]/5 hover:border-blue-400/60 flex flex-col justify-between min-h-[320px]">
            {/* Top accent color stripe */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#1e40af]"></div>

            {/* Form Dim Lock Overlay */}
            {activeForm === 'employer' && (
              <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-[3px] z-20 flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4 text-slate-500 shadow-sm">
                  <Briefcase className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-black text-slate-800">กำลังสืบค้นแบบนิติบุคคล / นายจ้าง</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-[300px] leading-relaxed font-medium">
                  ระบบจำกัดสิทธิ์การป้อนข้อมูลพร้อมกันเพื่อลดความสับสน กรุณากดปุ่มล้างค่าในฟอร์มนายจ้างก่อนทำการสลับประเภท
                </p>
                <button 
                  onClick={() => handleReset('employer')}
                  className="mt-4.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> ล้างค่าฟอร์มนายจ้าง
                </button>
              </div>
            )}

            <div className="p-6 pt-7">
              <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <UserCheck className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">ค้นหาข้อมูลตามรายบุคคล</h2>
                  <p className="text-[11px] text-[#1e3a8a] font-bold mt-0.5">Alien worker status lookup by individual ID</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-5 leading-relaxed font-medium">
                กรอกเลขประจำตัวคนต่างด้าว 13 หลักเพื่อดึงรายการผลการดำเนินการจากระบบแจ้งข้อมูลแรงงานต่างด้าว 4 สัญชาติ กรณีไม่พบข้อมูลในระบบ eWorkPermit.doe.go.th
              </p>

              <form onSubmit={(e) => { e.preventDefault(); performSearch('id'); }} className="space-y-4">
                <div>
                  <label htmlFor="alien-id-input" className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide uppercase">
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
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3.5 pr-11 text-sm tracking-widest text-slate-900 transition-all focus:outline-none focus:bg-white focus:border-[#1e3a8a] focus:ring-4 focus:ring-blue-100/50 placeholder:text-slate-400 placeholder:tracking-normal font-mono font-bold"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center text-[#1e3a8a]">
                      <IdCard className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReset('id')}
                    disabled={!alienId}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-xs font-bold border transition-colors ${
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
                    className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white transition-all shadow-md ${
                      alienId.length === 13 && !isSearching
                        ? 'bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#1e40af] hover:from-[#1d4ed8] hover:to-[#1e40af] hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]' 
                        : 'bg-[#1e3a8a]/40 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Search className="w-4 h-4" /> ตรวจสอบข้อมูล
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-50/80 border-t border-slate-100 py-3.5 px-6 flex items-center justify-between text-[11px] text-slate-400 font-bold">
              <span className="text-[#1e3a8a]">ประเภทข้อมูล: รายบุคคล (Individual)</span>
              <span>เลขประจำตัวแรงงานต่างด้าว</span>
            </div>
          </div>

          {/* EMPLOYER FORM (GOLD CARD) */}
          <div className="relative rounded-3xl bg-white border border-slate-200/80 shadow-md shadow-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-400/60 flex flex-col justify-between min-h-[320px]">
            {/* Top accent color stripe */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700"></div>

            {/* Form Dim Lock Overlay */}
            {activeForm === 'id' && (
              <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-[3px] z-20 flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4 text-slate-500 shadow-sm">
                  <UserCheck className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-black text-slate-800">กำลังสืบค้นแบบบุคคลต่างด้าว</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-[300px] leading-relaxed font-medium">
                  ระบบจำกัดสิทธิ์การป้อนข้อมูลพร้อมกันเพื่อลดความสับสน กรุณากดปุ่มล้างค่าในฟอร์มรายบุคคลก่อนทำการสลับประเภท
                </p>
                <button 
                  onClick={() => handleReset('id')}
                  className="mt-4.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> ล้างค่าฟอร์มรายบุคคล
                </button>
              </div>
            )}

            <div className="p-6 pt-7">
              <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                  <Building2 className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">ค้นหาข้อมูลตามสถานประกอบการ</h2>
                  <p className="text-[11px] text-amber-700 font-bold mt-0.5">Company or Employer master search</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-5 leading-relaxed font-medium">
                กรอกเลขทะเบียนนิติบุคคล หรือเลขนายจ้าง 13 หลัก เพื่อแสดงรายการคนต่างด้าวทั้งหมดภายใต้สังกัดเพื่อดึงรายการผลการดำเนินการจากระบบแจ้งข้อมูลแรงงานต่างด้าว 4 สัญชาติ กรณีไม่พบข้อมูลในระบบ eWorkPermit.doe.go.th
              </p>

              <form onSubmit={(e) => { e.preventDefault(); performSearch('employer'); }} className="space-y-4">
                <div>
                  <label htmlFor="employer-id-input" className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide uppercase">
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
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3.5 pr-11 text-sm tracking-widest text-slate-900 transition-all focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-100/50 placeholder:text-slate-400 placeholder:tracking-normal font-mono font-bold"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center text-amber-600">
                      <Briefcase className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReset('employer')}
                    disabled={!employerNumber}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-xs font-bold border transition-colors ${
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
                    className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white transition-all shadow-md ${
                      employerNumber.length === 13 && !isSearching
                        ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-700 hover:to-amber-600 hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98]' 
                        : 'bg-amber-950/40 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Search className="w-4 h-4" /> ตรวจสอบข้อมูล
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-50/80 border-t border-slate-100 py-3.5 px-6 flex items-center justify-between text-[11px] text-amber-700 font-bold">
              <span>ประเภทข้อมูล: นายจ้าง (Employer)</span>
            </div>
          </div>

        </div>

        {/* INPUT ERROR / FEEDBACK LINE */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4.5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-700 shadow-sm"
          >
            <AlertCircle className="w-5.5 h-5.5 shrink-0 text-red-600" />
            <p className="text-xs font-black">{errorMsg}</p>
          </motion.div>
        )}

        {/* SEARCH AND RESULTS FEEDBACKS */}
        <section className="w-full">
          <AnimatePresence mode="wait">
            


            {/* LOADING STATE WITH SHIMMER */}
            {isSearching && (
              <motion.div 
                key="searching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white border-2 border-indigo-100/30 rounded-3xl p-10 shadow-lg flex flex-col items-center justify-center text-center gap-5"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 border-r-blue-900 border-b-amber-600 animate-spin"></div>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">กำลังสแกนโครงข่ายคลาวด์ eWorkPermit...</h3>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">กำลังจัดระเบียบและแมทชิ่งชุดรหัสประวัติ 13 หลัก โปรดรอสักครู่</p>
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
                <div className="bg-white border border-amber-500/20 rounded-3xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight">
                        {searchType === 'id' ? 'ผลการตรวจสอบข้อมูลรายบุคคล' : 'รายการแรงงานในสถานประกอบการ'}
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        {searchType === 'id' 
                          ? `หมายเลขแรงงาน: ${alienId}` 
                          : `รหัสบริษัทนายจ้าง: ${employerNumber} (พบทั้งหมด ${searchResult.length} รายการ)`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Excel Export Button (Only if we have results) */}
                    {searchResult.length > 0 && (
                      <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 hover:shadow-lg hover:shadow-amber-500/20 text-white rounded-2xl px-5 py-2.5 text-xs font-bold transition-all active:scale-[0.98]"
                      >
                        <Download className="w-4 h-4" /> ส่งออกเป็นไฟล์ Excel
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleReset(searchType)}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-750 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all"
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
                  <div className="flex flex-col gap-6 w-full">
                    {searchResult.map((record, recIdx) => (
                      <div 
                        key={recIdx} 
                        className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:border-amber-400/50 transition-all duration-300 relative"
                      >
                        {/* Decorative colorful side bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-500 via-amber-600 to-blue-900"></div>

                        {/* Record Title Header */}
                        <div className="bg-slate-50/80 border-b border-slate-100 py-4.5 px-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <span className="text-xs font-black text-slate-800 tracking-wide flex items-center gap-2">
                            <History className="w-4.5 h-4.5 text-amber-600" /> 
                            ระเบียนข้อมูลที่ {recIdx + 1}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border-2 border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-extrabold shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
                            ประมวลผลสำเร็จ
                          </span>
                        </div>

                        {/* HERO STATUS BANNER */}
                        {(() => {
                          const statusIdx = allData?.headers.findIndex(header => {
                            const label = (header || '').toLowerCase();
                            return label.includes('ผลการดำเนินการ') || label.includes('result') || label.includes('status') || label.includes('สถานะ');
                          });

                          if (statusIdx !== undefined && statusIdx !== -1) {
                            const labelText = allData?.headers[statusIdx] || 'ผลการดำเนินการ';
                            const cellVal = (record[statusIdx] || '').trim();
                            
                            const isDuplicate = cellVal.includes('⚠️ เลขต่างด้าวซ้ำ') || cellVal.includes('ซ้ำ');
                            const isNew = cellVal.includes('✅ ข้อมูลใหม่') || cellVal.includes('ใหม่') || cellVal.includes('สำเร็จ');
                            
                            let alertBg = "bg-gradient-to-r from-blue-50/60 to-indigo-50/20 border-blue-200/40 text-[#1e3a8a]";
                            let icon = <Info className="w-5.5 h-5.5 text-[#2563eb] shrink-0" />;
                            let badgeStyle = "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20";
                            let descriptionText = "ระบบได้ทำการตรวจสอบข้อมูลเบื้องต้นเรียบร้อยแล้ว";

                            if (isDuplicate) {
                                alertBg = "bg-gradient-to-r from-red-50 to-rose-50/40 border-red-200/60 text-red-900";
                                icon = <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 animate-bounce" />;
                                badgeStyle = "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/20 animate-pulse";
                                descriptionText = "คำเตือน: ตรวจพบชุดข้อมูลที่มีเลขประจำตัวแรงงานต่างด้าวซ้ำซ้อนในระบบฐานข้อมูลสารบบ eWorkPermit กรุณาตรวจสอบเอกสารแนบ";
                            } else if (isNew) {
                                alertBg = "bg-gradient-to-r from-emerald-50 to-teal-50/40 border-emerald-200/60 text-emerald-950";
                                icon = <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />;
                                badgeStyle = "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20";
                                descriptionText = "ข้อมูลใหม่ผ่านการพิจารณาตรวจสอบความถูกต้องและขึ้นทะเบียนเข้าระบบเรียบร้อย";
                            } else if (cellVal.includes('รอ') || cellVal.includes('พิจารณา')) {
                                alertBg = "bg-gradient-to-r from-amber-50 to-orange-50/40 border-amber-200/60 text-amber-950";
                                icon = <Clock className="w-6 h-6 text-amber-600 shrink-0" />;
                                badgeStyle = "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20";
                                descriptionText = "เอกสารอยู่ระหว่างกระบวนการตรวจสอบและพิจารณาความสมบูรณ์โดยเจ้าหน้าที่ฝ่ายทะเบียน";
                            }

                            return (
                              <div className={`mx-7 mt-6 p-5 rounded-2xl border ${alertBg} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
                                <div className="flex items-start md:items-center gap-3.5">
                                  <div className="p-2.5 bg-white rounded-xl shadow-sm shrink-0 flex items-center justify-center border border-slate-100">
                                    {icon}
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-60 block">
                                      {labelText} (Latest Operation Status)
                                    </span>
                                    <h4 className="text-base font-black mt-0.5 tracking-tight">
                                      {cellVal}
                                    </h4>
                                    <p className="text-xs opacity-90 mt-1 leading-relaxed font-semibold">
                                      {descriptionText}
                                    </p>
                                  </div>
                                </div>
                                <div className="self-start md:self-center shrink-0">
                                  <span className={`inline-flex px-3.5 py-2 text-xs font-black rounded-xl uppercase tracking-wide ${badgeStyle}`}>
                                    สถานะการดำเนินการ
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 mt-5 px-7 pb-6">
                          {allData?.headers.map((header, headIdx) => {
                            const labelText = header && header.trim() ? header.trim() : `ข้อมูลช่องที่ ${headIdx + 1}`;
                            let cellVal = record[headIdx] && record[headIdx].trim() ? record[headIdx].trim() : '-';

                            // Format dates
                            if (labelText.toLowerCase().includes('date') || labelText.toLowerCase().includes('วันที่') || labelText.toLowerCase().includes('เวลา')) {
                              cellVal = formatThaiDate(cellVal);
                            }

                            const isStatus = labelText.toLowerCase().includes('ผลการดำเนินการ') || labelText.toLowerCase().includes('result') || labelText.toLowerCase().includes('status') || labelText.includes('สถานะ');

                            let containerStyle = "border-b border-r border-slate-100 p-4.5 flex flex-col justify-between hover:bg-slate-50/50 transition-colors";
                            if (isStatus) {
                              const isDuplicate = cellVal.includes('⚠️ เลขต่างด้าวซ้ำ') || cellVal.includes('ซ้ำ');
                              const isNew = cellVal.includes('✅ ข้อมูลใหม่') || cellVal.includes('ใหม่') || cellVal.includes('สำเร็จ');
                              
                              if (isDuplicate) {
                                containerStyle = "border-b border-r border-red-100 p-4.5 flex flex-col justify-between bg-red-50/30 hover:bg-red-50/50 transition-colors border-l-4 border-l-red-500 col-span-1 md:col-span-2 lg:col-span-3";
                              } else if (isNew) {
                                containerStyle = "border-b border-r border-emerald-100 p-4.5 flex flex-col justify-between bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors border-l-4 border-l-emerald-500 col-span-1 md:col-span-2 lg:col-span-3";
                              } else {
                                containerStyle = "border-b border-r border-blue-100 p-4.5 flex flex-col justify-between bg-blue-50/20 hover:bg-blue-50/40 transition-colors border-l-4 border-l-blue-500 col-span-1 md:col-span-2 lg:col-span-3";
                              }
                            }

                            return (
                              <div 
                                key={headIdx} 
                                className={containerStyle}
                              >
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  {labelText}
                                </span>
                                <div className="mt-1.5">
                                  {isStatus ? (
                                    cellVal.includes('⚠️ เลขต่างด้าวซ้ำ') ? (
                                      <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-xl border border-red-200 text-xs font-black shadow-xs">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        {cellVal}
                                      </span>
                                    ) : cellVal.includes('✅ ข้อมูลใหม่') ? (
                                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200 text-xs font-black shadow-xs">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {cellVal}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl px-3 py-1 text-xs font-black shadow-xs">
                                        <Info className="w-3.5 h-3.5" />
                                        {cellVal}
                                      </span>
                                    )
                                  ) : (
                                    <span className={`text-xs font-semibold ${isHighlightField(labelText) ? 'text-slate-900 font-extrabold text-sm' : 'text-slate-700'}`}>
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
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 pl-8 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50"
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
                                    const isStatusField = headerLabel.toLowerCase().includes('ผลการดำเนินการ') || headerLabel.toLowerCase().includes('result') || headerLabel.toLowerCase().includes('status') || headerLabel.includes('สถานะ');

                                    return (
                                      <td 
                                        key={cellIdx}
                                        className="px-5 py-3.5 text-xs font-medium whitespace-nowrap align-middle"
                                      >
                                        {isStatusField ? (
                                          cellVal.includes('⚠️ เลขต่างด้าวซ้ำ') ? (
                                            <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-full border border-red-200 font-black shadow-xs">
                                              <AlertTriangle className="w-3.5 h-3.5" />
                                              {cellVal}
                                            </span>
                                          ) : cellVal.includes('✅ ข้อมูลใหม่') ? (
                                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200 font-black shadow-xs animate-pulse">
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                              {cellVal}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-950 px-3 py-1.5 rounded-full border border-blue-150 font-black shadow-xs">
                                              <Info className="w-3.5 h-3.5" />
                                              {cellVal}
                                            </span>
                                          )
                                        ) : (
                                          <span className={isHighlight ? 'text-slate-900 font-extrabold text-xs' : 'text-slate-500 font-semibold'}>
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



      </main>

      {/* FOOTER */}
      <footer className="bg-slate-100 text-slate-600 border-t border-slate-250 py-6 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="text-center md:text-left space-y-1">
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Secure SSL Connection</span>
              <span className="text-slate-300">|</span>
              <span>Cloud SQL & Sheets Synced</span>
            </div>
            <p className="font-medium">© {new Date().getFullYear()} eWorkPermit Data Verification Services.</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
