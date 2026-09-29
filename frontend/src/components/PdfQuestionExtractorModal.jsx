import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Plus,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Check,
  Layers,
  Key
} from 'lucide-react';
import { questionService } from '../services/questionService';

const PdfQuestionExtractorModal = ({ examId, isOpen, onClose, onImportSuccess }) => {
  const [step, setStep] = useState('upload'); // 'upload' | 'review'
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('exampro_gemini_key') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Extracted questions state
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [importing, setImporting] = useState(false);
  const [filterUnanswered, setFilterUnanswered] = useState(false);

  if (!isOpen) return null;

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setError('');
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    } else {
      setError('Please upload a valid PDF file.');
    }
  };

  const handleFileSelect = (e) => {
    setError('');
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else if (selectedFile) {
      setError('Please select a PDF file.');
    }
  };

  const handleExtract = async () => {
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (geminiApiKey) {
        localStorage.setItem('exampro_gemini_key', geminiApiKey);
      }

      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('useAi', useAi ? 'true' : 'false');
      if (geminiApiKey) {
        formData.append('geminiApiKey', geminiApiKey);
      }

      const res = await questionService.extractPdfQuestions(examId, formData);

      if (!res.data || res.data.length === 0) {
        setError('No multiple-choice questions could be detected in this PDF. Please verify the PDF format or try AI mode.');
        return;
      }

      // Initialize questions with a valid default answer if suggestedAnswer was detected
      const formatted = res.data.map((q, idx) => ({
        tempId: `extracted-${idx}-${Date.now()}`,
        questionText: q.questionText || `Question ${idx + 1}`,
        options: q.options && q.options.length >= 2 ? q.options : ['Option A', 'Option B'],
        correctAnswer: q.suggestedAnswer && q.options?.includes(q.suggestedAnswer) ? q.suggestedAnswer : '',
        marks: q.marks || 1,
        explanation: q.explanation || ''
      }));

      setExtractedQuestions(formatted);
      setStep('review');
    } catch (err) {
      console.error('Extraction failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to extract questions from PDF.');
    } finally {
      setLoading(false);
    }
  };

  // Answer selection handler
  const handleSelectOption = (questionIndex, optionValue) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        correctAnswer: optionValue
      };
      return updated;
    });
  };

  const handleQuestionTextChange = (questionIndex, newText) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        questionText: newText
      };
      return updated;
    });
  };

  const handleOptionTextChange = (questionIndex, optionIndex, newText) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      const q = updated[questionIndex];
      const oldVal = q.options[optionIndex];
      const newOptions = [...q.options];
      newOptions[optionIndex] = newText;

      let newCorrect = q.correctAnswer;
      if (q.correctAnswer === oldVal) {
        newCorrect = newText;
      }

      updated[questionIndex] = {
        ...q,
        options: newOptions,
        correctAnswer: newCorrect
      };
      return updated;
    });
  };

  const handleMarksChange = (questionIndex, marks) => {
    const val = Math.max(1, parseInt(marks) || 1);
    setExtractedQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex] = { ...updated[questionIndex], marks: val };
      return updated;
    });
  };

  const handleApplyMarksToAll = (marks) => {
    const val = Math.max(1, parseInt(marks) || 1);
    setExtractedQuestions(prev => prev.map(q => ({ ...q, marks: val })));
  };

  const handleDeleteQuestion = (questionIndex) => {
    setExtractedQuestions(prev => prev.filter((_, idx) => idx !== questionIndex));
  };

  const handleAddOption = (questionIndex) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      const q = updated[questionIndex];
      if (q.options.length >= 6) return updated;
      const nextLetter = String.fromCharCode(65 + q.options.length);
      updated[questionIndex] = {
        ...q,
        options: [...q.options, `Option ${nextLetter}`]
      };
      return updated;
    });
  };

  const handleRemoveOption = (questionIndex, optionIndex) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      const q = updated[questionIndex];
      if (q.options.length <= 2) return updated; // Minimum 2 options required
      const removedVal = q.options[optionIndex];
      const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
      let newCorrect = q.correctAnswer;
      if (q.correctAnswer === removedVal) {
        newCorrect = '';
      }
      updated[questionIndex] = {
        ...q,
        options: newOptions,
        correctAnswer: newCorrect
      };
      return updated;
    });
  };

  // Import into exam
  const handleImportToExam = async () => {
    // Check for any question without correct answer
    const unansweredIndex = extractedQuestions.findIndex(q => !q.correctAnswer);
    if (unansweredIndex !== -1) {
      setError(`Question #${unansweredIndex + 1} does not have a correct answer selected. Please select an option for each question before importing.`);
      // Scroll to that question if possible
      const el = document.getElementById(`extracted-q-${unansweredIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    try {
      setImporting(true);
      setError('');
      
      const payload = extractedQuestions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
        explanation: q.explanation || ''
      }));

      await questionService.batchAddQuestions(examId, payload);
      
      onImportSuccess(extractedQuestions.length);
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to import questions.');
    } finally {
      setImporting(false);
    }
  };

  const answeredCount = extractedQuestions.filter(q => !!q.correctAnswer).length;
  const totalCount = extractedQuestions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const displayedQuestions = filterUnanswered
    ? extractedQuestions.map((q, idx) => ({ ...q, originalIndex: idx })).filter(q => !q.correctAnswer)
    : extractedQuestions.map((q, idx) => ({ ...q, originalIndex: idx }));

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 14, 26, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: step === 'upload' ? '560px' : '960px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        transition: 'max-width 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                {step === 'upload' ? 'Extract Questions from PDF' : 'Review & Select Correct Answers'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                {step === 'upload'
                  ? 'Upload your question paper PDF to auto-extract all questions & options'
                  : `Select the correct answer for each extracted question before importing`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div style={{
            margin: '1rem 1.75rem 0',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#fb7185',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          {step === 'upload' ? (
            <div>
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('pdf-file-input').click()}
                style={{
                  border: dragOver
                    ? '2px dashed #0284c7'
                    : file
                    ? '2px solid rgba(34, 197, 94, 0.5)'
                    : '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: dragOver
                    ? 'rgba(2, 132, 199, 0.08)'
                    : file
                    ? 'rgba(34, 197, 94, 0.05)'
                    : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}
              >
                <input
                  id="pdf-file-input"
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />

                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: file ? 'rgba(34, 197, 94, 0.15)' : 'rgba(2, 132, 199, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: file ? '#4ade80' : '#38bdf8'
                }}>
                  {file ? <CheckCircle2 size={30} /> : <UploadCloud size={30} />}
                </div>

                <div>
                  <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.35rem 0', color: '#0F172A' }}>
                    {file ? file.name : 'Choose a Question Paper PDF or drag & drop'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {file
                      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace file`
                      : 'Supports standard MCQ formats, up to 20MB'}
                  </p>
                </div>
              </div>

              {/* Extraction Mode Selector */}
              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.65rem', display: 'block' }}>
                  Extraction Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  {/* Mode 1: Local Smart Regex */}
                  <div
                    onClick={() => setUseAi(false)}
                    style={{
                      border: !useAi ? '2px solid #0284c7' : '1px solid #E2E8F0',
                      background: !useAi ? 'rgba(2, 132, 199, 0.08)' : '#F8FAFC',
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <Layers size={18} color={!useAi ? '#0284c7' : 'var(--text-muted)'} />
                      <strong style={{ fontSize: '0.925rem', color: !useAi ? '#0F172A' : 'var(--text-muted)' }}>
                        ⚡ Built-in Extractor
                      </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.785rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Instant, runs 100% locally. Ideal for standard Q1, Q2, A/B/C/D formats.
                    </p>
                  </div>

                  {/* Mode 2: Gemini AI */}
                  <div
                    onClick={() => setUseAi(true)}
                    style={{
                      border: useAi ? '2px solid #0d9488' : '1px solid #E2E8F0',
                      background: useAi ? 'rgba(13, 148, 136, 0.08)' : '#F8FAFC',
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <Sparkles size={18} color={useAi ? '#0d9488' : 'var(--text-muted)'} />
                      <strong style={{ fontSize: '0.925rem', color: useAi ? '#0F172A' : 'var(--text-muted)' }}>
                        ✨ Gemini AI Extractor
                      </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.785rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Deep extraction for multi-column or non-standard question paper layouts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional Gemini API Key field */}
              {useAi && (
                <div style={{ marginTop: '1.25rem', background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <label style={{ fontSize: '0.825rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <Key size={14} color="#0d9488" />
                    Google Gemini API Key (Optional if configured in backend)
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Stored safely in your local browser storage for future extractions.
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Review Step */
            <div>
              {/* Sticky Summary Bar */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Questions Extracted
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1.35rem', color: '#0F172A', fontWeight: 700 }}>
                      {totalCount}
                    </h4>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Answers Selected
                    </span>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: answeredCount === totalCount ? '#16A34A' : '#d97706'
                    }}>
                      {answeredCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {totalCount}</span>
                    </h4>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ flex: '1 1 200px', maxWidth: '280px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.785rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Completion</span>
                    <strong style={{ color: answeredCount === totalCount ? '#16A34A' : '#0F172A' }}>
                      {progressPercent}%
                    </strong>
                  </div>
                  <div style={{
                    height: '8px',
                    background: '#E2E8F0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: answeredCount === totalCount
                        ? 'linear-gradient(90deg, #10b981, #22c55e)'
                        : 'linear-gradient(90deg, #0284c7, #0d9488)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Quick controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => setFilterUnanswered(!filterUnanswered)}
                    className={`btn btn-sm ${filterUnanswered ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    {filterUnanswered ? 'Show All Questions' : `Show Unanswered Only (${totalCount - answeredCount})`}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Marks/Q:</span>
                    <input
                      type="number"
                      defaultValue={1}
                      min={1}
                      onChange={(e) => handleApplyMarksToAll(e.target.value)}
                      style={{
                        width: '50px',
                        padding: '0.25rem 0.4rem',
                        fontSize: '0.825rem',
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        color: '#000000',
                        textAlign: 'center'
                      }}
                      title="Set marks for all extracted questions"
                    />
                  </div>
                </div>
              </div>

              {/* Extracted Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {displayedQuestions.map((q) => {
                  const qIndex = q.originalIndex;
                  const isAnswered = !!q.correctAnswer;

                  return (
                    <div
                      key={q.tempId}
                      id={`extracted-q-${qIndex}`}
                      className="glass-card"
                      style={{
                        padding: '1.35rem',
                        borderRadius: '16px',
                        border: isAnswered
                          ? '1px solid rgba(34, 197, 94, 0.3)'
                          : '1px solid rgba(245, 158, 11, 0.4)',
                        background: isAnswered
                          ? 'rgba(34, 197, 94, 0.02)'
                          : 'rgba(245, 158, 11, 0.03)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Question Header & Controls */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isAnswered ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: isAnswered ? '#4ade80' : '#fbbf24',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {qIndex + 1}
                          </span>

                          <span style={{
                            fontSize: '0.785rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.65rem',
                            borderRadius: '20px',
                            background: isAnswered ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isAnswered ? '#4ade80' : '#fbbf24',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            {isAnswered ? (
                              <>
                                <Check size={14} /> Correct Answer Chosen
                              </>
                            ) : (
                              <>
                                <AlertCircle size={14} /> Click the correct option below
                              </>
                            )}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Marks:</span>
                            <input
                              type="number"
                              min={1}
                              value={q.marks}
                              onChange={(e) => handleMarksChange(qIndex, e.target.value)}
                              style={{
                                width: '48px',
                                padding: '0.2rem 0.4rem',
                                borderRadius: '6px',
                                background: '#F8FAFC',
                                border: '1px solid #CBD5E1',
                                color: '#000000',
                                textAlign: 'center',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <button
                            onClick={() => handleDeleteQuestion(qIndex)}
                            className="btn-icon"
                            title="Delete this question"
                            style={{
                              background: 'rgba(244, 63, 94, 0.1)',
                              border: 'none',
                              color: '#fb7185',
                              width: '30px',
                              height: '30px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Question Text Editor */}
                      <div style={{ marginBottom: '1rem' }}>
                        <textarea
                          rows={2}
                          value={q.questionText}
                          onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                          placeholder="Enter question text..."
                          className="form-textarea"
                          style={{
                            width: '100%',
                            fontSize: '0.975rem',
                            fontWeight: 500,
                            lineHeight: 1.4,
                            padding: '0.65rem 0.85rem',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      {/* Options List / Interactive Radio Cards */}
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.65rem'
                        }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            OPTIONS (Click one to set as Correct Answer):
                          </span>
                          {q.options.length < 6 && (
                            <button
                              onClick={() => handleAddOption(qIndex)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#818cf8',
                                fontSize: '0.785rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Plus size={13} /> Add Option
                            </button>
                          )}
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: q.options.length > 2 ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr 1fr',
                          gap: '0.75rem'
                        }}>
                          {q.options.map((optionText, optIdx) => {
                            const isSelected = q.correctAnswer === optionText;
                            const optionLetter = String.fromCharCode(65 + optIdx);

                            return (
                              <div
                                key={optIdx}
                                onClick={() => handleSelectOption(qIndex, optionText)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.65rem',
                                  padding: '0.65rem 0.85rem',
                                  borderRadius: '12px',
                                  border: isSelected
                                    ? '2px solid #22c55e'
                                    : '1px solid #CBD5E1',
                                  background: isSelected
                                    ? '#F0FDF4'
                                    : '#F8FAFC',
                                  boxShadow: isSelected ? '0 0 16px rgba(34, 197, 94, 0.25)' : 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {/* Letter & Check Indicator */}
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background: isSelected ? '#22c55e' : '#E2E8F0',
                                  color: isSelected ? '#fff' : '#0F172A',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.825rem',
                                  flexShrink: 0
                                }}>
                                  {isSelected ? <Check size={16} /> : optionLetter}
                                </div>

                                {/* Option Text Input (editable) */}
                                <input
                                  type="text"
                                  value={optionText}
                                  onClick={(e) => e.stopPropagation()} // don't trigger selection when editing text
                                  onChange={(e) => handleOptionTextChange(qIndex, optIdx, e.target.value)}
                                  placeholder={`Option ${optionLetter}`}
                                  style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#000000',
                                    fontWeight: isSelected ? 600 : 500,
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    padding: '0.2rem 0'
                                  }}
                                />

                                {/* Remove Option (if more than 2) */}
                                {q.options.length > 2 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveOption(qIndex, optIdx);
                                    }}
                                    title="Remove this option"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#64748B',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      opacity: 0.7
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {step === 'upload' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExtract}
                disabled={!file || loading}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Extracting Questions...
                  </>
                ) : (
                  <>
                    Extract Questions
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={importing}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ArrowLeft size={16} /> Back to Upload
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {answeredCount < totalCount && (
                  <span style={{ fontSize: '0.825rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertCircle size={15} />
                    {totalCount - answeredCount} questions need a correct answer
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleImportToExam}
                  disabled={importing || totalCount === 0}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: answeredCount === totalCount
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : undefined
                  }}
                >
                  {importing ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      Importing Questions...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Import All {totalCount} Questions to Exam
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfQuestionExtractorModal;
