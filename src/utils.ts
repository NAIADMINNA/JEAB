export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i++;
      }
      row.push(current);
      if (row.some(cell => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length || row.length) {
    row.push(current);
    if (row.some(cell => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

export function normalizeId(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function formatThaiDate(dateString: string): string {
  if (!dateString || dateString.trim() === '') return '-';
  try {
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const slashMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*,\s*\d{1,2}:\d{2}:\d{2})?$/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10) - 1;
      const year = parseInt(slashMatch[3], 10);
      if (month < 0 || month > 11 || day < 1 || day > 31) return dateString;
      return `${day} ${thaiMonths[month]} ${year + 543}`;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
  } catch {
    return dateString;
  }
}

export function formatThaiDateTime(now: Date = new Date()): string {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const day = now.getDate();
  const month = thaiMonths[now.getMonth()];
  const year = now.getFullYear() + 543;
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `ข้อมูล ณ วันที่ ${day} ${month} ${year} เวลา ${hours}:${minutes}:${seconds} น.`;
}

export function getThaiDateTimeParts(now: Date = new Date()) {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const day = now.getDate();
  const month = thaiMonths[now.getMonth()];
  const year = now.getFullYear() + 543;
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return {
    date: `ข้อมูล ณ วันที่ ${day} ${month} ${year}`,
    time: `เวลา ${hours}:${minutes}:${seconds} น.`
  };
}

export function isHighlightField(label: string): boolean {
  const keys = ['ชื่อ', 'name', 'status', 'สถานะ', 'passport', 'หนังสือเดินทาง'];
  const lower = (label || '').toLowerCase();
  return keys.some(key => lower.includes(key));
}
