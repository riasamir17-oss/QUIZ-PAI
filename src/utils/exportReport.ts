import { StudentSubmission, QuizScheduleConfig } from '../types/quiz';

/**
 * Generates an Excel-ready CSV file with UTF-8 BOM.
 */
export function exportToExcelCSV(submissions: StudentSubmission[], config: QuizScheduleConfig) {
  const headers = [
    'No',
    'NIK / NIM',
    'Nama Lengkap',
    'Kelas',
    'Status Ujian',
    'Skor PG (Maks 30%)',
    'Skor Essay (Maks 70%)',
    'Nilai Akhir (100%)',
    'Predikat',
    'Jumlah Pelanggaran',
    'Waktu Mulai',
    'Waktu Selesai',
  ];

  const escapeCsv = (str: string | number) => {
    const val = String(str ?? '').replace(/"/g, '""');
    return `"${val}"`;
  };

  const getPredicate = (score: number) => {
    if (score >= 85) return 'A (Sangat Memuaskan)';
    if (score >= 75) return 'B (Baik)';
    if (score >= 65) return 'C (Cukup)';
    if (score >= 50) return 'D (Kurang)';
    return 'E (Tidak Lulus)';
  };

  const rows = submissions.map((sub, index) => {
    const pg = sub.scores?.pgTotal ?? 0;
    const essay = sub.scores?.essayTotal ?? 0;
    const total = sub.scores?.grandTotal ?? 0;

    let statusLabel = 'Sedang Mengerjakan';
    if (sub.status === 'submitted') statusLabel = 'Selesai';
    else if (sub.status === 'blocked') statusLabel = 'Diblokir (Pelanggaran)';
    else if (sub.status === 'disqualified') statusLabel = 'Didiskualifikasi';

    return [
      index + 1,
      escapeCsv(sub.student.nik),
      escapeCsv(sub.student.fullName),
      escapeCsv(sub.student.studentClass),
      escapeCsv(statusLabel),
      escapeCsv(pg),
      escapeCsv(essay),
      escapeCsv(total),
      escapeCsv(getPredicate(total)),
      escapeCsv(sub.violations?.length || sub.strikeCount || 0),
      escapeCsv(sub.startedAt ? new Date(sub.startedAt).toLocaleString('id-ID') : '-'),
      escapeCsv(sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('id-ID') : '-'),
    ].join(',');
  });

  const metadataRows = [
    `"LAPORAN HASIL NILAI KUIS INTERAKTIF - ${config.title.toUpperCase()}"`,
    `"Mata Kuliah: ${config.courseCode} | Program Studi: ${config.prodi} | ${config.faculty}"`,
    `"Tahun Akademik: ${config.academicYear} | Diunduh Pada: ${new Date().toLocaleString('id-ID')}"`,
    '""',
  ];

  const csvContent = '\uFEFF' + [...metadataRows, headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanDate = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `Nilai_Quiz_PAI_${config.courseCode}_${cleanDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers standard browser window.print() formatted for the academic grading sheet.
 */
export function printGradebookPDF() {
  window.print();
}
