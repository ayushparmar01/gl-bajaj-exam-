const PDFDocument = require('pdfkit');

/**
 * Generates a clean, professional PDF Scorecard and Test Report.
 * @param {Object} result - Populated Result document (with examId & studentId)
 * @param {Array} questions - Array of Question documents for the exam
 * @param {Object} res - Express response stream
 */
function generatePdfReport(result, questions, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true
  });

  // Pipe to response
  doc.pipe(res);

  const exam = result.examId || {};
  const student = result.studentId || {};
  const passMarks = exam.passMarks || 0;
  const isPassed = result.score >= passMarks;

  // Map questionId -> question document
  const questionMap = new Map();
  if (Array.isArray(questions)) {
    questions.forEach(q => questionMap.set(q._id.toString(), q));
  }

  // --- 1. TOP BRAND ACCENT BAR ---
  doc.rect(40, 40, 515, 6).fill('#4f46e5');

  // --- 2. HEADER ---
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text('GLB EXAMSPHERE Assessment Report', 40, 55);
  doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('OFFICIAL CANDIDATE EXAMINATION SCORECARD & PERFORMANCE ANALYSIS', 40, 80);

  const reportId = result._id ? result._id.toString().toUpperCase() : 'N/A';
  doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text(`Report ID: ${reportId} • Generated: ${new Date().toLocaleDateString()}`, 40, 93);

  // Divider
  doc.moveTo(40, 108).lineTo(555, 108).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // --- 3. CANDIDATE & EXAM INFO BOX ---
  const infoBoxTop = 118;
  doc.roundedRect(40, infoBoxTop, 515, 65, 6).fillColor('#f8fafc').fillAndStroke('#e2e8f0');

  // Left Column: Candidate Info
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748b').text('CANDIDATE INFORMATION', 55, infoBoxTop + 10);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(student.name || 'Candidate', 55, infoBoxTop + 24);
  doc.font('Helvetica').fontSize(9).fillColor('#475569').text(`Email: ${student.email || 'N/A'}`, 55, infoBoxTop + 40);

  // Right Column: Exam Details
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748b').text('EXAM DETAILS', 300, infoBoxTop + 10);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(exam.title || 'Examination', 300, infoBoxTop + 24, { width: 240, ellipsis: true });
  const submittedStr = result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A';
  doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(`Date: ${submittedStr}  |  Time Taken: ${result.timeTaken || 'N/A'}`, 300, infoBoxTop + 40);

  // --- 4. EXECUTIVE SCORECARD BANNER ---
  const scoreTop = 195;
  const statusColor = isPassed ? '#10b981' : '#f43f5e';
  const statusBg = isPassed ? '#ecfdf5' : '#fff1f2';
  const statusBorder = isPassed ? '#a7f3d0' : '#fecdd3';

  doc.roundedRect(40, scoreTop, 515, 70, 8).fillColor(statusBg).fillAndStroke(statusBorder);

  // Status Badge
  doc.roundedRect(55, scoreTop + 15, 90, 24, 12).fillColor(statusColor).fill();
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text(isPassed ? 'PASSED' : 'FAILED', 55, scoreTop + 21, { width: 90, align: 'center' });

  doc.font('Helvetica').fontSize(8).fillColor(isPassed ? '#047857' : '#be123c')
    .text(`Passing Criteria: ${passMarks} pts`, 55, scoreTop + 44, { width: 90, align: 'center' });

  // Score Highlight Column
  doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('FINAL SCORE', 170, scoreTop + 16);
  doc.font('Helvetica-Bold').fontSize(22).fillColor(statusColor).text(`${result.score}`, 170, scoreTop + 28);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#64748b').text(` / ${result.totalMarks} pts`, 220, scoreTop + 37);

  // Percentage Column
  doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('PERCENTAGE', 300, scoreTop + 16);
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(`${result.percentage}%`, 300, scoreTop + 28);

  // Accuracy / Questions Column
  const totalQ = Array.isArray(result.answers) ? result.answers.length : 0;
  const accuracy = totalQ > 0 ? Math.round((result.correctAnswers / totalQ) * 100) : 0;
  doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('ACCURACY', 420, scoreTop + 16);
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(`${accuracy}%`, 420, scoreTop + 28);

  // --- 5. DETAILED METRICS TILES ---
  const statsTop = 278;
  const tileWidth = 120;
  const tileHeight = 44;
  const tileGap = 11;

  const stats = [
    { label: 'TOTAL QUESTIONS', value: totalQ, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'CORRECT ANSWERS', value: result.correctAnswers || 0, color: '#10b981', bg: '#f0fdf4' },
    { label: 'WRONG ANSWERS', value: result.wrongAnswers || 0, color: '#ef4444', bg: '#fef2f2' },
    { label: 'SKIPPED / UNATTEMPTED', value: result.unattempted || 0, color: '#f59e0b', bg: '#fffbeb' }
  ];

  stats.forEach((item, idx) => {
    const x = 40 + idx * (tileWidth + tileGap);
    doc.roundedRect(x, statsTop, tileWidth, tileHeight, 6).fillColor(item.bg).fillAndStroke('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text(item.label, x + 8, statsTop + 8, { width: tileWidth - 16, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(item.color).text(String(item.value), x + 8, statsTop + 21, { width: tileWidth - 16, align: 'center' });
  });

  // Negative marking note if applicable
  if (result.negativeMarksDeducted && result.negativeMarksDeducted > 0) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#e11d48')
      .text(`[NOTE] Negative marking deduction applied: -${result.negativeMarksDeducted} marks deducted for incorrect responses.`, 40, statsTop + 52);
  }

  // --- 6. QUESTION-BY-QUESTION BREAKDOWN ---
  let currentY = statsTop + (result.negativeMarksDeducted > 0 ? 70 : 56);

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Detailed Question-by-Question Review', 40, currentY);
  doc.moveTo(40, currentY + 16).lineTo(555, currentY + 16).strokeColor('#cbd5e1').lineWidth(1).stroke();
  currentY += 26;

  if (Array.isArray(result.answers)) {
    result.answers.forEach((ans, index) => {
      // Check if near bottom of page, add page if needed
      if (currentY > 690) {
        doc.addPage();
        currentY = 45;
      }

      const qId = ans.questionId ? (ans.questionId._id ? ans.questionId._id.toString() : ans.questionId.toString()) : '';
      const q = qId ? questionMap.get(qId) : null;
      const questionText = q?.questionText || `Question ${index + 1}`;
      const isCorrect = Boolean(ans.isCorrect);
      const isUnattempted = !ans.selectedAnswer;

      // Question Header with status pill
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(`Q${index + 1}.  ${questionText}`, 40, currentY, { width: 420 });

      // Marks badge on right
      const marksText = isCorrect
        ? `+${ans.marksObtained ?? (q ? q.marks : 1)} pt`
        : isUnattempted
        ? '0 pt'
        : `${ans.marksObtained ?? 0} pt`;

      const marksColor = isCorrect ? '#16a34a' : isUnattempted ? '#94a3b8' : '#dc2626';
      doc.font('Helvetica-Bold').fontSize(9).fillColor(marksColor).text(marksText, 470, currentY, { width: 85, align: 'right' });

      currentY += doc.heightOfString(`Q${index + 1}.  ${questionText}`, { width: 420 }) + 5;

      // Candidate's Selected Answer
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Candidate Answer: ', 55, currentY, { continued: true });
      if (isUnattempted) {
        doc.font('Helvetica-Oblique').fillColor('#94a3b8').text('[Not Answered]');
      } else if (isCorrect) {
        doc.font('Helvetica-Bold').fillColor('#16a34a').text(`${String(ans.selectedAnswer)}  [CORRECT]`);
      } else {
        doc.font('Helvetica-Bold').fillColor('#dc2626').text(`${String(ans.selectedAnswer)}  [INCORRECT]`);
      }
      currentY += 14;

      // Correct Answer (show if wrong or unattempted, or as reference)
      const correctAnsText = String(ans.correctAnswer || (q ? q.correctAnswer : 'N/A'));
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Correct Answer: ', 55, currentY, { continued: true });
      doc.font('Helvetica-Bold').fillColor('#15803d').text(correctAnsText);
      currentY += 14;

      // Teacher's Explanation (if available)
      const explanationText = q?.explanation || ans.explanation;
      if (explanationText && String(explanationText).trim()) {
        const explClean = String(explanationText).trim();
        doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#475569')
          .text(`Explanation: ${explClean}`, 55, currentY, { width: 480 });
        currentY += doc.heightOfString(`Explanation: ${explClean}`, { width: 480 }) + 4;
      }

      // Separator line
      currentY += 6;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#f1f5f9').lineWidth(1).stroke();
      currentY += 10;
    });
  }

  // --- 7. FOOTER WITH DYNAMIC PAGE NUMBERS ---
  const pageRange = doc.bufferedPageRange();
  const totalPages = pageRange.count;

  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    // Footer divider
    doc.moveTo(40, 785).lineTo(555, 785).strokeColor('#e2e8f0').lineWidth(0.8).stroke();

    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
      .text('GLB EXAMSPHERE Assessment Platform • Confidential Scorecard', 40, 792);

    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
      .text(`Page ${i + 1} of ${totalPages}`, 40, 792, { width: 515, align: 'right' });
  }

  // Finalize PDF stream
  doc.end();
}

module.exports = {
  generatePdfReport
};
