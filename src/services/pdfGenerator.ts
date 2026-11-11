import { jsPDF } from 'jspdf';
import {
  BputStudentDetails,
  BputMarksData,
  BulkStudentResult,
  classifyBacklogGrade,
} from '../types/bput';
import { BPUT_LOGO_DATA_URL } from '../assets/bputLogo';

/**
 * Generates and downloads a crisp, official vector PDF marksheet for an individual student.
 * Meets strict requirements for professional typography, official BPUT borders,
 * CBCS credits calculation, grade colors, and verified institutional seal.
 */
export function generateStudentMarksheetPdf(
  student: BputStudentDetails | null | undefined,
  marksData: BputMarksData,
  examSession: string,
  semesterName?: string
): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  // Safe fallback data extraction
  const rollNo = (student?.rollNo || marksData.grades?.[0]?.rollNo || 'STUDENT').trim();
  const studentName = (student?.studentName || 'PROVISIONAL CANDIDATE').trim().toUpperCase();
  const collegeName = (student?.collegeName || 'CONSTITUENT / AFFILIATED COLLEGE, BPUT').trim();
  const branchName = (student?.branchName || marksData.grades?.[0]?.branchName || 'ENGINEERING & TECHNOLOGY').trim();
  const semLabel = semesterName || student?.semId || marksData.grades?.[0]?.semId || 'SEMESTER';
  const sessionLabel = examSession || 'ACADEMIC SESSION';

  // 1. Double Institutional Border
  // Outer Border (Navy #0B1D3A)
  doc.setDrawColor(11, 29, 58);
  doc.setLineWidth(0.7);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);

  // Inner subtle border (Slate #CBD5E1)
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.rect(margin + 1.2, margin + 1.2, contentWidth - 2.4, pageHeight - margin * 2 - 2.4);

  let y = margin + 4;

  // 2. Unofficial Academic Portal Logo Emblem
  const logoW = 16;
  const logoH = 16;
  const logoX = (pageWidth - logoW) / 2;
  try {
    doc.addImage(BPUT_LOGO_DATA_URL, 'PNG', logoX, y, logoW, logoH);
    y += logoH + 2.5;
  } catch (err) {
    console.error('Error rendering portal logo in PDF:', err);
    y += 12;
  }

  // 3. Institution Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(11, 29, 58); // BPUT deep navy
  doc.text('BIJU PATNAIK UNIVERSITY OF TECHNOLOGY, ROURKELA, ODISHA', pageWidth / 2, y, {
    align: 'center',
  });

  y += 4.5;
  doc.setFontSize(9.5);
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text('PROVISIONAL STATEMENT OF GRADES', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Academic Examination: Semester – ${semLabel}, ${sessionLabel}`, pageWidth / 2, y, {
    align: 'center',
  });

  y += 3.5;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 4, y, pageWidth - margin - 4, y);
  y += 4.5;

  // 4. Student Bio Profile Box
  const bioBoxH = 34;
  doc.setFillColor(248, 250, 252); // slate 50
  doc.roundedRect(margin + 4, y, contentWidth - 8, bioBoxH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + 4, y, contentWidth - 8, bioBoxH, 2, 2, 'S');

  const startBioY = y + 5.5;
  const leftColX = margin + 8;
  const valColX = margin + 46;
  const rowH = 6;

  const bioRows = [
    { label: 'Registration No.', val: rollNo, isMono: true },
    { label: 'Student Name', val: studentName, isBold: true },
    { label: 'College / Institute', val: collegeName },
    { label: 'Branch / Degree', val: branchName },
    {
      label: 'Examination',
      val: `Semester – ${semLabel}, ${sessionLabel}`,
      isAccent: true,
    },
  ];

  bioRows.forEach((r, idx) => {
    const curY = startBioY + idx * rowH;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(r.label + ':', leftColX, curY);

    if (r.isMono) {
      doc.setTextColor(29, 78, 216); // blue 700
      doc.setFont('courier', 'bold');
      doc.setFontSize(9.5);
    } else if (r.isAccent) {
      doc.setTextColor(67, 56, 202); // indigo 700
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
    } else {
      doc.setTextColor(15, 23, 42); // slate 900
      doc.setFont('helvetica', r.isBold ? 'bold' : 'normal');
      doc.setFontSize(r.isBold ? 8.5 : 8);
    }

    const maxValW = contentWidth - 52;
    const cleanText = doc.splitTextToSize(r.val, maxValW)[0] || r.val;
    doc.text(cleanText, valColX, curY);
  });

  y += bioBoxH + 5;

  // 5. Subject Grades Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SEMESTER SUBJECT GRADES & CREDIT PERFORMANCE', margin + 4, y);
  y += 2.5;

  const colX = {
    sno: margin + 4,
    code: margin + 16,
    name: margin + 42,
    type: margin + 126,
    credits: margin + 150,
    grade: margin + 170,
  };
  const tableW = contentWidth - 8;

  // Table Header Row
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(colX.sno, y, tableW, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  doc.text('S.No', colX.sno + 3, y + 4.5);
  doc.text('Subject Code', colX.code, y + 4.5);
  doc.text('Subject Name', colX.name, y + 4.5);
  doc.text('Type', colX.type, y + 4.5);
  doc.text('Credits', colX.credits, y + 4.5);
  doc.text('Final Grade', colX.grade, y + 4.5);

  y += 6.5;

  // Render Table Rows
  const grades = marksData.grades || [];
  const maxRowsFit = 16;
  const displayGrades = grades.slice(0, maxRowsFit);
  const rowHeight = grades.length > 11 ? 5.5 : 6.2;

  displayGrades.forEach((g, idx) => {
    const isEven = idx % 2 === 0;
    const isPractical =
      String(g.subjectTP || '').toUpperCase().trim() === 'P' ||
      String(g.subjectTP || '').toUpperCase().trim() === 'PR';
    const isSessional = String(g.subjectTP || '').toUpperCase().trim() === 'S';
    const typeLabel = isPractical ? 'Practical' : isSessional ? 'Sessional' : 'Theory';

    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(colX.sno, y, tableW, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(colX.sno, y + rowHeight, colX.sno + tableW, y + rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(idx + 1), colX.sno + 3.5, y + rowHeight * 0.7);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59);
    doc.text(g.subjectCODE || '', colX.code, y + rowHeight * 0.7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const clippedSubName = doc.splitTextToSize(g.subjectName || '', 78)[0] || '';
    doc.text(clippedSubName, colX.name, y + rowHeight * 0.7);

    doc.setFontSize(7);
    doc.setTextColor(isPractical ? 126 : 71, isPractical ? 34 : 85, isPractical ? 206 : 105);
    doc.text(typeLabel, colX.type, y + rowHeight * 0.7);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(g.subjectCredits ?? ''), colX.credits + 3, y + rowHeight * 0.7);

    // Grade formatting: Red only to back subjects, other without back font color green
    const cleanGrade = (g.grade || '').toUpperCase().trim();
    const tp = String(g.subjectTP || '').toUpperCase().trim();
    const classification = classifyBacklogGrade(cleanGrade, tp);
    const isBack = classification.isBacklog;

    if (isBack) {
      doc.setTextColor(220, 38, 38); // Red color for back subjects
    } else {
      doc.setTextColor(22, 101, 52); // Green font color for passed/without back
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const displayGradeText = classification.displayGrade || cleanGrade;
    doc.text(displayGradeText, colX.grade + 3, y + rowHeight * 0.7);

    if (g.recheck === 1) {
      const gradeWidth = doc.getTextWidth(displayGradeText);
      doc.setTextColor(220, 38, 38); // Bright Red asterisk from real data
      doc.setFontSize(9.5);
      doc.text('*', colX.grade + 3 + gradeWidth + 0.8, y + rowHeight * 0.7);
    }

    y += rowHeight;
  });

  // Table Total Footer Row
  doc.setFillColor(241, 245, 249);
  doc.rect(colX.sno, y, tableW, 6.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(colX.sno, y + 6.5, colX.sno + tableW, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CUMULATIVE SEMESTER TOTAL:', colX.name, y + 4.5);

  const totalCredits = marksData.sgpadetails?.cretits || marksData.sgpadetails?.credits || '0';
  doc.setTextColor(30, 41, 59);
  doc.text(`Credits: ${totalCredits}`, colX.credits - 2, y + 4.5);

  const sgpa = marksData.sgpadetails?.sgpa || '0.00';
  doc.setTextColor(22, 101, 52);
  doc.text(`SGPA: ${sgpa}`, colX.grade - 2, y + 4.5);

  y += 10;

  // 6. Summary Metrics Cards (4 Badges)
  const cardW = (contentWidth - 8 - 9) / 4;
  const cardH = 13;
  const sgpaNum = parseFloat(String(sgpa)) || 0;

  let backlogs = 0;
  grades.forEach((g) => {
    const gr = String(g.grade || '').toUpperCase().trim();
    if (gr === 'F' || gr === 'M' || gr === 'S' || gr.includes('INT') || gr.includes('EX') || (gr === 'P' && String(g.grade).toLowerCase() === 'pending')) {
      backlogs++;
    }
  });

  const cardsData = [
    { title: 'SEMESTER SGPA', val: sgpaNum.toFixed(2), color: [180, 83, 9] },
    { title: 'TOTAL CREDITS', val: String(totalCredits), color: [29, 78, 216] },
    { title: 'RESULT STATUS', val: backlogs === 0 ? 'PASS' : 'BACKLOG', color: backlogs === 0 ? [22, 101, 52] : [190, 18, 60] },
    { title: 'PENDING BACKLOGS', val: String(backlogs), color: backlogs === 0 ? [51, 65, 85] : [190, 18, 60] },
  ];

  cardsData.forEach((c, idx) => {
    const cX = margin + 4 + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cX, y, cardW, cardH, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cX, y, cardW, cardH, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.title, cX + cardW / 2, y + 4.2, { align: 'center' });

    doc.setFontSize(9.5);
    doc.text(c.val, cX + cardW / 2, y + 10, { align: 'center' });
  });

  y += cardH + 6;

  // 7. Disclaimer Notice Box
  const disclaimerH = 15;
  doc.setFillColor(238, 242, 255); // indigo 50
  doc.roundedRect(margin + 4, y, contentWidth - 8, disclaimerH, 1.5, 1.5, 'F');
  doc.setDrawColor(224, 231, 255);
  doc.roundedRect(margin + 4, y, contentWidth - 8, disclaimerH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(49, 46, 129);
  doc.text('PROVISIONAL RESULT NOTICE & INSTRUCTIONS:', margin + 7, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(67, 56, 202);
  doc.text(
    '1. This statement of marks is computer generated and provisional for immediate educational reference.',
    margin + 7,
    y + 7.5
  );
  doc.text(
    '2. Original grade cards will be issued by BPUT through the respective constituent/affiliated college.',
    margin + 7,
    y + 10.8
  );
  doc.text(
    '3. BPUT shall not be responsible for any electronic transmission discrepancy.',
    margin + 7,
    y + 13.8
  );

  // Position footer nicely at bottom
  const footerY = pageHeight - margin - 8;

  // 8. Clean Simple Footer (Removed unauthorized signatures and gateway claims as requested)
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 4, footerY, pageWidth - margin - 4, footerY);

  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Provisional Statement of Grades • For educational reference only', margin + 5, footerY + 4.5);
  doc.text(`Print Date: ${printDate}`, pageWidth - margin - 5, footerY + 4.5, { align: 'right' });

  // Direct Browser Download
  const safeRoll = rollNo.replace(/[^a-zA-Z0-9]/g, '_');
  const safeSession = sessionLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `BPUT_Marksheet_${safeRoll}_${safeSession}.pdf`;

  doc.save(filename);
  return filename;
}

/**
 * Generates and downloads a clean, multi-page vector PDF report for bulk class / college results.
 */
export function generateBulkClassReportPdf(
  results: BulkStudentResult[],
  session: string,
  averageSgpa: string,
  passedCount: number,
  backlogCount: number,
  extBacklogsCount?: number,
  intBacklogsCount?: number
): string {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  let y = margin + 3.5;

  // 1. Official BPUT Emblem Logo (Centered at top)
  const bulkLogoW = 14;
  const bulkLogoH = 14;
  const logoX = (pageWidth - bulkLogoW) / 2;
  try {
    doc.addImage(BPUT_LOGO_DATA_URL, 'PNG', logoX, y, bulkLogoW, bulkLogoH);
    y += bulkLogoH + 2.5;
  } catch (err) {
    console.error('Error adding logo in bulk report:', err);
    y += 12;
  }

  // 2. Institution Header (Centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 29, 58);
  doc.text('BIJU PATNAIK UNIVERSITY OF TECHNOLOGY, ROURKELA, ODISHA', pageWidth / 2, y, {
    align: 'center',
  });

  y += 4.5;
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text('PROVISIONAL CLASS & BATCH EXAMINATION EVALUATION REPORT', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // 3. Structured Summary Statistics Card
  const statsBoxY = y;
  const statsBoxH = 7.5;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, statsBoxY, contentWidth, statsBoxH, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, statsBoxY, contentWidth, statsBoxH, 1.5, 1.5, 'S');

  const backlogBreakdown =
    (extBacklogsCount !== undefined || intBacklogsCount !== undefined)
      ? ` [Ext F(EX): ${extBacklogsCount || 0}, Int F(INT): ${intBacklogsCount || 0}]`
      : '';
  const passPercent = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;

  // Left: Session
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Academic Session: ${session}`, margin + 5, statsBoxY + 5);

  // Center: Total & Breakdown
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Total Candidates: ${results.length}   |   All Clear: ${passedCount} (${passPercent}%)   |   Backlogs: ${backlogCount}${backlogBreakdown}`,
    pageWidth / 2,
    statsBoxY + 5,
    { align: 'center' }
  );

  // Right: Mean SGPA
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Class Mean SGPA: ${averageSgpa}`, pageWidth - margin - 5, statsBoxY + 5, { align: 'right' });

  y += statsBoxH + 4;

  // Table Columns with increased width for Papers & Obtained Grades
  const cols = {
    rank: margin,
    roll: margin + 10,
    name: margin + 36,
    branch: margin + 74,
    sgpa: margin + 116,
    credits: margin + 130,
    papers: margin + 144,
  };
  const papersColWidth = contentWidth - 144;

  const renderTableHeader = (currentY: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    doc.text('Rank', cols.rank + 1.5, currentY + 4.8);
    doc.text('Reg No.', cols.roll, currentY + 4.8);
    doc.text('Student Name', cols.name, currentY + 4.8);
    doc.text('Branch & College', cols.branch, currentY + 4.8);
    doc.text('SGPA', cols.sgpa, currentY + 4.8);
    doc.text('Credits', cols.credits, currentY + 4.8);
    doc.text('Subjects (Code & Name) & Obtained Grades', cols.papers, currentY + 4.8);
  };

  renderTableHeader(y);
  y += 7;

  // Render rows with automatic pagination and multi-line paper grade wrapping
  results.forEach((st, idx) => {
    interface ReportPaper {
      code: string;
      name: string;
      grade: string;
      isBacklog: boolean;
      isRecheck: boolean;
    }

    let studentPapers: ReportPaper[] = [];
    if (st.grades && Array.isArray(st.grades) && st.grades.length > 0) {
      studentPapers = st.grades.map((g: any) => {
        const tp = String(g.subjectTP || '').trim().toUpperCase();
        const classification = classifyBacklogGrade(g.grade, tp);
        return {
          code: String(g.subjectCODE || '').trim(),
          name: String(g.subjectName || '').trim(),
          grade: classification.displayGrade || String(g.grade || '').trim(),
          isBacklog: classification.isBacklog,
          isRecheck: g.recheck === 1,
        };
      });
    } else if (st.backlogDetails && st.backlogDetails.length > 0) {
      studentPapers = st.backlogDetails.map((b) => {
        const classification = classifyBacklogGrade(b.grade, b.subjectTP);
        return {
          code: b.subjectCode,
          name: b.subjectName,
          grade: b.grade || classification.displayGrade,
          isBacklog: true,
          isRecheck: b.recheck === 1,
        };
      });
    } else if (st.backlogSubjects && st.backlogSubjects.length > 0) {
      studentPapers = st.backlogSubjects.map((str) => {
        const matchWithDash = str.match(/^([A-Za-z0-9]+)\s*-\s*(.*?)\s*\((.*?)\)$/);
        if (matchWithDash) {
          const classification = classifyBacklogGrade(matchWithDash[3].trim());
          return {
            code: matchWithDash[1].trim(),
            name: matchWithDash[2].trim(),
            grade: classification.displayGrade,
            isBacklog: classification.isBacklog,
            isRecheck: false,
          };
        }
        return {
          code: str,
          name: '',
          grade: 'BACKLOG',
          isBacklog: true,
          isRecheck: false,
        };
      });
    }

    // Chunk layout: subject name included, red color to only back subjects, other without back font color green
    interface TextChunk {
      text: string;
      font: 'helvetica' | 'courier';
      style: 'normal' | 'bold';
      size: number;
      color: [number, number, number];
    }

    interface PaperLine {
      chunks: TextChunk[];
    }

    const paperLines: PaperLine[] = [{ chunks: [] }];
    let currentLineWidth = 0;

    if (studentPapers.length > 0) {
      studentPapers.forEach((paper, pIdx) => {
        const isBack = paper.isBacklog;
        // Red color to only back subjects, other without back font color green
        const gradeColor: [number, number, number] = isBack ? [220, 38, 38] : [22, 101, 52];
        const isLast = pIdx === studentPapers.length - 1;

        const displayName = paper.name ? ` (${paper.name})` : '';
        const itemChunks: TextChunk[] = [
          {
            text: `${paper.code}${displayName}: `,
            font: 'helvetica',
            style: 'normal',
            size: 6.4,
            color: [30, 41, 59],
          },
          {
            text: paper.grade,
            font: 'helvetica',
            style: 'bold',
            size: 6.8,
            color: gradeColor,
          },
        ];

        if (paper.isRecheck) {
          itemChunks.push({
            text: '*',
            font: 'helvetica',
            style: 'bold',
            size: 7.5,
            color: [220, 38, 38], // Bright red asterisk from real data
          });
        }

        if (!isLast) {
          itemChunks.push({
            text: '   |   ',
            font: 'helvetica',
            style: 'normal',
            size: 6.0,
            color: [148, 163, 184],
          });
        }

        let itemWidth = 0;
        itemChunks.forEach((c) => {
          doc.setFont(c.font, c.style);
          doc.setFontSize(c.size);
          itemWidth += doc.getTextWidth(c.text);
        });

        // Wrap to next line if exceeds papersColWidth
        if (currentLineWidth + itemWidth > papersColWidth && currentLineWidth > 0) {
          paperLines.push({ chunks: [] });
          currentLineWidth = 0;
        }

        const currentLine = paperLines[paperLines.length - 1];
        itemChunks.forEach((c) => {
          currentLine.chunks.push(c);
        });
        currentLineWidth += itemWidth;
      });
    } else {
      if (st.status === 'PASSED') {
        paperLines[0].chunks.push({
          text: 'All Clear (Passed with no backlogs)',
          font: 'helvetica',
          style: 'bold',
          size: 6.8,
          color: [22, 101, 52], // Green
        });
      } else if (st.status === 'BACKLOG') {
        paperLines[0].chunks.push({
          text: 'Backlog Registered (Evaluation Pending)',
          font: 'helvetica',
          style: 'bold',
          size: 6.8,
          color: [220, 38, 38], // Red
        });
      } else {
        paperLines[0].chunks.push({
          text: 'Record Not Published',
          font: 'helvetica',
          style: 'normal',
          size: 6.8,
          color: [148, 163, 184],
        });
      }
    }

    const studentNameLines = doc.splitTextToSize(st.studentName || 'N/A', 36);
    const branchColLines = doc.splitTextToSize(`${st.branchName || ''}\n${st.collegeName || ''}`, 40);

    const maxLineCount = Math.max(paperLines.length, studentNameLines.length, branchColLines.length, 1);
    const rowH = Math.max(7.5, maxLineCount * 3.8 + 3.2);

    if (y + rowH > pageHeight - margin - 14) {
      doc.addPage();
      // Running mini-header for continuation pages
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `BIJU PATNAIK UNIVERSITY OF TECHNOLOGY, ROURKELA • CLASS EVALUATION REPORT • ${session}`,
        margin + 2,
        margin + 5
      );
      doc.text('(Continued)', pageWidth - margin - 2, margin + 5, { align: 'right' });
      y = margin + 8;
      renderTableHeader(y);
      y += 7;
    }

    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, rowH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowH, margin + contentWidth, y + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(idx + 1), cols.rank + 1.5, y + 4.2);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(st.rollNo, cols.roll, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    studentNameLines.forEach((nLine: string, nIdx: number) => {
      doc.text(nLine, cols.name, y + 4.2 + nIdx * 3.4);
    });

    branchColLines.forEach((bLine: string, bIdx: number) => {
      doc.setFont('helvetica', bIdx === 0 ? 'bold' : 'normal');
      doc.setFontSize(bIdx === 0 ? 7.0 : 6.3);
      doc.setTextColor(bIdx === 0 ? 15 : 71, bIdx === 0 ? 23 : 85, bIdx === 0 ? 42 : 105);
      doc.text(bLine, cols.branch, y + 4.2 + bIdx * 3.4);
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(st.sgpa > 0 ? 15 : 148, st.sgpa > 0 ? 23 : 163, st.sgpa > 0 ? 42 : 184);
    doc.text(st.sgpa > 0 ? st.sgpa.toFixed(2) : '0.00', cols.sgpa, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(st.credits || 0), cols.credits + 1, y + 4.2);

    // Draw formatted papers with individual red/green colors and recheck *
    paperLines.forEach((pLine, lIdx) => {
      let curX = cols.papers;
      const curY = y + 4.2 + lIdx * 3.8;
      pLine.chunks.forEach((chunk) => {
        doc.setFont(chunk.font, chunk.style);
        doc.setFontSize(chunk.size);
        doc.setTextColor(chunk.color[0], chunk.color[1], chunk.color[2]);
        doc.text(chunk.text, curX, curY);
        curX += doc.getTextWidth(chunk.text);
      });
    });

    y += rowH;
  });

  // Apply consistent footer, page numbering, and frame across all pages
  const totalPages = doc.getNumberOfPages();
  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle outer page border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.rect(margin + 1.2, margin + 1.2, contentWidth - 2.4, pageHeight - margin * 2 - 2.4);

    // Footer divider line
    const footerY = pageHeight - margin - 7;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 4, footerY, pageWidth - margin - 4, footerY);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Provisional Class Evaluation Report • For academic reference only • Original mark sheets issued by BPUT affiliated institutions',
      margin + 5,
      footerY + 4.2
    );
    doc.text(
      `Page ${i} of ${totalPages} • Generated: ${printDate}`,
      pageWidth - margin - 5,
      footerY + 4.2,
      { align: 'right' }
    );
  }

  const safeSession = session.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `BPUT_Class_Report_${safeSession}.pdf`;
  doc.save(filename);

  return filename;
}
