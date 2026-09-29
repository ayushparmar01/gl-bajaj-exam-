/**
 * Formats exam audience targeting information into a clean, human-readable string.
 * Supports populated and unpopulated target entities, combination targeting, and legacy exams.
 *
 * @param {Object} exam - The exam document with audienceType and target fields
 * @returns {string} Human-readable audience description
 */
export const formatAudienceTarget = (exam) => {
  if (!exam) return 'Entire College';
  const type = exam.audienceType || 'ENTIRE_COLLEGE';
  if (type === 'ENTIRE_COLLEGE') return 'Entire College';

  const t = exam.target || {};

  const extractNames = (arr, prefix = '') => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    return arr.map((item) => {
      if (typeof item === 'object' && item !== null) {
        if (item.number !== undefined) return `Sem ${item.number}`;
        return item.code || item.name || '';
      }
      return String(item);
    }).filter(Boolean);
  };

  if (type === 'ACADEMIC_YEAR') {
    const years = extractNames(t.academicYears);
    return years.length > 0 ? `Year: ${years.join(', ')}` : 'Academic Year';
  }
  if (type === 'BRANCH') {
    const branches = extractNames(t.branches);
    return branches.length > 0 ? `Branch: ${branches.join(', ')}` : 'Branch Targeted';
  }
  if (type === 'SEMESTER') {
    const semesters = extractNames(t.semesters);
    return semesters.length > 0 ? `Semester: ${semesters.join(', ')}` : 'Semester Targeted';
  }
  if (type === 'SECTION') {
    const sections = extractNames(t.sections);
    return sections.length > 0 ? `Section: ${sections.join(', ')}` : 'Section Targeted';
  }
  if (type === 'BATCH') {
    const batches = extractNames(t.batches);
    return batches.length > 0 ? `Batch: ${batches.join(', ')}` : 'Batch Targeted';
  }
  if (type === 'COMBINATION_TARGET') {
    const parts = [];
    const b = extractNames(t.branches);
    const sem = extractNames(t.semesters);
    const sec = extractNames(t.sections);
    const bat = extractNames(t.batches);
    const y = extractNames(t.academicYears);

    if (b.length) parts.push(b.join('/'));
    if (sem.length) parts.push(sem.join('/'));
    if (sec.length) parts.push(`Sec ${sec.join('/')}`);
    if (bat.length) parts.push(`Batch ${bat.join('/')}`);
    if (y.length) parts.push(`Year ${y.join('/')}`);

    return parts.length > 0 ? parts.join(' • ') : 'Combination Target';
  }

  return type.replace('_', ' ');
};
