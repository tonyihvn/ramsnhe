import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMockData } from '../hooks/useMockData';
import { FormDefinition, FormPage, FormSection, Question, AnswerType } from '../types';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowUpTrayIcon, QuestionMarkCircleIcon, ExclamationCircleIcon, ChevronDownIcon, ChevronRightIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import * as ExcelJS from 'exceljs';
import UnifiedRichTextEditor from '../components/ui/UnifiedRichTextEditor';

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
  onOpenDatasetModal?: (p: number, s: number, q: number) => void;
  roles?: any[];
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question, pIdx, sIdx, qIdx, isFirst, isLast, errors, moveQuestion, deleteQuestion, updateQuestion, onOpenDatasetModal, roles
}) => {
  const hasOptions = [AnswerType.DROPDOWN, AnswerType.RADIO, AnswerType.CHECKBOX].includes(question.answerType);
  const isFile = question.answerType === AnswerType.FILE;
  const collapsed = !!(question.metadata && question.metadata.collapsed);

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
          <button type="button" onClick={() => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), collapsed: !collapsed } })} className="text-gray-500 hover:text-gray-700 p-1">
            {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-200 px-2 py-0.5 rounded">{question.answerType}</span>
          {question.required && <span className="ml-2 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">Required</span>}
          {/* Group Name and Score Inputs */}
          <div className="ml-4 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Group:</label>
              <input
                type="text"
                className="border px-1 py-0.5 rounded text-xs w-24"
                value={question.questionGroup || ''}
                onChange={e => updateQuestion(pIdx, sIdx, qIdx, { questionGroup: e.target.value })}
                placeholder="Group name"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Score:</label>
              <input type="number" min={0} className="border px-1 py-0.5 rounded text-xs w-20" value={question.metadata?.score ?? ''} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), score: e.target.value === '' ? undefined : Number(e.target.value) } })} />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Correct Answer:</label>
              <input type="text" className="border px-1 py-0.5 rounded text-xs w-36" value={question.correctAnswer || question.correct_answer || ''} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { correctAnswer: e.target.value })} placeholder="e.g. Yes" />
            </div>
          </div>
          <div className="flex flex-col">
            <button type="button" onClick={() => moveQuestion(pIdx, sIdx, qIdx, 'up')} disabled={isFirst} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUpIcon className="h-4 w-4" /></button>
            <button type="button" onClick={() => moveQuestion(pIdx, sIdx, qIdx, 'down')} disabled={isLast} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDownIcon className="h-4 w-4" /></button>
          </div>
        </div>
        <Button variant='danger' size='sm' onClick={() => deleteQuestion(pIdx, sIdx, qIdx)}><TrashIcon className="h-4 w-4" /></Button>
      </div>

      {!collapsed ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
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
            <div className="md:col-span-1">
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
              <div className="mt-1 min-h-[38px] flex items-center">
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
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => { if (typeof onOpenDatasetModal === 'function') onOpenDatasetModal(pIdx, sIdx, qIdx); }} className="text-sm text-primary-600 hover:underline">Load from API</button>
                <span className="text-xs text-gray-400">·</span>
                <div className="text-xs text-gray-500">or</div>
              </div>
              {errors?.options && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                  {errors.options}
                </p>
              )}
              <div className="mt-2">
                <div className="mb-2 text-xs text-gray-600">Or create options manually:</div>
                <div className="mt-2 mb-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!(question.metadata && question.metadata.searchable)}
                      onChange={e => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), searchable: e.target.checked } })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-700">Searchable (enable type-to-filter in form)</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 font-medium mb-2">Label · Value · Score · Show If · Actions</div>
                  {(question.options || []).map((o: any, i: number) => (
                    <div key={i} className="flex gap-2 items-center text-sm">
                      <input className="border px-2 py-1 rounded text-xs flex-1" placeholder="Label" value={o.label} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { options: (question.options || []).map((opt: any, idx: number) => idx === i ? { ...opt, label: e.target.value } : opt) })} />
                      <input className="border px-2 py-1 rounded text-xs flex-1" placeholder="Value" value={o.value} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { options: (question.options || []).map((opt: any, idx: number) => idx === i ? { ...opt, value: e.target.value } : opt) })} />
                      <input type="number" step="any" className="border px-2 py-1 rounded text-xs w-16" placeholder="Score" value={o.score ?? ''} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { options: (question.options || []).map((opt: any, idx: number) => idx === i ? { ...opt, score: e.target.value === '' ? undefined : Number(e.target.value) } : opt) })} />
                      <input className="border px-2 py-1 rounded text-xs flex-1" placeholder="e.g. dept === 'HR'" value={o.showif ?? ''} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { options: (question.options || []).map((opt: any, idx: number) => idx === i ? { ...opt, showif: e.target.value } : opt) })} />
                      <button className="text-red-500 hover:text-red-700 text-sm font-medium" onClick={() => updateQuestion(pIdx, sIdx, qIdx, { options: (question.options || []).filter((_: any, idx: number) => idx !== i) })}>✕</button>
                    </div>
                  ))}
                  <div>
                    <button type="button" onClick={() => updateQuestion(pIdx, sIdx, qIdx, { options: [...(question.options || []), { label: 'New Option', value: `${Date.now()}` }] })} className="text-sm text-primary-600">+ Add Option</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dataset modal is rendered at the page level to avoid referencing page-level state from inside QuestionEditor */}

          {question.answerType === AnswerType.COMPUTED && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Computed Formula</label>
              <p className="text-xs text-gray-500 mb-1">Enter a JavaScript-like expression using other field names as variables. Example: <code>field_a + field_b * 2</code>. Use only numbers for arithmetic. The result will be computed at fill-time.</p>
              <textarea rows={3} className="mt-1 block w-full shadow-sm sm:text-sm rounded-md border-gray-300 font-mono text-sm" value={(question.metadata && question.metadata.computedFormula) || ''} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), computedFormula: e.target.value } })} />
            </div>
          )}

          {question.answerType === AnswerType.PARAGRAPH && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Paragraph Content (Rich Text)</label>
              <p className="text-xs text-gray-500 mb-2">Add formatted instruction text. This will display as read-only content in the form (the question text label above will be hidden).</p>
              <UnifiedRichTextEditor
                value={(question.metadata && question.metadata.content) || ''}
                onChange={(content) => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), content } })}
                height={300}
              />
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Visibility Condition (Show If)</label>
            <textarea rows={2} placeholder="e.g. age > 18" className="mt-1 block w-full shadow-sm sm:text-sm rounded-md border-gray-300 font-mono text-sm" value={(question.metadata && question.metadata.showIf) || ''} onChange={e => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), showIf: e.target.value } })} />
          </div>

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

          {/* Display reviewers_comment Checkbox and label */}
          <div className="mt-4 flex flex-col gap-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                id={`reviewers_comment_${question.id}`}
                checked={!!(question.metadata && question.metadata.displayReviewersComment)}
                onChange={e => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), displayReviewersComment: e.target.checked } })}
              />
              <span className="text-xs text-gray-700">Display reviewer comment field</span>
            </label>
            {question.metadata && question.metadata.displayReviewersComment && (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-gray-500">Reviewer Comment Label:</label>
                <input
                  type="text"
                  className="border px-1 py-0.5 rounded text-xs w-40"
                  value={question.metadata.reviewerCommentLabel || "Reviewer's Comment"}
                  onChange={e => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...question.metadata, reviewerCommentLabel: e.target.value } })}
                  placeholder="Reviewer's Comment"
                />
              </div>
            )}
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!(question.metadata && question.metadata.show_on_map)}
                onChange={e => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), show_on_map: e.target.checked } })}
              />
              <span className="text-xs text-gray-700">Show this question's answer on the map popup</span>
            </label>
            {/* Map label customization */}
            {question.metadata && question.metadata.show_on_map && (
              <div className="mt-3 mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Map Label <span className="text-gray-400">(custom label for map display)</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={question.metadata?.map_label || ''}
                  onChange={e => updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), map_label: e.target.value } })}
                  placeholder={question.questionText || 'Enter custom label...'}
                />
                <div className="text-xs text-gray-400 mt-1">This label will appear on the map instead of the full question text.</div>
              </div>
            )}
            {/* Role-restriction UI for show_on_map */}
            {question.metadata && question.metadata.show_on_map && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Restrict map visibility to roles (optional):</div>
                <div className="flex flex-wrap gap-2">
                  {!roles || roles.length === 0 ? (
                    <div className="text-xs text-gray-400">No roles loaded.</div>
                  ) : (
                    roles.map((r: any) => {
                      const roleName = r.name || r;
                      const selected: string[] = Array.isArray(question.metadata && question.metadata.show_on_map_roles) ? (question.metadata.show_on_map_roles || []) : [];
                      const checked = selected.map((s: any) => String(s).toLowerCase()).includes(String(roleName).toLowerCase());
                      return (
                        <label key={roleName} className="inline-flex items-center gap-2 text-xs bg-gray-100 px-2 py-1 rounded">
                          <input type="checkbox" checked={checked} onChange={e => {
                            const cur = Array.isArray(question.metadata && question.metadata.show_on_map_roles) ? (question.metadata.show_on_map_roles || []) : [];
                            let next: string[] = [];
                            if (checked) {
                              // currently checked, so uncheck
                              next = cur.filter((x: any) => String(x).toLowerCase() !== String(roleName).toLowerCase());
                            } else {
                              next = [...cur, roleName];
                            }
                            updateQuestion(pIdx, sIdx, qIdx, { metadata: { ...(question.metadata || {}), show_on_map_roles: next } });
                          }} />
                          <span>{roleName}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500">Leave none selected to make the answer visible to everyone.</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="py-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">{question.questionText || '(no text)'}</div>
              <div className="text-xs text-gray-500">{question.answerType}{question.required ? ' · Required' : ''}</div>
            </div>
            <div className="text-xs text-gray-500">Field: {question.fieldName || '-'}</div>
          </div>
        </div>
      )}
      {/* Score moved to header */}
    </div>
  );
};

// --- Main Component ---
const BuildFormPage: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { getActivity, getFormDefinition, saveFormDefinition, currentUser } = useMockData();
  const [activity, setActivity] = useState(getActivity(activityId || ''));
  const [formDef, setFormDef] = useState<FormDefinition | undefined>(getFormDefinition(activityId || ''));
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [datasetsList, setDatasetsList] = useState<any[]>([]);
  const [dsLoading, setDsLoading] = useState(false);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [selectedActivityForAnswers, setSelectedActivityForAnswers] = useState<number | null>(null);
  const [answersSampleRows, setAnswersSampleRows] = useState<any[]>([]);
  const [dsSelectedForQuestion, setDsSelectedForQuestion] = useState<{ pIdx: number, sIdx: number, qIdx: number } | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedLabelField, setSelectedLabelField] = useState<string>('');
  const [selectedValueField, setSelectedValueField] = useState<string>('');
  const [datasetSampleRows, setDatasetSampleRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleModalTarget, setRoleModalTarget] = useState<{ type: 'page' | 'section'; pageIndex: number; sectionIndex?: number } | null>(null);
  const [roleModalPageKey, setRoleModalPageKey] = useState<string>('');
  const [roleModalSectionKey, setRoleModalSectionKey] = useState<string | null>(null);
  const [rolePerms, setRolePerms] = useState<Record<string, { can_create: boolean; can_view: boolean; can_edit: boolean; can_delete: boolean }>>({});
  const [rolePermsLoading, setRolePermsLoading] = useState(false);
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

  useEffect(() => {
    // load roles for form builder (to allow setting show_on_map_roles)
    (async () => {
      try {
        let r = await fetch('/api/admin/roles');
        if (r.status === 401) r = await fetch('/api/roles');
        if (r.ok) {
          const j = await r.json();
          setRoles(Array.isArray(j) ? j : []);
        }
      } catch (e) {
        console.error('Failed to load roles for form builder', e);
        setRoles([]);
      }
    })();
  }, []);

  const normalizePageKey = (k: string) => {
    if (!k) return '';
    return String(k).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
  };

  // Generate a stable, unique group name for a section when Add More is enabled.
  const generateUniqueGroupName = (pageIndex: number, sectionIndex: number, preferred?: string) => {
    if (!formDef) return `group_${pageIndex}_${sectionIndex}`;
    const base = preferred ? String(preferred).trim() : String((formDef.pages?.[pageIndex]?.sections?.[sectionIndex]?.name) || `section_${pageIndex}_${sectionIndex}`);
    let candidate = base.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!candidate) candidate = `section_${pageIndex}_${sectionIndex}`;
    const used = new Set<string>();
    formDef.pages.forEach((p, pi) => p.sections.forEach((s, si) => {
      const g = String(s.groupName || '').trim().toLowerCase();
      if (g) used.add(g);
    }));
    if (!used.has(candidate)) return candidate;
    // append numeric suffix until unique
    let i = 1;
    while (used.has(`${candidate}_${i}`)) i++;
    return `${candidate}_${i}`;
  };

  const isGroupNameDuplicate = (name: string, pageIndex: number, sectionIndex: number) => {
    if (!formDef) return false;
    const gn = String(name || '').trim().toLowerCase();
    if (!gn) return false;
    for (let p = 0; p < (formDef.pages || []).length; p++) {
      for (let s = 0; s < ((formDef.pages[p].sections) || []).length; s++) {
        if (p === pageIndex && s === sectionIndex) continue;
        const other = String((formDef.pages[p].sections[s].groupName || '')).trim().toLowerCase();
        if (other && other === gn) return true;
      }
    }
    return false;
  };

  const loadRolePermsForTarget = async (pageKey: string, sectionKey: string | null) => {
    setRolePermsLoading(true);
    const out: Record<string, { can_create: boolean; can_view: boolean; can_edit: boolean; can_delete: boolean }> = {};
    const roleDefault = (roleName: string) => {
      const rn = String(roleName || '').toLowerCase();
      if (rn === 'admin') return { can_create: true, can_view: true, can_edit: true, can_delete: true };
      if (rn === 'form builder' || rn === 'data collector') return { can_create: true, can_view: true, can_edit: true, can_delete: false };
      if (rn === 'reviewer' || rn === 'view' || rn === 'viewer') return { can_create: false, can_view: true, can_edit: false, can_delete: false };
      return { can_create: false, can_view: false, can_edit: false, can_delete: false };
    };
    try {
      // initialize defaults for all roles
      for (const r of roles) {
        const roleName = (r && (r.name || r)) ? (r.name || r) : String(r || '');
        out[roleName] = roleDefault(roleName);
      }

      // Fetch page_permissions per role
      await Promise.all((roles || []).map(async (r: any) => {
        try {
          const rn = (r && (r.name || r)) ? (r.name || r) : String(r || '');
          const res = await fetch(`/api/page_permissions?role=${encodeURIComponent(rn)}`);
          if (!res.ok) return;
          const rows = await res.json();
          if (!Array.isArray(rows)) return;
          // Normalize incoming pageKey for comparisons
          const targetNorm = normalizePageKey(String(pageKey || ''));

          // 1) exact match: page_key normalized equals and section_key matches (including both null)
          let chosen: any = null;
          for (const row of rows) {
            try {
              const rowPk = normalizePageKey(String(row.page_key || row.pageKey || row.page || ''));
              const rowSk = row.section_key || row.sectionKey || row.section || null;
              const skClean = rowSk ? String(rowSk) : null;
              if (rowPk === targetNorm) {
                if ((skClean === null && (sectionKey === null || sectionKey === undefined || sectionKey === '')) || String(skClean || '') === String(sectionKey || '')) {
                  chosen = row; break;
                }
              }
            } catch (e) { /* ignore */ }
          }

          // 2) if not exact, prefer page-level rows (section null) where normalized pk equals
          if (!chosen) {
            for (const row of rows) {
              try {
                const rowPk = normalizePageKey(String(row.page_key || row.pageKey || row.page || ''));
                const rowSk = row.section_key || row.sectionKey || row.section || null;
                if (rowPk === targetNorm && (!rowSk || rowSk === '')) { chosen = row; break; }
              } catch (e) { }
            }
          }

          // 3) fallback: prefix-match (choose the most specific / longest matching prefix)
          if (!chosen) {
            let bestLen = -1;
            for (const row of rows) {
              try {
                const rowPk = normalizePageKey(String(row.page_key || row.pageKey || row.page || ''));
                if (!rowPk) continue;
                if (String(targetNorm).startsWith(rowPk) && rowPk.length > bestLen) {
                  bestLen = rowPk.length; chosen = row;
                }
              } catch (e) { }
            }
          }

          if (chosen) {
            out[rn] = { can_create: !!chosen.can_create, can_view: !!chosen.can_view, can_edit: !!chosen.can_edit, can_delete: !!chosen.can_delete };
          }
        } catch (e) {
          // ignore per-role errors
        }
      }));
    } catch (e) {
      console.error('Failed to load page/section permissions', e);
    }
    // apply any saved local overrides (builder may run without authenticated backend)
    try {
      const raw = localStorage.getItem('page_permissions_overrides');
      if (raw) {
        const saved: any[] = JSON.parse(raw);
        for (const s of saved) {
          const rn = (s.role_name || s.roleName || s.role || '') as string;
          if (!rn) continue;
          const pk = String(s.page_key || s.pageKey || s.page || '');
          const sk = s.section_key || s.sectionKey || s.section || null;
          if (String(pk).toLowerCase() === String(pageKey || '').toLowerCase() && String(sk || '') === String(sectionKey || '')) {
            out[rn] = { can_create: !!s.can_create, can_view: !!s.can_view, can_edit: !!s.can_edit, can_delete: !!s.can_delete };
          }
        }
      }
    } catch (e) { /* ignore */ }
    // Set rolePerms to only contain permissions for this target
    setRolePerms(out);
    setRolePermsLoading(false);
  };

  const openRoleModalForPage = async (pageIndex: number) => {
    if (!formDef) return;
    const page = formDef.pages[pageIndex];
    // Use activity-based page key with page ID to uniquely identify each page
    const pk = `/activities/fill/${activityId}:page:${page.id}`;
    setRoleModalPageKey(pk);
    setRoleModalSectionKey(null);
    setRoleModalTarget({ type: 'page', pageIndex });
    setIsRoleModalOpen(true);
    // load existing perms
    await loadRolePermsForTarget(pk, null);
  };

  const openRoleModalForSection = async (pageIndex: number, sectionIndex: number) => {
    if (!formDef) return;
    const page = formDef.pages[pageIndex];
    const section = page.sections[sectionIndex];
    // Align page key with FillFormPage (activity-based with page ID) and use section id for section_key
    const pk = `/activities/fill/${activityId}:page:${page.id}`;
    const sk = section.id || `section-${sectionIndex}`;
    setRoleModalPageKey(pk);
    setRoleModalSectionKey(sk);
    setRoleModalTarget({ type: 'section', pageIndex, sectionIndex });
    setIsRoleModalOpen(true);
    await loadRolePermsForTarget(pk, sk);
  };

  const handleSaveRolePerms = async () => {
    if (!roleModalTarget) return alert('No target selected');
    const payload: any[] = [];
    // Save all roles currently in rolePerms state (which only contains perms for current target)
    for (const [roleName, permsAny] of Object.entries(rolePerms || {})) {
      const perms = permsAny as { can_create: boolean; can_view: boolean; can_edit: boolean; can_delete: boolean };
      payload.push({
        page_key: roleModalPageKey,
        section_key: roleModalSectionKey || null,
        role_name: roleName,
        can_create: !!perms.can_create,
        can_view: !!perms.can_view,
        can_edit: !!perms.can_edit,
        can_delete: !!perms.can_delete
      });
    }
    try {
      // send with credentials so server-side admin check (session cookie) succeeds
      const res = await fetch('/api/admin/page_permissions', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions: payload }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j && j.error ? j.error : 'Failed to save permissions');
      }
      alert('Permissions saved.');
      // persist local overrides as a fallback so settings survive refresh even if server isn't available
      persistLocalOverrides(payload);
      // refresh loaded perms for the target to ensure UI reflects saved rows
      if (roleModalPageKey) await loadRolePermsForTarget(roleModalPageKey, roleModalSectionKey || null);
      setIsRoleModalOpen(false);
    } catch (e) {
      console.error('Failed to save permissions', e);
      // As a fallback, persist locally so builder settings are not lost
      try { persistLocalOverrides(payload); alert('Permissions saved locally (offline).'); setIsRoleModalOpen(false); } catch (err) { alert('Failed to save permissions. See console for details.'); }
    }
  };

  // Persist overrides to localStorage as a fallback when backend/admin is not available
  const persistLocalOverrides = (items: any[]) => {
    try {
      const raw = localStorage.getItem('page_permissions_overrides');
      const existing = raw ? JSON.parse(raw) : [];
      // merge by (page_key, section_key, role_name)
      const keyOf = (r: any) => `${String(r.page_key || r.pageKey || r.page || '')}::${String(r.section_key || r.sectionKey || r.section || '') || ''}::${String(r.role_name || r.roleName || r.role || '')}`;
      const map: Record<string, any> = {};
      for (const e of existing) map[keyOf(e)] = e;
      for (const it of items) map[keyOf(it)] = it;
      const merged = Object.values(map);
      localStorage.setItem('page_permissions_overrides', JSON.stringify(merged));
    } catch (err) { console.warn('Failed to persist local overrides', err); }
  };

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

          // Ensure questionText is a string before calling trim()
          const questionTextStr = typeof q.questionText === 'string' ? q.questionText : String(q.questionText || '');
          if (!questionTextStr || questionTextStr.trim() === '') {
            qErrors.questionText = 'Question text is required';
            isValid = false;
          }

          if ([AnswerType.DROPDOWN, AnswerType.RADIO, AnswerType.CHECKBOX].includes(q.answerType)) {
            if (!q.options || q.options.length === 0) {
              qErrors.options = 'At least one option is required for this question type';
              isValid = false;
            }
          }

          if (q.required && (!questionTextStr || questionTextStr.trim() === '')) {
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
    // Validate repeatable section group names: presence and uniqueness
    const groupCounts: Record<string, number> = {};
    (formDef.pages || []).forEach((p) => {
      (p.sections || []).forEach((s) => {
        if (s.isRepeatable) {
          const gn = String(s.groupName || '').trim();
          if (!gn) {
            alert(`Repeatable section "${s.name || 'Unnamed'}" must have a unique group name.`);
            isValid = false;
          } else {
            groupCounts[gn] = (groupCounts[gn] || 0) + 1;
          }
        }
      });
    });
    for (const [gn, cnt] of Object.entries(groupCounts)) {
      if (cnt > 1) {
        alert(`Group name "${gn}" is used by multiple repeatable sections. Please provide unique group names.`);
        isValid = false;
        break;
      }
    }

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

  const deletePage = (pageIndex: number) => {
    if (!formDef) return;
    if ((formDef.pages || []).length <= 1) { alert('Cannot delete the last page.'); return; }
    if (!confirm('Delete this page and all its sections/questions? This action cannot be undone.')) return;
    const newPages = (formDef.pages || []).slice();
    newPages.splice(pageIndex, 1);
    const newFormDef = { ...formDef, pages: newPages };
    updateFormDef(newFormDef);
    // Adjust active page index safely
    if (activePageIndex >= newPages.length) setActivePageIndex(Math.max(0, newPages.length - 1));
    else if (pageIndex < activePageIndex) setActivePageIndex(activePageIndex - 1);
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
      createdBy: currentUser?.id ?? null,
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
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as ArrayBuffer);
        const worksheet = workbook.worksheets[0];
        // Read options from second sheet named 'options' (or second worksheet) if present
        const optionsSheet = workbook.getWorksheet('options') || workbook.worksheets[1];
        const optionsMap: Record<string, Array<{ value: string; label: string; showif?: string; score?: number }>> = {};
        if (optionsSheet) {
          // Expect header row with columns: name, value, label, showif, score (case-insensitive)
          const optHeaders: string[] = [];
          optionsSheet.getRow(1).eachCell((cell) => optHeaders.push(String(cell.value || '').toLowerCase()));
          const nameIdx = optHeaders.findIndex(h => h === 'name' || h === 'field_name' || h === 'fieldname');
          const valueIdx = optHeaders.findIndex(h => h === 'value');
          const labelIdx = optHeaders.findIndex(h => h === 'label');
          const showifIdx = optHeaders.findIndex(h => h === 'showif' || h === 'show_if' || h === 'show-if');
          const scoreIdx = optHeaders.findIndex(h => h === 'score');
          if (nameIdx !== -1 && valueIdx !== -1) {
            optionsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
              if (rowNumber === 1) return;
              const name = String(row.getCell(nameIdx + 1).value || '').trim();
              const value = String(row.getCell(valueIdx + 1).value || '').trim();
              const label = labelIdx !== -1 ? String(row.getCell(labelIdx + 1).value || '').trim() : value;
              const showif = showifIdx !== -1 ? String(row.getCell(showifIdx + 1).value || '').trim() : '';
              const scoreVal = scoreIdx !== -1 ? row.getCell(scoreIdx + 1).value : undefined;
              const score = scoreVal !== undefined && scoreVal !== null ? Number(scoreVal) : undefined;
              if (!name) return;
              if (!optionsMap[name]) optionsMap[name] = [];
              optionsMap[name].push({ value, label, ...(showif ? { showif } : {}), ...(score !== undefined ? { score } : {}) });
            });
          }
        }
        const data: any[] = [];
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell) => headers.push(String(cell.value)));
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return; // skip header
          const rowData: Record<string, any> = {};
          headers.forEach((header, colIdx) => {
            rowData[header] = row.getCell(colIdx + 1).value;
          });
          data.push(rowData);
        });
        const newQuestions: Question[] = data.map((row: any) => {
          const answerType = (row['Type'] && Object.values(AnswerType).includes(row['Type'])) ? row['Type'] as AnswerType : (row['type'] && Object.values(AnswerType).includes(row['type'])) ? row['type'] as AnswerType : AnswerType.TEXT;
          // Compute field name early (used for options lookup)
          let fieldName = row['field_name'] || row['Field Name'] || row['FieldName'] || makeFieldName(row['Question'] || row['question'] || `q_${Math.random().toString(36).substr(2, 4)}`);
          // Page and Section if provided in the spreadsheet
          const pageNameFromRow = row['Page'] || row['page'] || row['page_name'] || null;
          const sectionNameFromRow = row['Section'] || row['section'] || row['section_name'] || null;
          // Parse options: either from inline 'Options' column (value:label|value:label) or from second sheet 'options'
          let options = undefined;
          if ([AnswerType.DROPDOWN, AnswerType.RADIO, AnswerType.CHECKBOX].includes(answerType)) {
            if (row['Options']) {
              options = String(row['Options'])
                .split('|')
                .map((o: string) => {
                  const parts = o.split(':');
                  return { value: (parts[0] || '').trim(), label: (parts[1] || parts[0] || '').trim() };
                });
            } else {
              // try options sheet by field name
              const lookupName = fieldName || (row['field_name'] || row['Field Name'] || row['FieldName']);
              if (lookupName) {
                const key = String(lookupName).trim();
                if (optionsMap[key] && optionsMap[key].length) {
                  options = optionsMap[key];
                }
              }
            }
          }
          // Computed fields and visibility condition
          let metadata: Record<string, any> | undefined = undefined;
          const showIfFromRow = row['ShowIf'] || row['showIf'] || row['Visibility'] || row['visibility'] || row['Visible If'] || null;
          if (answerType === AnswerType.COMPUTED) {
            metadata = { computedFormula: row['calculation'] || row['Calculation'] || '' };
          }
          if (showIfFromRow) {
            metadata = { ...(metadata || {}), showIf: String(showIfFromRow) };
          }
          // parse new fields: score, reviewers_comment (boolean), group_name
          const scoreVal = Number(row['score'] || row['Score'] || 0) || 0;
          const reviewersCommentFlag = String(row['reviewers_comment'] || row['Reviewers_Comment'] || row['reviewersComment'] || '').toLowerCase() === 'true';
          const groupName = row['group_name'] || row['Group Name'] || row['groupName'] || undefined;

          return {
            id: `q${Math.random().toString(36).substr(2, 9)}`,
            activityId: activityId || '',
            pageName: pageNameFromRow || formDef.pages[activePageIndex].name,
            sectionName: sectionNameFromRow || formDef.pages[activePageIndex].sections[0].name,
            questionText: String(row['Question'] || row['question'] || 'Untitled').trim(),
            questionHelper: row['Helper Text'] || row['HelperText'] || row['helper'] || undefined,
            answerType,
            columnSize: Number(row['ColumnSize'] || row['columnSize'] || 12),
            required: String(row['Required'] || row['required'] || '').toLowerCase() === 'true',
            status: 'Active',
            createdBy: null,
            fieldName,
            options,
            metadata: { ...(metadata || {}), score: scoreVal, displayReviewersComment: reviewersCommentFlag },
            questionGroup: groupName
          };
        });
        if (newQuestions.length > 0) {
          // Deep-ish copy of formDef pages/sections to avoid mutating original
          const newFormDef: any = {
            ...formDef,
            pages: (formDef.pages || []).map(p => ({ ...p, sections: (p.sections || []).map(s => ({ ...s, questions: [...(s.questions || [])] })) }))
          };

          for (const q of newQuestions) {
            const targetPageName = q.pageName || (formDef.pages[activePageIndex] && formDef.pages[activePageIndex].name) || `Page ${newFormDef.pages.length + 1}`;
            const targetSectionName = q.sectionName || 'Section 1';

            let page = newFormDef.pages.find((p: any) => String(p.name).trim() === String(targetPageName).trim());
            if (!page) {
              page = { id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: targetPageName, sections: [] };
              newFormDef.pages.push(page);
            }

            let section = (page.sections || []).find((s: any) => String(s.name).trim() === String(targetSectionName).trim());
            if (!section) {
              section = { id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: targetSectionName, questions: [] };
              page.sections.push(section);
            }

            section.questions.push(q);
          }

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

  // Generate a sample Excel workbook (primary sheet + options sheet) and trigger download
  const generateSampleTemplate = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const sheet = wb.addWorksheet('questions');
      // Header row (added: score, reviewers_comment, group_name)
      sheet.addRow(['Question', 'Type', 'Helper Text', 'field_name', 'Required', 'ColumnSize', 'Page', 'Section', 'ShowIf', 'calculation', 'score', 'reviewers_comment', 'group_name']);
      // Example row
      sheet.addRow(['What is the program name?', 'textbox', 'Enter program title', 'program_name', 'true', 12, 'Main', 'General', '', '', 0, false, 'Programs']);

      const opts = wb.addWorksheet('options');
      opts.addRow(['name', 'value', 'label', 'showif', 'score']);
      opts.addRow(['program_type', 'gov', 'Government', '', 0]);
      opts.addRow(['program_type', 'ngo', 'NGO', 'org_size > 50', 0]);

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'form_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to generate template', e);
      alert('Failed to generate sample template.');
    }
  };

  // Export current form as Excel
  const handleDownloadForm = async () => {
    try {
      if (!formDef) {
        alert('No form to download');
        return;
      }

      const wb = new ExcelJS.Workbook();
      const sheet = wb.addWorksheet('questions');

      // Add header row
      sheet.addRow(['Question', 'Type', 'Helper Text', 'field_name', 'Required', 'ColumnSize', 'Page', 'Section', 'ShowIf', 'calculation', 'score', 'reviewers_comment', 'group_name']);

      // Format header row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };

      // Add all questions from all pages/sections
      formDef.pages.forEach((page: FormPage) => {
        page.sections.forEach((section: FormSection) => {
          section.questions.forEach((question: Question) => {
            sheet.addRow([
              question.questionText,
              question.answerType,
              question.questionHelper || '',
              question.fieldName || '',
              question.required ? 'true' : 'false',
              question.columnSize,
              page.name,
              section.name,
              question.metadata?.showIf || '',
              question.metadata?.computedFormula || '',
              question.metadata?.score || 0,
              question.metadata?.displayReviewersComment ? 'true' : 'false',
              section.groupName || ''
            ]);
          });
        });
      });

      // Auto-fit columns
      sheet.columns.forEach((column: any) => {
        column.width = 15;
      });

      // Create options sheet
      const optsSheet = wb.addWorksheet('options');
      optsSheet.addRow(['name', 'value', 'label', 'showif', 'score']);

      const optionsSet = new Set<string>();
      formDef.pages.forEach((page: FormPage) => {
        page.sections.forEach((section: FormSection) => {
          section.questions.forEach((question: Question) => {
            if (question.options && question.options.length > 0) {
              const fieldName = question.fieldName || question.questionText;
              question.options.forEach((opt: any) => {
                const key = `${fieldName}|${opt.value}`;
                if (!optionsSet.has(key)) {
                  optionsSet.add(key);
                  optsSheet.addRow([
                    fieldName,
                    opt.value,
                    opt.label || opt.value,
                    opt.showif || '',
                    opt.score || 0
                  ]);
                }
              });
            }
          });
        });
      });

      // Write and download
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `form_${activity?.id || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(url);

      alert('Form exported successfully!');
    } catch (e) {
      console.error('Failed to export form', e);
      alert('Failed to export form: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };


  if (!activity || !formDef) return <div>Loading...</div>;

  return (
    <div className="space-y-6 pb-0">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/activities')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{isSaved ? 'Edit Form' : 'Form Builder'}</h1>
            <p className="text-sm text-gray-500">{activity.title}</p>
          </div>
        </div>
        <div className="space-x-2">
          <Button variant="secondary" onClick={() => setIsGuideModalOpen(true)} leftIcon={<QuestionMarkCircleIcon className="h-5 w-5" />}>Guide</Button>
          <Button variant="secondary" onClick={handleDownloadForm} leftIcon={<ArrowDownIcon className="h-5 w-5" />}>Download</Button>
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} leftIcon={<ArrowUpTrayIcon className="h-5 w-5" />}>Bulk Import</Button>
          <Button onClick={handleSave}>{isSaved ? 'Update Form' : 'Save Form'}</Button>
        </div>
      </div>

      {/* Tabs for Pages */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {(formDef.pages || []).map((page, index) => (
            <div key={page.id} className="flex items-center space-x-2">
              <button
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
              <button title="Page permissions" onClick={(ev) => { ev.stopPropagation(); openRoleModalForPage(index); }} className="text-gray-500 hover:text-gray-700 p-1 rounded">
                <Cog6ToothIcon className="h-4 w-4" />
              </button>
              <button title="Delete page" onClick={(ev) => { ev.stopPropagation(); deletePage(index); }} className="text-red-500 hover:text-red-700 p-1 rounded">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
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
              <div className="flex items-center gap-3 flex-1">
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
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={section.isRepeatable || false}
                      onChange={(e) => {
                        const newDef = { ...formDef };
                        newDef.pages[activePageIndex].sections[sIdx].isRepeatable = e.target.checked;
                        if (e.target.checked) {
                          // If a groupName already exists and is non-empty, keep it; otherwise auto-generate a stable unique name
                          const existing = section.groupName && String(section.groupName).trim() !== '' ? String(section.groupName).trim() : undefined;
                          newDef.pages[activePageIndex].sections[sIdx].groupName = existing || generateUniqueGroupName(activePageIndex, sIdx, section.name);
                        } else {
                          newDef.pages[activePageIndex].sections[sIdx].groupName = undefined;
                        }
                        updateFormDef(newDef);
                      }}
                      className="rounded border-gray-300"
                    />
                    Add More
                  </label>
                  {/* show editable groupName when repeatable is enabled */}
                  {section.isRepeatable && (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={section.groupName || ''}
                          onChange={(e) => {
                            const newVal = String(e.target.value || '').trim();
                            const newDef = { ...formDef };
                            newDef.pages[activePageIndex].sections[sIdx].groupName = newVal;
                            updateFormDef(newDef);
                          }}
                          placeholder="Unique group name (required)"
                          className="border px-2 py-1 rounded text-sm w-56"
                        />
                        <div className="text-xs text-gray-500">Group name must be unique across form</div>
                      </div>
                      {section.groupName !== undefined && String(section.groupName).trim() === '' && (
                        <div className="text-xs text-red-600 ml-2">Group name is required</div>
                      )}
                      {section.groupName && isGroupNameDuplicate(section.groupName || '', activePageIndex, sIdx) && (
                        <div className="text-xs text-red-600 ml-2">Group name already used in another section</div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => moveSection(activePageIndex, sIdx, 'up')} disabled={sIdx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUpIcon className="h-5 w-5" /></button>
                <button onClick={() => moveSection(activePageIndex, sIdx, 'down')} disabled={sIdx === formDef.pages[activePageIndex].sections.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDownIcon className="h-5 w-5" /></button>
                <button title="Section permissions" onClick={() => openRoleModalForSection(activePageIndex, sIdx)} className="text-gray-500 hover:text-gray-700 p-1 rounded"><Cog6ToothIcon className="h-5 w-5" /></button>
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
                  roles={roles}
                  onOpenDatasetModal={(p, s, q) => { setDsSelectedForQuestion({ pIdx: p, sIdx: s, qIdx: q }); setIsDatasetModalOpen(true); setDatasetsList([]); }}
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

      <Modal size="2xl" isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Bulk Import Questions" footer={<Button onClick={() => setIsImportModalOpen(false)}>Close</Button>}>
        <div className="space-y-4 text-sm text-gray-700">
          <p>Upload an Excel file (.xlsx) to bulk-create questions. The workbook should include a header row on the primary worksheet and an optional second worksheet named <strong>options</strong> to supply choices for selection fields. Supported columns on the primary sheet (case-insensitive):</p>
          <ul className="list-disc ml-6">
            <li><strong>Question</strong> (required) — question text.</li>
            <li><strong>Type</strong> — one of: textbox, textarea, number, date, time, dropdown, radio, checkbox, file, computed.</li>
            <li><strong>Helper Text</strong> — optional helper or hint text.</li>
            <li><strong>Options</strong> — (DEPRECATED inline format) Options must be supplied via a separate worksheet named <strong>options</strong>. The <strong>options</strong> worksheet should contain 5 columns: <code>name</code> (the target question's <em>field_name</em>), <code>value</code>, <code>label</code>, <code>showif</code> (optional), and <code>score</code> (optional). Add one row per option; multiple rows with the same <code>name</code> will attach multiple options to the same question. The <code>showif</code> column can contain conditional expressions (e.g., <code>dept === 'HR'</code>) to hide/show options based on other field values. The <code>score</code> column contains numeric values for scoring assessments. Example rows:
              <div className="ml-4 mt-2">
                <code>program_type,gov,Government,,0</code><br />
                <code>program_type,ngo,NGO,org_size &gt; 50,5</code>
              </div>
            </li>
            <li><strong>Required</strong> — "true" or "false" (optional). Marks the question as mandatory when true.</li>
            <li><strong>ColumnSize</strong> — numeric; recommended values: 12 (full), 6 (half), 4 (third), 3 (quarter). Default is 12.</li>
            <li><strong>field_name</strong> — (for computed only) non-spaced field name to reference in formulas.</li>
            <li><strong>calculation</strong> — (for computed only) mathematical formula using field names, obeying BODMAS. Example: <code>age + score * 2</code></li>
            <li><strong>Page</strong> — optional: name of the page (tab) to place the question on. If omitted, the currently active page is used.</li>
            <li><strong>Section</strong> — optional: name of the section inside the page to place the question. If omitted, the first section of the page is used.</li>
            <li><strong>ShowIf</strong> — optional: visibility/conditional expression that controls whether the question is shown. Use the target question's <code>field_name</code> identifiers and a JavaScript-like expression. Examples: <code>age &gt; 18</code>, <code>facility === 'Nairobi' &amp;&amp; score &gt;= 50</code>, or <code>!!name</code>. If omitted or invalid, the question will be visible by default.</li>
            <li><strong>score</strong> — optional numeric score assigned to the question (used for summary scoring). Default: 0.</li>
            <li><strong>reviewers_comment</strong> — optional boolean (true/false). When true, a Reviewer's Comment textarea will be shown below the question for reviewers to add notes.</li>
            <li><strong>group_name</strong> — optional: logical grouping name for this question (e.g., Programs, Demographics). Stored as the question's group and useful for reporting/aggregation.</li>
          </ul>
          <button onClick={generateSampleTemplate} className="inline-block mb-2 text-primary-600 hover:underline text-sm font-medium" style={{ marginTop: 8 }}>Download sample template (Excel .xlsx)</button>
          <p className="text-xs text-gray-500">When importing, if your sheet provides <strong>Page</strong> and/or <strong>Section</strong> columns those values will be used to place questions into matching pages and sections (new pages/sections will be created when necessary). If Page/Section are omitted, questions will be added to the currently active page and its first section. You can edit assignments after import.</p>
          <input type="file" accept=".xlsx" onChange={handleFileImport} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
          <div className="text-xs text-gray-500">Notes: empty rows are ignored. Options must be provided via the <strong>options</strong> worksheet (one option per row). For computed fields, provide <code>field_name</code> and <code>calculation</code> columns. If Type is missing or invalid, the question will default to <code>textbox</code>.</div>
        </div>
      </Modal>

      {/* Role / Page / Section Permissions Modal */}
      {(() => {
        let modalTitle = 'Permissions';
        let modalSubtitle = 'target';
        if (roleModalTarget && formDef) {
          if (roleModalTarget.type === 'page') {
            const p = formDef.pages?.[roleModalTarget.pageIndex];
            modalTitle = `${p?.name || 'Page'} - Page Permissions`;
            modalSubtitle = `Page: ${p?.name || 'Page'}`;
          } else if (roleModalTarget.type === 'section') {
            const p = formDef.pages?.[roleModalTarget.pageIndex];
            const s = p?.sections?.[roleModalTarget.sectionIndex || 0];
            modalTitle = `${s?.name || 'Section'} - Section Permissions`;
            modalSubtitle = `Section: ${s?.name || 'Section'}`;
          }
        } else {
          modalTitle = roleModalTarget ? (roleModalTarget.type === 'page' ? `Page Permissions` : `Section Permissions`) : 'Permissions';
        }

        return (
          <Modal size="lg" isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={modalTitle} footer={<>
            <Button onClick={() => setIsRoleModalOpen(false)} variant="secondary">Cancel</Button>
            <Button onClick={handleSaveRolePerms} className="ml-2">Save Permissions</Button>
          </>}>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">Set Create / Read / Update / Delete permissions for each role on this {modalSubtitle}.</div>
              {rolePermsLoading && <div className="text-sm text-gray-500">Loading permissions…</div>}
              {!rolePermsLoading && (!roles || roles.length === 0) && <div className="text-sm text-gray-500">No roles available.</div>}
              {!rolePermsLoading && roles && roles.length > 0 && (
                <div className="overflow-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr>
                        <th className="text-left">Role</th>
                        <th className="text-center">Create</th>
                        <th className="text-center">Read</th>
                        <th className="text-center">Update</th>
                        <th className="text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((r: any) => {
                        const roleName = (r && (r.name || r)) ? (r.name || r) : String(r || '');
                        const cur = (rolePerms && rolePerms[roleName]) ? rolePerms[roleName] : { can_create: false, can_view: false, can_edit: false, can_delete: false };
                        return (
                          <tr key={roleName} className="border-t">
                            <td className="py-2">{roleName}</td>
                            <td className="text-center"><input type="checkbox" checked={!!cur.can_create} onChange={() => setRolePerms(prev => ({ ...prev, [roleName]: { ...(prev[roleName] || { can_create: false, can_view: false, can_edit: false, can_delete: false }), can_create: !((prev[roleName] || {}).can_create) } }))} /></td>
                            <td className="text-center"><input type="checkbox" checked={!!cur.can_view} onChange={() => setRolePerms(prev => ({ ...prev, [roleName]: { ...(prev[roleName] || { can_create: false, can_view: false, can_edit: false, can_delete: false }), can_view: !((prev[roleName] || {}).can_view) } }))} /></td>
                            <td className="text-center"><input type="checkbox" checked={!!cur.can_edit} onChange={() => setRolePerms(prev => ({ ...prev, [roleName]: { ...(prev[roleName] || { can_create: false, can_view: false, can_edit: false, can_delete: false }), can_edit: !((prev[roleName] || {}).can_edit) } }))} /></td>
                            <td className="text-center"><input type="checkbox" checked={!!cur.can_delete} onChange={() => setRolePerms(prev => ({ ...prev, [roleName]: { ...(prev[roleName] || { can_create: false, can_view: false, can_edit: false, can_delete: false }), can_delete: !((prev[roleName] || {}).can_delete) } }))} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      <Modal size="2xl" isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} title="Form Builder Guide" footer={<Button onClick={() => setIsGuideModalOpen(false)}>Close</Button>}>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Pages & Sections:</strong> Organize your form into pages (tabs) and sections.</p>
          <p><strong>Questions:</strong> Add various question types using the buttons at the bottom of each section.</p>
          <p><strong>Options:</strong> For Dropdown, Radio, and Checkbox, provide options via the separate <strong>options</strong> worksheet in the Excel template (preferred) or paste options into a question's Options field when editing. The worksheet should have columns <code>name</code> (field_name), <code>value</code>, <code>label</code>.</p>
          <p><strong>Computed Fields:</strong> Use the <code>Computed</code> question type to create fields calculated from other fields. Assign a unique <em>Field Name</em> and enter a formula using those names (e.g. <code>field_a + field_b * 2</code>).</p>
          <p><strong>Visibility / Conditional Logic:</strong> To make a question appear only under certain conditions, expand that question in the Form Builder and edit the <strong>Visibility Condition (Show If)</strong> field under the question's advanced settings. Enter a JavaScript-like expression referencing other questions by their <em>Field Name</em>. Examples: <code>age &gt; 18</code>, <code>facility === 'Nairobi' &amp;&amp; score &gt;= 50</code>, or <code>!!name</code> (shows when name is non-empty).</p>
          <p><strong>Validation:</strong> Questions marked with <span className="text-red-500">*</span> must have text, and selection types must have options.</p>
        </div>
      </Modal>
      {/* Dataset selector modal (uses page-level state) */}
      <Modal size="lg" isOpen={isDatasetModalOpen} onClose={() => { setIsDatasetModalOpen(false); setSelectedDatasetId(null); setDatasetSampleRows([]); setSelectedLabelField(''); setSelectedValueField(''); }} title="Load Options From Dataset">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Select a dataset</h3>
              <button className="text-sm text-gray-500" onClick={async () => {
                setDsLoading(true);
                try {
                  const r = await fetch('/api/admin/datasets');
                  const j = await r.json();
                  setDatasetsList(Array.isArray(j) ? j : []);
                } catch (e) { console.error('Failed to fetch datasets', e); setDatasetsList([]); }
                setDsLoading(false);
              }}>Refresh</button>
            </div>
            <div className="mt-2">
              {dsLoading && <div className="text-sm text-gray-500">Loading...</div>}
              {!dsLoading && datasetsList.length === 0 && <div className="text-sm text-gray-400">No datasets found. Create datasets in Settings → Datasets.</div>}
              {!dsLoading && datasetsList.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-auto">
                  {datasetsList.map(ds => (
                    <div key={ds.id} className={`p-2 border rounded ${selectedDatasetId === ds.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`} onClick={async () => {
                      setSelectedDatasetId(ds.id);
                      // fetch sample rows and fields
                      try {
                        const detailsRes = await fetch(`/api/admin/datasets/${ds.id}`);
                        const details = await detailsRes.json();
                        let fields: string[] = [];
                        if (Array.isArray(details.dataset_fields) && details.dataset_fields.length) {
                          fields = details.dataset_fields.map((f: any) => f.name).filter(Boolean);
                        }
                        const contentRes = await fetch(`/api/admin/datasets/${ds.id}/content?limit=50`);
                        const contentJson = await contentRes.json();
                        const sampleRows = Array.isArray(contentJson.rows) ? contentJson.rows.map((rr: any) => rr.dataset_data || {}) : [];
                        setDatasetSampleRows(sampleRows || []);
                        // If no dataset_fields, infer from sample
                        if (!fields.length) {
                          const inferred = new Set<string>();
                          (sampleRows || []).slice(0, 5).forEach((r: any) => { if (r && typeof r === 'object') Object.keys(r).forEach(k => inferred.add(k)); });
                          fields = Array.from(inferred);
                        }
                        // populate selects defaults
                        setSelectedLabelField(fields[0] || '');
                        setSelectedValueField(fields[0] || '');
                      } catch (e) { console.error(e); setDatasetSampleRows([]); setSelectedLabelField(''); setSelectedValueField(''); }
                    }}>
                      <div className="text-sm font-medium">{ds.name}</div>
                      <div className="text-xs text-gray-500">{ds.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Or: Load from Answers (activity)</h3>
              <button className="text-sm text-gray-500" onClick={async () => {
                setActivitiesLoading(true);
                try {
                  const r = await fetch('/api/activities');
                  const j = await r.json();
                  setActivitiesList(Array.isArray(j) ? j : []);
                } catch (e) { console.error('Failed to fetch activities', e); setActivitiesList([]); }
                setActivitiesLoading(false);
              }}>Refresh Activities</button>
            </div>
            <div className="mt-2">
              {activitiesLoading && <div className="text-sm text-gray-500">Loading activities...</div>}
              {!activitiesLoading && activitiesList.length === 0 && <div className="text-sm text-gray-400">No activities found. Try Refresh.</div>}
              {!activitiesLoading && activitiesList.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-auto">
                  {activitiesList.map(act => (
                    <div key={act.id} className={`p-2 border rounded ${selectedActivityForAnswers === act.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`} onClick={async () => {
                      setSelectedActivityForAnswers(act.id);
                      try {
                        const res = await fetch(`/api/answers?activityId=${act.id}`);
                        const ans = await res.json();
                        // Map answers to simple values — try answer_value, answer
                        const rows = Array.isArray(ans) ? ans.map((a: any) => {
                          const val = (a.answer_value && typeof a.answer_value === 'object') ? (a.answer_value.value ?? JSON.stringify(a.answer_value)) : (a.answer_value ?? a.answer ?? '');
                          return { answer: val, created_at: a.created_at };
                        }) : [];
                        setAnswersSampleRows(rows.slice(0, 200));
                      } catch (e) { console.error('Failed to fetch answers', e); setAnswersSampleRows([]); }
                    }}>
                      <div className="text-sm font-medium">{act.title || act.name || act.activityTitle || `Activity ${act.id}`}</div>
                      <div className="text-xs text-gray-500">{act.description || ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3">
              <div className="text-sm text-gray-500">Preview (first 10 answers):</div>
              <div className="max-h-28 overflow-auto bg-white border rounded p-2 mt-2 text-xs">
                {answersSampleRows.length === 0 && <div className="text-xs text-gray-400">No answers loaded.</div>}
                {answersSampleRows.length > 0 && (
                  <ul className="list-disc ml-6">
                    {answersSampleRows.slice(0, 10).map((r, i) => <li key={i} className="truncate max-w-full">{String(r.answer ?? '')}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500">Label Field</label>
            <select className="mt-1 block w-full border-gray-300 rounded" value={selectedLabelField} onChange={e => setSelectedLabelField(e.target.value)}>
              <option value="">-- select --</option>
              {(() => {
                // build options from sample rows keys
                const keys = new Set<string>();
                datasetSampleRows.slice(0, 10).forEach(r => { if (r && typeof r === 'object') Object.keys(r).forEach(k => keys.add(k)); });
                return Array.from(keys).map(k => <option key={k} value={k}>{k}</option>);
              })()}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500">Value Field</label>
            <select className="mt-1 block w-full border-gray-300 rounded" value={selectedValueField} onChange={e => setSelectedValueField(e.target.value)}>
              <option value="">-- select --</option>
              {(() => {
                const keys = new Set<string>();
                datasetSampleRows.slice(0, 10).forEach(r => { if (r && typeof r === 'object') Object.keys(r).forEach(k => keys.add(k)); });
                return Array.from(keys).map(k => <option key={k} value={k}>{k}</option>);
              })()}
            </select>
          </div>

          <div className="text-sm text-gray-500">Preview (first 5 rows):</div>
          <div className="max-h-40 overflow-auto bg-white border rounded p-2">
            {datasetSampleRows.length === 0 && <div className="text-xs text-gray-400">No sample rows available.</div>}
            {datasetSampleRows.length > 0 && (
              <table className="w-full text-xs table-auto">
                <thead>
                  <tr>{Object.keys(datasetSampleRows[0] || {}).map(k => <th key={k} className="px-1 text-left font-semibold">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {datasetSampleRows.slice(0, 5).map((r, idx) => (
                    <tr key={idx} className="border-t"><td className="px-1">{Object.values(r).map((v: any, i: number) => <div key={i} className="truncate max-w-xs">{String(v ?? '')}</div>)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => { setIsDatasetModalOpen(false); setSelectedDatasetId(null); setDatasetSampleRows([]); }}>Cancel</Button>
            <Button onClick={async () => {
              if (!dsSelectedForQuestion) return alert('No question selected');
              try {
                if (selectedActivityForAnswers) {
                  // build options from loaded answers preview
                  if (!answersSampleRows || answersSampleRows.length === 0) return alert('No answers loaded for selected activity');
                  const opts = answersSampleRows.map((r: any) => ({ label: String(r.answer ?? ''), value: String(r.answer ?? '') })).filter(o => o.value !== '');
                  updateQuestion(dsSelectedForQuestion.pIdx, dsSelectedForQuestion.sIdx, dsSelectedForQuestion.qIdx, { options: opts });
                  setIsDatasetModalOpen(false);
                  return;
                }

                if (!selectedDatasetId) return alert('Select a dataset');
                if (!selectedLabelField || !selectedValueField) return alert('Choose label and value fields');
                // build options from sample rows
                const res = await fetch(`/api/admin/datasets/${selectedDatasetId}/content?limit=100`);
                const j = await res.json();
                const rows = Array.isArray(j.rows) ? j.rows.map((r: any) => (r.dataset_data ? r.dataset_data : r.dataset_data === undefined ? {} : {})) : [];
                const opts = (rows || []).map((r: any) => ({ label: String(r[selectedLabelField] ?? ''), value: String(r[selectedValueField] ?? '') })).filter(o => o.value !== '');
                // update the target question's options
                updateQuestion(dsSelectedForQuestion.pIdx, dsSelectedForQuestion.sIdx, dsSelectedForQuestion.qIdx, { options: opts });
                setIsDatasetModalOpen(false);
              } catch (e) { console.error('Failed to build options from dataset/answers', e); alert('Failed to build options from dataset/answers'); }
            }}>Insert Options</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BuildFormPage;