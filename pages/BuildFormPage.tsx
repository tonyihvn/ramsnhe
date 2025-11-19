import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMockData } from '../hooks/useMockData';
import { FormDefinition, FormPage, FormSection, Question, AnswerType } from '../types';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowUpTrayIcon, QuestionMarkCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import * as XLSX from 'xlsx';

const makeFieldName = (text: string) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `f_${Date.now()}`;
// --- Types for Validation ---
type QuestionErrors = {
  questionText?: string;
  options?: string;
  fieldName?: string;
};

// --- Question Editor Component ---
interface QuestionEditorProps {
  question: Question;
  pIdx: number;
  sIdx: number;
  qIdx: number;
  isFirst: boolean;
  isLast: boolean;
  errors?: QuestionErrors;
  moveQuestion: (p: number, s: number, q: number, dir: 'up' | 'down') => void;
  deleteQuestion: (p: number, s: number, q: number) => void;
  updateQuestion: (p: number, s: number, q: number, val: Partial<Question>) => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question, pIdx, sIdx, qIdx, isFirst, isLast, errors, moveQuestion, deleteQuestion, updateQuestion
}) => {
  const hasOptions = [AnswerType.DROPDOWN, AnswerType.RADIO, AnswerType.CHECKBOX].includes(question.answerType);
  const isFile = question.answerType === AnswerType.FILE;

  const parsePastedOptions = (pasteData: string): { label: string; value: string }[] => {
    return pasteData
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          return { label: parts[1], value: parts[0] };
        }
        return { label: parts[0], value: parts[0] };
      });
  };

  return (
    <div className={`bg-gray-50 p-4 my-2 rounded-lg border transition-all hover:shadow-md ${errors ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-200 px-2 py-0.5 rounded">{question.answerType}</span>
          {question.required && <span className="ml-2 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">Required</span>}
          <div className="flex flex-col">
            <button type="button" onClick={() => moveQuestion(pIdx, sIdx, qIdx, 'up')} disabled={isFirst} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUpIcon className="h-4 w-4" /></button>
            <button type="button" onClick={() => moveQuestion(pIdx, sIdx, qIdx, 'down')} disabled={isLast} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDownIcon className="h-4 w-4" /></button>
          </div>
        </div>
        <Button variant='danger' size='sm' onClick={() => deleteQuestion(pIdx, sIdx, qIdx)}><TrashIcon className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Field Name (machine-friendly)</label>
          <input type="text" value={question.fieldName || ''} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { fieldName: e.target.value })} className={`mt-1 block w-full shadow-sm sm:text-sm rounded-md ${errors?.fieldName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}`} />
          <p className="text-xs text-gray-500 mt-1">Used in computed formulas and exports. Use letters, numbers and underscores only.</p>
          {errors?.fieldName && (
            <p className="mt-1 text-xs text-red-600 flex items-center">
              <ExclamationCircleIcon className="h-3 w-3 mr-1" />
              {errors.fieldName}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Question Text <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={question.questionText}
            onChange={e => {
              const newText = e.target.value;
              // Auto-suggest fieldName unless user has manually edited it.
              const currentField = question.fieldName || '';
              const suggestedFromOld = makeFieldName(question.questionText || '');
              // If field is empty or still matches the auto-suggest from previous question text, update it.
              if (!currentField || currentField === suggestedFromOld || currentField.startsWith(suggestedFromOld + '_')) {
                const suggested = makeFieldName(newText);
                updateQuestion(pIdx, sIdx, qIdx, { questionText: newText, fieldName: suggested });
              } else {
                updateQuestion(pIdx, sIdx, qIdx, { questionText: newText });
              }
            }}
            className={`mt-1 block w-full shadow-sm sm:text-sm rounded-md ${errors?.questionText ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}`}
          />
          {errors?.questionText && (
            <p className="mt-1 text-xs text-red-600 flex items-center">
              <ExclamationCircleIcon className="h-3 w-3 mr-1" />
              {errors.questionText}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Helper Text</label>
          <input type="text" value={question.questionHelper || ''} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { questionHelper: e.target.value })} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Column Width (12-grid)</label>
          <select value={question.columnSize} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { columnSize: Number(e.target.value) })} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
            <option value={12}>12 — Full width</option>
            <option value={6}>6 — Half width</option>
            <option value={4}>4 — One third</option>
            <option value={3}>3 — One quarter</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Required</label>
          <div className="mt-1">
            <label className="inline-flex items-center">
              <input type="checkbox" checked={!!question.required} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { required: e.target.checked })} className="mr-2" />
              <span className="text-sm text-gray-700">This question is required</span>
            </label>
          </div>
        </div>
      </div>

      {hasOptions && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Options (Dropdown/Radio/Checkbox) <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-1">Paste from Excel (Value [tab] Label) to populate.</p>
          <textarea
            rows={3}
            className={`mt-1 block w-full shadow-sm sm:text-sm rounded-md font-mono text-xs ${errors?.options ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}`}
            placeholder="1	Option One&#10;2	Option Two"
            onPaste={e => {
              const pastedText = e.clipboardData.getData('text');
              const options = parsePastedOptions(pastedText);
              if (options.length > 0) {
                e.preventDefault();
                updateQuestion(pIdx, sIdx, qIdx, { options });
              }
            }}
          />
          {errors?.options && (
            <p className="mt-1 text-xs text-red-600 flex items-center">
              <ExclamationCircleIcon className="h-3 w-3 mr-1" />
              {errors.options}
            </p>
          )}
          <div className="mt-2">
            <div className="mb-2 text-xs text-gray-600">Or create options manually:</div>
            <div className="space-y-2">
              {(question.options || []).map((o: any, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="border px-2 py-1 rounded w-1/2" value={o.label} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { options: (question.options || []).map((opt: any, idx: number) => idx === i ? { ...opt, label: e.target.value } : opt) })} />
                  <input className="border px-2 py-1 rounded w-1/2" value={o.value} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { options: (question.options || []).map((opt: any, idx: number) => idx === i ? { ...opt, value: e.target.value } : opt) })} />
                  <button className="text-red-500" onClick={() => updateQuestion(pIdx, sIdx, qIdx, { options: (question.options || []).filter((_: any, idx: number) => idx !== i) })}>Remove</button>
                </div>
              ))}
              <div>
                <button type="button" onClick={() => updateQuestion(pIdx, sIdx, qIdx, { options: [...(question.options || []), { label: 'New Option', value: `${Date.now()}` }] })} className="text-sm text-primary-600">+ Add Option</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {question.answerType === AnswerType.COMPUTED && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Computed Formula</label>
          <p className="text-xs text-gray-500 mb-1">Enter a JavaScript-like expression using other field names as variables. Example: <code>field_a + field_b * 2</code>. Use only numbers for arithmetic. The result will be computed at fill-time.</p>
          <textarea rows={3} className="mt-1 block w-full shadow-sm sm:text-sm rounded-md border-gray-300 font-mono text-sm" value={(question.metadata && question.metadata.computedFormula) || ''} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), computedFormula: e.target.value } })} />
        </div>
      )}
      {isFile && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Allowed File Types</label>
          <p className="text-xs text-gray-500 mb-1">Enter comma-separated MIME types or extensions (e.g. <code>image/*,application/pdf</code> or <code>.jpg,.png,.pdf</code>).</p>
          <input type="text" value={(question.metadata && question.metadata.allowedFileTypes) ? (question.metadata.allowedFileTypes.join(',')) : ''} onChange={e => {
            const vals = String(e.target.value).split(',').map(s => s.trim()).filter(Boolean);
            updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), allowedFileTypes: vals } });
          }} className="mt-1 block w-full shadow-sm sm:text-sm rounded-md border-gray-300" />
        </div>
      )}
    </div>
  );
};

// --- Main Component ---
const BuildFormPage: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { getActivity, getFormDefinition, saveFormDefinition } = useMockData();
  const [activity, setActivity] = useState(getActivity(activityId || ''));
  const [formDef, setFormDef] = useState<FormDefinition | undefined>(getFormDefinition(activityId || ''));
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, QuestionErrors>>({});

  useEffect(() => {
    if (activityId) {
      const act = getActivity(activityId);
      setActivity(act);
      if (act) {
        const originalFormDef = getFormDefinition(activityId);
        let currentFormDef = originalFormDef;
        // Determine whether this activity already has a saved form (non-empty questions)
        const hadSaved = !!(originalFormDef && Array.isArray(originalFormDef.pages) && originalFormDef.pages.some(p => p.sections && p.sections.some(s => (s.questions || []).length > 0)));
        setIsSaved(hadSaved);
        if (!currentFormDef || !Array.isArray(currentFormDef.pages) || currentFormDef.pages.length === 0) {
          currentFormDef = {
            id: `fd-${activityId}`,
            activityId,
            pages: [{ id: 'page1', name: 'Page 1', sections: [{ id: 'sec1', name: 'General Information', questions: [] }] }]
          };
        }
        setFormDef(currentFormDef);
      }
    }
  }, [activityId, getActivity, getFormDefinition]);

  const validateForm = (): boolean => {
    if (!formDef) return false;
    const newErrors: Record<string, QuestionErrors> = {};
    let isValid = true;

    // First pass: basic checks and collect field names
    const fieldNameCounts: Record<string, number> = {};
    const allQuestions: Question[] = [];
    formDef.pages.forEach(page => {
      page.sections.forEach(section => {
        section.questions.forEach(q => {
          allQuestions.push(q);
          const qErrors: QuestionErrors = {};

          if (!q.questionText || q.questionText.trim() === '') {
            qErrors.questionText = 'Question text is required';
            isValid = false;
          }

          if ([AnswerType.DROPDOWN, AnswerType.RADIO, AnswerType.CHECKBOX].includes(q.answerType)) {
            if (!q.options || q.options.length === 0) {
              qErrors.options = 'At least one option is required for this question type';
              isValid = false;
            }
          }

          if (q.required && (!q.questionText || q.questionText.trim() === '')) {
            qErrors.questionText = 'Required question must have text';
            isValid = false;
          }

          // normalize fieldName existence
          const fn = (q.fieldName || '').trim();
          if (fn) {
            fieldNameCounts[fn] = (fieldNameCounts[fn] || 0) + 1;
          }

          if (Object.keys(qErrors).length > 0) {
            newErrors[q.id] = qErrors;
          }
        });
      });
    });

    // Second pass: check for duplicate or missing fieldNames for computed fields
    allQuestions.forEach(q => {
      const fn = (q.fieldName || '').trim();
      const qErrors: QuestionErrors = newErrors[q.id] || {};
      if (q.answerType === AnswerType.COMPUTED) {
        if (!fn) {
          qErrors.fieldName = 'Computed fields require a machine-friendly field name';
          isValid = false;
        }
        const formula = q.metadata && q.metadata.computedFormula;
        if (!formula || String(formula).trim() === '') {
          qErrors.questionText = 'Computed field requires a formula';
          isValid = false;
        }
      }
      if (fn && fieldNameCounts[fn] > 1) {
        qErrors.fieldName = 'Field name must be unique across the form';
        isValid = false;
      }
      if (Object.keys(qErrors).length > 0) {
        newErrors[q.id] = qErrors;
      }
    });

    setValidationErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (formDef && activityId) {
      if (validateForm()) {
        saveFormDefinition(activityId, formDef);
        setIsSaved(true);
        alert('Form definition saved successfully!');
      } else {
        alert('Please fix the errors highlighted in red before saving.');
      }
    }
  };

  const updateFormDef = (newFormDef: FormDefinition) => {
    setFormDef(JSON.parse(JSON.stringify(newFormDef)));
  };

  const addPage = () => {
    if (!formDef) return;
    const newPage: FormPage = {
      id: `page${Date.now()}`,
      name: `Page ${formDef.pages.length + 1}`,
      sections: [{ id: `sec${Date.now()}`, name: 'New Section', questions: [] }]
    };
    const newFormDef = { ...formDef, pages: [...formDef.pages, newPage] };
    updateFormDef(newFormDef);
    setActivePageIndex(formDef.pages.length);
  };

  const addSection = (pageIndex: number) => {
    if (!formDef) return;
    const newSection: FormSection = {
      id: `sec${Date.now()}`,
      name: 'New Section',
      questions: []
    };
    const newFormDef = { ...formDef };
    newFormDef.pages[pageIndex].sections.push(newSection);
    updateFormDef(newFormDef);
  };

  const moveSection = (pageIndex: number, sectionIndex: number, direction: 'up' | 'down') => {
    if (!formDef) return;
    const sections = formDef.pages[pageIndex].sections;
    if (direction === 'up' && sectionIndex > 0) {
      [sections[sectionIndex], sections[sectionIndex - 1]] = [sections[sectionIndex - 1], sections[sectionIndex]];
    } else if (direction === 'down' && sectionIndex < sections.length - 1) {
      [sections[sectionIndex], sections[sectionIndex + 1]] = [sections[sectionIndex + 1], sections[sectionIndex]];
    }
    updateFormDef({ ...formDef });
  };

  const addQuestion = (pageIndex: number, sectionIndex: number, type: AnswerType) => {
    if (!formDef || !activityId) return;
    const newQuestion: Question = {
      id: `q${Date.now()}`,
      activityId,
      pageName: formDef.pages[pageIndex].name,
      sectionName: formDef.pages[pageIndex].sections[sectionIndex].name,
      questionText: 'New Question',
      answerType: type,
      columnSize: 12,
      required: false,
      status: 'Active',
      createdBy: 'user1',
      fieldName: makeFieldName('New Question') + `_${Date.now()}`,
      options: (type === AnswerType.DROPDOWN || type === AnswerType.RADIO || type === AnswerType.CHECKBOX) ? [{ label: 'Option 1', value: '1' }] : undefined,
      metadata: (type === AnswerType.FILE) ? { allowedFileTypes: ['image/*', '.pdf'] } : undefined,
    };
    const newFormDef = { ...formDef };
    newFormDef.pages[pageIndex].sections[sectionIndex].questions.push(newQuestion);
    updateFormDef(newFormDef);
  };

  const updateQuestion = (pageIndex: number, sectionIndex: number, questionIndex: number, updatedQuestion: Partial<Question>) => {
    if (!formDef) return;
    const newFormDef = { ...formDef };
    const question = newFormDef.pages[pageIndex].sections[sectionIndex].questions[questionIndex];
    newFormDef.pages[pageIndex].sections[sectionIndex].questions[questionIndex] = { ...question, ...updatedQuestion };
    updateFormDef(newFormDef);
  };

  const deleteQuestion = (pageIndex: number, sectionIndex: number, questionIndex: number) => {
    if (!formDef) return;
    const newFormDef = { ...formDef };
    newFormDef.pages[pageIndex].sections[sectionIndex].questions.splice(questionIndex, 1);
    updateFormDef(newFormDef);
  };

  const moveQuestion = (pageIndex: number, sectionIndex: number, questionIndex: number, direction: 'up' | 'down') => {
    if (!formDef) return;
    const questions = formDef.pages[pageIndex].sections[sectionIndex].questions;
    if (direction === 'up' && questionIndex > 0) {
      [questions[questionIndex], questions[questionIndex - 1]] = [questions[questionIndex - 1], questions[questionIndex]];
    } else if (direction === 'down' && questionIndex < questions.length - 1) {
      [questions[questionIndex], questions[questionIndex + 1]] = [questions[questionIndex + 1], questions[questionIndex]];
    }
    updateFormDef({ ...formDef });
  };

  // Bulk Import Logic
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formDef) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newQuestions: Question[] = data.map((row: any) => ({
          id: `q${Math.random().toString(36).substr(2, 9)}`,
          activityId: activityId || '',
          pageName: formDef.pages[activePageIndex].name,
          sectionName: formDef.pages[activePageIndex].sections[0].name, // Default to first section of active page
          questionText: row['Question'] || row['question'] || 'Untitled',
          questionHelper: row['Helper Text'] || row['HelperText'] || row['helper'] || undefined,
          answerType: (row['Type'] && Object.values(AnswerType).includes(row['Type'])) ? row['Type'] as AnswerType : (row['type'] && Object.values(AnswerType).includes(row['type'])) ? row['type'] as AnswerType : AnswerType.TEXT,
          columnSize: Number(row['ColumnSize'] || row['columnSize'] || 12),
          required: String(row['Required'] || row['required'] || '').toLowerCase() === 'true',
          status: 'Active',
          createdBy: 'import',
          fieldName: makeFieldName(row['Question'] || row['question'] || `q_${Math.random().toString(36).substr(2, 4)}`),
          options: row['Options'] ? String(row['Options']).split(',').map((o: string) => {
            const parts = String(o).split(':').map(p => p.trim());
            return { label: parts[1] || parts[0], value: parts[0] };
          }) : undefined
        }));

        if (newQuestions.length > 0) {
          const newFormDef = { ...formDef };
          // Append to first section of active page
          newFormDef.pages[activePageIndex].sections[0].questions.push(...newQuestions);
          updateFormDef(newFormDef);
          setIsImportModalOpen(false);
          alert(`Successfully imported ${newQuestions.length} questions.`);
        } else {
          alert("No valid questions found in file.");
        }

      } catch (err) {
        console.error(err);
        alert("Error parsing file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };


  if (!activity || !formDef) return <div>Loading...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/activities')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Form Builder</h1>
            <p className="text-sm text-gray-500">{activity.title}</p>
          </div>
        </div>
        <div className="space-x-2">
          <Button variant="secondary" onClick={() => setIsGuideModalOpen(true)} leftIcon={<QuestionMarkCircleIcon className="h-5 w-5" />}>Guide</Button>
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} leftIcon={<ArrowUpTrayIcon className="h-5 w-5" />}>Bulk Import</Button>
          <Button onClick={handleSave}>{isSaved ? 'Update Form' : 'Save Form'}</Button>
        </div>
      </div>

      {/* Tabs for Pages */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {(formDef.pages || []).map((page, index) => (
            <button
              key={page.id}
              onClick={() => setActivePageIndex(index)}
              className={`${index === activePageIndex
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <input
                type="text"
                value={page.name}
                onChange={(e) => {
                  const newDef = { ...formDef };
                  newDef.pages[index].name = e.target.value;
                  updateFormDef(newDef);
                }}
                className="bg-transparent border-none focus:ring-0 p-0 font-medium text-sm w-24"
              />
            </button>
          ))}
          <button
            onClick={addPage}
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" /> New Page
          </button>
        </nav>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {(formDef.pages?.[activePageIndex]?.sections || []).map((section, sIdx) => (
          <div key={section.id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <input
                type="text"
                value={section.name}
                onChange={(e) => {
                  const newDef = { ...formDef };
                  newDef.pages[activePageIndex].sections[sIdx].name = e.target.value;
                  updateFormDef(newDef);
                }}
                className="bg-transparent border-none focus:ring-0 font-medium text-gray-900 w-1/2"
              />
              <div className="flex space-x-2">
                <button onClick={() => moveSection(activePageIndex, sIdx, 'up')} disabled={sIdx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUpIcon className="h-5 w-5" /></button>
                <button onClick={() => moveSection(activePageIndex, sIdx, 'down')} disabled={sIdx === formDef.pages[activePageIndex].sections.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDownIcon className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {(section.questions || []).map((question, qIdx) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  pIdx={activePageIndex}
                  sIdx={sIdx}
                  qIdx={qIdx}
                  isFirst={qIdx === 0}
                  isLast={qIdx === section.questions.length - 1}
                  errors={validationErrors[question.id]}
                  moveQuestion={moveQuestion}
                  deleteQuestion={deleteQuestion}
                  updateQuestion={updateQuestion}
                />
              ))}

              {(section.questions || []).length === 0 && <div className="text-center text-gray-400 py-4 text-sm">No questions in this section.</div>}

              <div className="mt-4 flex flex-wrap gap-2 justify-center border-t border-gray-100 pt-4">
                {Object.values(AnswerType).map(type => (
                  <button
                    key={type}
                    onClick={() => addQuestion(activePageIndex, sIdx, type)}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    + {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <Button variant="secondary" onClick={() => addSection(activePageIndex)} className="w-full border-dashed">
          <PlusIcon className="h-5 w-5 mr-2" /> Add Section
        </Button>
      </div>

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Bulk Import Questions" footer={<Button onClick={() => setIsImportModalOpen(false)}>Close</Button>}>
        <div className="space-y-4 text-sm text-gray-700">
          <p>Upload an Excel file (.xlsx) to bulk-create questions. The sheet should include a header row. Supported columns (case-insensitive):</p>
          <ul className="list-disc ml-6">
            <li><strong>Question</strong> (required) — question text.</li>
            <li><strong>Type</strong> — one of: textbox, textarea, number, date, time, dropdown, radio, checkbox, file.</li>
            <li><strong>Helper Text</strong> — optional helper or hint text.</li>
            <li><strong>Options</strong> — for dropdown/radio/checkbox; comma-separated. Each option may be either <code>value:label</code> or just <code>label</code>. Example: <code>1:Yes,0:No,Maybe</code></li>
            <li><strong>Required</strong> — "true" or "false" (optional). Marks the question as mandatory when true.</li>
            <li><strong>ColumnSize</strong> — numeric; recommended values: 12 (full), 6 (half), 4 (third), 3 (quarter). Default is 12.</li>
          </ul>
          <p className="text-xs text-gray-500">When importing, questions will be added to the currently active page and the first section of that page. You can edit page/section assignments after import.</p>
          <input type="file" accept=".xlsx" onChange={handleFileImport} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
          <div className="text-xs text-gray-500">Notes: empty rows are ignored. For option values, prefer <code>value:label</code> to ensure consistent values. If Type is missing or invalid, the question will default to <code>textbox</code>.</div>
        </div>
      </Modal>

      <Modal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} title="Form Builder Guide" footer={<Button onClick={() => setIsGuideModalOpen(false)}>Close</Button>}>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Pages & Sections:</strong> Organize your form into pages (tabs) and sections.</p>
          <p><strong>Questions:</strong> Add various question types using the buttons at the bottom of each section.</p>
          <p><strong>Options:</strong> For Dropdown, Radio, and Checkbox, you can paste options from Excel. Format: <code>Value [TAB] Label</code> or just <code>Label</code> on each line.</p>
          <p><strong>Computed Fields:</strong> Use the <code>Computed</code> question type to create fields calculated from other fields. Assign a unique <em>Field Name</em> and enter a formula using those names (e.g. <code>field_a + field_b * 2</code>).</p>
          <p><strong>Validation:</strong> Questions marked with <span className="text-red-500">*</span> must have text, and selection types must have options.</p>
        </div>
      </Modal>
    </div>
  );
};

export default BuildFormPage;