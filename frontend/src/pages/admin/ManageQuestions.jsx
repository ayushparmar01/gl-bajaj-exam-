import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionService } from '../../services/questionService';
import { examService } from '../../services/examService';
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle2, HelpCircle, AlertCircle, X, Image as ImageIcon, Upload, Loader2, Link as LinkIcon, Eye, FileText } from 'lucide-react';
import { getFullImageUrl } from '../../services/api';
import PdfQuestionExtractorModal from '../../components/PdfQuestionExtractorModal';

const ManageQuestions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // Question Form State
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('SINGLE'); // 'SINGLE' or 'MULTIPLE'
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [marks, setMarks] = useState(1);
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' or 'url'
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExamAndQuestions = async () => {
    try {
      setLoading(true);
      const [examRes, qRes] = await Promise.all([
        examService.getExamById(examId),
        questionService.getQuestionsForExamAdmin(examId)
      ]);
      setExam(examRes.data);
      setQuestions(qRes.data);
    } catch (err) {
      console.error('Failed to load exam questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamAndQuestions();
  }, [examId]);

  const openAddModal = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setQuestionType('SINGLE');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setCorrectAnswers([]);
    setMarks(1);
    setExplanation('');
    setImageUrl('');
    setImageInputMode('upload');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setQuestionText(q.questionText);
    const qType = q.type === 'MULTIPLE' ? 'MULTIPLE' : 'SINGLE';
    setQuestionType(qType);
    setOptions(q.options.length >= 2 ? q.options : [...q.options, '', '']);
    setCorrectAnswer(q.correctAnswer || '');
    setCorrectAnswers(q.correctAnswers?.length ? q.correctAnswers : (q.correctAnswer ? [q.correctAnswer] : []));
    setMarks(q.marks || 1);
    setExplanation(q.explanation || '');
    setImageUrl(q.imageUrl || '');
    setImageInputMode(q.imageUrl?.startsWith('http') ? 'url' : 'upload');
    setFormError('');
    setShowModal(true);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size exceeds 5MB limit.');
      return;
    }

    try {
      setUploadingImage(true);
      setFormError('');
      const formData = new FormData();
      formData.append('image', file);
      const res = await questionService.uploadImage(formData);
      setImageUrl(res.imageUrl);
    } catch (err) {
      setFormError(err.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleCorrectAnswer = (opt) => {
    if (!opt.trim()) return;
    if (correctAnswers.includes(opt)) {
      setCorrectAnswers(correctAnswers.filter(a => a !== opt));
    } else {
      setCorrectAnswers([...correctAnswers, opt]);
    }
  };

  const handleOptionChange = (index, val) => {
    const oldVal = options[index];
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);

    if (correctAnswer === oldVal) {
      setCorrectAnswer(val);
    }
    if (correctAnswers.includes(oldVal)) {
      setCorrectAnswers(correctAnswers.map(a => a === oldVal ? val : a));
    }
  };

  const addOptionField = () => {
    setOptions([...options, '']);
  };

  const removeOptionField = (index) => {
    if (options.length <= 2) {
      alert('Question must have at least 2 options.');
      return;
    }
    const valToRemove = options[index];
    const newOpts = options.filter((_, i) => i !== index);
    setOptions(newOpts);
    if (correctAnswer === valToRemove) {
      setCorrectAnswer('');
    }
    setCorrectAnswers(correctAnswers.filter(a => a !== valToRemove));
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!questionText.trim()) {
      setFormError('Please enter question text.');
      return;
    }

    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      setFormError('Please provide at least 2 non-empty options.');
      return;
    }

    if (questionType === 'SINGLE') {
      if (!correctAnswer) {
        setFormError('Please select the single correct answer.');
        return;
      }
      if (!validOptions.includes(correctAnswer)) {
        setFormError('Selected correct answer must match one of the valid options.');
        return;
      }
    } else {
      const validCorrect = correctAnswers.filter(a => validOptions.includes(a));
      if (validCorrect.length === 0) {
        setFormError('Please select at least one correct option for multi-select question.');
        return;
      }
    }

    const payload = {
      questionText,
      options: validOptions,
      type: questionType,
      correctAnswer: questionType === 'SINGLE' ? correctAnswer : (correctAnswers[0] || ''),
      correctAnswers: questionType === 'MULTIPLE' 
        ? correctAnswers.filter(a => validOptions.includes(a)) 
        : [correctAnswer],
      marks: Number(marks) || 1,
      explanation,
      imageUrl: imageUrl ? imageUrl.trim() : null
    };

    try {
      setSubmitting(true);
      if (editingQuestion) {
        await questionService.updateQuestion(editingQuestion._id, payload);
      } else {
        await questionService.addQuestion(examId, payload);
      }
      setShowModal(false);
      fetchExamAndQuestions();
    } catch (err) {
      setFormError(err.message || 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await questionService.deleteQuestion(id);
        fetchExamAndQuestions();
      } catch (err) {
        alert(err.message || 'Failed to delete question');
      }
    }
  };

  const handlePdfImportSuccess = (count) => {
    setSuccessMsg(`🎉 Successfully imported ${count} questions from PDF into this exam!`);
    fetchExamAndQuestions();
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Success Notification Banner */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#34d399',
          fontWeight: 500,
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
        }}>
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate('/admin/exams')}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} />
          Back to Exams
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowPdfModal(true)}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '1px solid rgba(2, 132, 199, 0.4)',
              background: 'rgba(2, 132, 199, 0.12)',
              color: '#38bdf8',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.2)'
            }}
          >
            <FileText size={18} />
            Upload Question Paper (PDF)
          </button>

          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={18} />
            Add Question
          </button>
        </div>
      </div>

      {exam && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>{exam.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Duration: {exam.duration} mins | Total Marks: <strong style={{ color: 'var(--accent-purple)' }}>{exam.totalMarks}</strong> | Questions: {questions.length}
            </p>
          </div>
          <span className={`badge ${exam.isPublished ? 'badge-published' : 'badge-draft'}`}>
            {exam.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading questions...</p>
      ) : questions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <HelpCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ color: '#0F172A', marginBottom: '0.5rem' }}>No questions added yet</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Build your examination by uploading a Question Paper PDF or adding questions manually.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowPdfModal(true)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <FileText size={17} />
              Upload Question Paper (PDF)
            </button>
            <button onClick={openAddModal} className="btn btn-secondary btn-sm">
              <Plus size={16} />
              Add Question Manually
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {questions.map((q, idx) => (
            <div key={q._id} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {idx + 1}
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', color: '#0F172A' }}>{q.questionText}</h3>
                    {q.imageUrl && (
                      <div style={{ marginTop: '0.65rem' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewImageModal(getFullImageUrl(q.imageUrl))}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(79, 70, 229, 0.12)',
                            border: '1px solid rgba(79, 70, 229, 0.3)',
                            color: 'var(--accent-purple)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                        >
                          <img
                            src={getFullImageUrl(q.imageUrl)}
                            alt="Question Diagram"
                            style={{
                              width: '32px',
                              height: '24px',
                              objectFit: 'cover',
                              borderRadius: '3px'
                            }}
                          />
                          <span>View Image</span>
                          <Eye size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    background: q.type === 'MULTIPLE' ? '#F3E8FF' : '#E0F2FE',
                    border: q.type === 'MULTIPLE' ? '1px solid #D8B4FE' : '1px solid #BAE6FD',
                    color: q.type === 'MULTIPLE' ? '#7E22CE' : '#0369A1',
                    fontWeight: 700
                  }}>
                    {q.type === 'MULTIPLE' ? 'Multi-Select (MSQ)' : 'Single MCQ'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                    {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                  </span>
                  <button onClick={() => openEditModal(q)} className="btn btn-secondary btn-sm">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDeleteQuestion(q._id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--accent-rose)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Options Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', marginTop: '0.85rem' }}>
                {q.options.map((opt, oIdx) => {
                  const isCorrect = q.type === 'MULTIPLE'
                    ? (q.correctAnswers && q.correctAnswers.includes(opt))
                    : (opt === q.correctAnswer);
                  return (
                    <div
                      key={oIdx}
                      style={{
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        background: isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)',
                        border: isCorrect ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                        color: isCorrect ? '#34d399' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {isCorrect ? <CheckCircle2 size={16} /> : <div style={{ width: '16px' }} />}
                      <span>{opt}</span>
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.825rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitQuestion}>
              <div className="modal-body">
                {formError && (
                  <div style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fb7185',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Question Type / Format</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.35rem' }}>
                    <div
                      onClick={() => setQuestionType('SINGLE')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: questionType === 'SINGLE' ? '2px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                        background: questionType === 'SINGLE' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <input
                        type="radio"
                        name="questionTypeSelect"
                        checked={questionType === 'SINGLE'}
                        onChange={() => setQuestionType('SINGLE')}
                        style={{ accentColor: 'var(--accent-indigo)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Single Choice (MCQ)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>One correct answer</div>
                      </div>
                    </div>

                    <div
                      onClick={() => setQuestionType('MULTIPLE')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: questionType === 'MULTIPLE' ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)',
                        background: questionType === 'MULTIPLE' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <input
                        type="radio"
                        name="questionTypeSelect"
                        checked={questionType === 'MULTIPLE'}
                        onChange={() => setQuestionType('MULTIPLE')}
                        style={{ accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Multi-Select (MSQ)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Multiple correct answers</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Question Text *</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Enter full question text here..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    required
                  />
                </div>

                {/* Question Image / Diagram (Optional) */}
                <div className="form-group" style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ImageIcon size={16} color="var(--accent-purple)" />
                      Attach Diagram / Image (Optional)
                    </label>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('upload')}
                        className={`btn btn-sm ${imageInputMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem' }}
                      >
                        <Upload size={12} /> Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('url')}
                        className={`btn btn-sm ${imageInputMode === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem' }}
                      >
                        <LinkIcon size={12} /> Image URL
                      </button>
                    </div>
                  </div>

                  {imageUrl ? (
                    <div style={{
                      position: 'relative',
                      display: 'inline-block',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '0.5rem',
                      maxWidth: '100%'
                    }}>
                      <img
                        src={getFullImageUrl(imageUrl)}
                        alt="Question Preview"
                        style={{
                          maxHeight: '180px',
                          maxWidth: '100%',
                          display: 'block',
                          borderRadius: '4px',
                          objectFit: 'contain'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(244, 63, 94, 0.85)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Remove Image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : imageInputMode === 'upload' ? (
                    <div>
                      <input
                        type="file"
                        id="questionImageFileInput"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor="questionImageFileInput"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '1.25rem 1rem',
                          border: '1px dashed var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: uploadingImage ? 'wait' : 'pointer',
                          background: 'rgba(255, 255, 255, 0.01)',
                          transition: 'var(--transition)'
                        }}
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 size={22} className="pulse-anim" color="var(--accent-purple)" />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Uploading image...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={22} color="var(--text-subtle)" />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              Click to choose image (PNG, JPG, WEBP - Max 5MB)
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://example.com/diagram.png"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Options & Correct Answer Selection *
                    {questionType === 'MULTIPLE' ? (
                      <span className="badge badge-purple" style={{ marginLeft: '0.5rem', fontSize: '0.72rem' }}>
                        Multi-Select (MSQ)
                      </span>
                    ) : (
                      <span className="badge badge-blue" style={{ marginLeft: '0.5rem', fontSize: '0.72rem' }}>
                        Single Choice (MCQ)
                      </span>
                    )}
                  </label>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginBottom: '0.5rem' }}>
                    {questionType === 'MULTIPLE'
                      ? 'Check all the boxes corresponding to the correct answers for this question.'
                      : 'Select the radio button next to the option that is the correct answer.'}
                  </p>

                  {options.map((opt, i) => {
                    const isChecked = questionType === 'MULTIPLE'
                      ? correctAnswers.includes(opt) && opt.trim() !== ''
                      : correctAnswer !== '' && correctAnswer === opt;

                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                        {questionType === 'MULTIPLE' ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCorrectAnswer(opt)}
                            disabled={!opt.trim()}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                            title="Check if this option is correct"
                          />
                        ) : (
                          <input
                            type="radio"
                            name="correctAnswerSelect"
                            checked={isChecked}
                            onChange={() => setCorrectAnswer(opt)}
                            disabled={!opt.trim()}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
                            title="Select as correct answer"
                          />
                        )}
                        <input
                          type="text"
                          className="form-input"
                          placeholder={`Option ${i + 1}`}
                          value={opt}
                          onChange={(e) => handleOptionChange(i, e.target.value)}
                          required
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOptionField(i)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--accent-rose)', padding: '0.5rem' }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addOptionField}
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '0.5rem' }}
                  >
                    + Add Option
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Marks / Point Weight</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Explanation (Optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Provide detailed explanation for post-exam review..."
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Image Preview Lightbox Modal */}
      {previewImageModal && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewImageModal(null)}
          style={{ zIndex: 10000, cursor: 'zoom-out' }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImageModal(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
            <img
              src={previewImageModal}
              alt="Diagram Full Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                border: '1px solid var(--border-color)',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      )}

      {/* PDF Question Paper Extractor Modal */}
      <PdfQuestionExtractorModal
        examId={examId}
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        onImportSuccess={handlePdfImportSuccess}
      />
    </div>
  );
};

export default ManageQuestions;
