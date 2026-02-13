import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import ConversationPanel from '../components/ui/ConversationPanel';
import Modal from '../components/ui/Modal';
import { confirm as swalConfirm, success as swalSuccess, error as swalError } from '../components/ui/swal';
import Swal from 'sweetalert2';
import RichTextEditor from '../components/ui/RichTextEditor';
import { apiFetch, getApiBase } from '../utils/api';
import { useMockData } from '../hooks/useMockData';
import { resolveCellReferenceFromContext } from '../utils/formulaEvaluator';

const ReportViewPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useMockData();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [actualTables, setActualTables] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activityTitle, setActivityTitle] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<any>(null);
  const [powerbiConfig, setPowerbiConfig] = useState<any>(null);
  const [builtTemplate, setBuiltTemplate] = useState<any>(null);
  const [templatesForActivity, setTemplatesForActivity] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<string | null>(null);
  const [powerbiModalOpen, setPowerbiModalOpen] = useState(false);
  const [paperPreviewOpen, setPaperPreviewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState<string>(report?.reviewersReport || '');
  const [reviewScore, setReviewScore] = useState<number | null>(report?.overallScore ?? null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(report?.status ?? null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [powerbiExpanded, setPowerbiExpanded] = useState(false);
  const [conversationExpanded, setConversationExpanded] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocData, setEditingDocData] = useState<any[]>([]);
  const [originalDocData, setOriginalDocData] = useState<any[]>([]); // Track original data to identify deleted rows
  const [editedCells, setEditedCells] = useState<Set<string>>(new Set());
  const [editingNewRows, setEditingNewRows] = useState<Set<number>>(new Set());
  const [deletedRowIndices, setDeletedRowIndices] = useState<Set<number>>(new Set());
  const [cellFormulas, setCellFormulas] = useState<Record<string, string>>({}); // Maps cellRef to formula
  const [selectedCellForFormula, setSelectedCellForFormula] = useState<string | null>(null);
  const [formulaInput, setFormulaInput] = useState<string>('');
  const cellNameInputRef = useRef<HTMLInputElement>(null); // Ref for cell name input field
  const formulaInputRef = useRef<HTMLTextAreaElement>(null); // Ref for formula input field
  const [columnDataTypes, setColumnDataTypes] = useState<Record<string, string>>({}); // Maps column name to data type
  const editingModeRef = useRef<'cellName' | 'formula' | null>(null); // Track which input is being edited (using ref to persist through blur events)
  const [submittedAnswersExpanded, setSubmittedAnswersExpanded] = useState(true); // Track collapsed state for Submitted Answers section
  const [actualTablesExpanded, setActualTablesExpanded] = useState(true); // Track collapsed state for Actual Tables section
  const [uploadedFilesExpanded, setUploadedFilesExpanded] = useState(true); // Track collapsed state for Uploaded Files section

  // Actual tables editing states
  const [editingTableId, setEditingTableId] = useState<string | null>(null); // Currently editing table
  const [tableEditingData, setTableEditingData] = useState<Record<string, any[]>>({}); // Per-table editing data
  const [tableSelectedRows, setTableSelectedRows] = useState<Record<string, Set<number>>>({}); // Per-table row selections
  const [tableChangedCells, setTableChangedCells] = useState<Record<string, Set<string>>>({}); // Per-table changed cells (key: "rowIdx_colName")
  const [tableNewRows, setTableNewRows] = useState<Record<string, Set<number>>>({}); // Per-table new row indices
  const [tableFormulas, setTableFormulas] = useState<Record<string, Record<string, string>>>({}); // Per-table formulas (cellRef -> formula)
  const [tableSelectedCell, setTableSelectedCell] = useState<string | null>(null); // Currently selected cell for formula (format: "tableId_rowIdx_colName")
  const [tableFormulaInput, setTableFormulaInput] = useState<string>(''); // Formula input for actual tables
  const tableFormulaInputRef = useRef<HTMLTextAreaElement>(null);
  const tableCellNameInputRef = useRef<HTMLInputElement>(null);
  const tableEditingModeRef = useRef<'cellName' | 'formula' | null>(null);

  // Authorization checks
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'super-admin';

  // Helper: Generate unique cell names based on Excel convention
  const generateCellName = (docId: number, filename: string, colIndex: number, rowIndex: number): string => {
    // Abbreviate filename: take first letter of each word
    const abbr = filename
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3); // Limit to 3 chars

    // Convert column index to letter(s): 0->A, 1->B, ..., 26->AA, etc.
    let colLetter = '';
    let col = colIndex;
    while (col >= 0) {
      colLetter = String.fromCharCode(65 + (col % 26)) + colLetter;
      col = Math.floor(col / 26) - 1;
      if (col < 0) break;
    }
    return `report${report?.id || 0}_${abbr}_${colLetter}${rowIndex + 1}`;
  };

  // Helper: Export table to Excel
  const exportTableToExcel = (table: any) => {
    if (!table.rows || table.rows.length === 0) {
      try { swalError('No Data', 'Table has no rows to export'); } catch (e) { }
      return;
    }

    const filename = `${table.title || table.database_name}-${new Date().toISOString().split('T')[0]}.csv`;

    // Build CSV header
    const headers = table.schema ? Object.keys(table.schema) : [];
    const csvLines = [headers.join(',')];

    // Add data rows
    for (const row of table.rows) {
      const values = headers.map(colName => {
        const value = row[colName] ?? '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if needed
        return `"${stringValue.replace(/"/g, '""')}"`;
      });
      csvLines.push(values.join(','));
    }

    // Create and download CSV file
    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Parse cell reference to find value (for same-document references)
  const resolveCellReference = (cellRef: string): any => {
    // Format: report1_H_D1
    const parts = cellRef.split('_');
    if (parts.length < 3) {
      console.warn('Cell reference parsing failed - not enough parts:', cellRef, parts);
      return undefined;
    }

    // Extract column letter and row number from the last part (e.g., "H1" from "report1_H_H1")
    const colLetter = parts[parts.length - 1];
    const match = colLetter.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      console.warn('Cell reference parsing failed - invalid format:', cellRef, colLetter);
      return undefined;
    }

    const [, letters, rowStr] = match;
    const rowIndex = Number(rowStr) - 1;

    // Find column index from letters (A=0, B=1, C=2, ..., Z=25, AA=26, etc.)
    let colIndex = 0;
    for (let i = 0; i < letters.length; i++) {
      colIndex = colIndex * 26 + (letters.charCodeAt(i) - 64);
    }
    colIndex--;

    console.log(`Resolving same-document ${cellRef}: rowIndex=${rowIndex}, colIndex=${colIndex}, letters=${letters}`);

    // Find the document - prioritize currently editing document, then search others
    const docsToCheck = [
      ...uploadedDocs.filter(doc => doc.id === editingDocId),
      ...uploadedDocs.filter(doc => doc.id !== editingDocId)
    ];

    for (const doc of docsToCheck) {
      const rows = doc.id === editingDocId ? editingDocData : (Array.isArray(doc.file_content) ? doc.file_content : []);
      if (rowIndex >= 0 && rowIndex < rows.length) {
        const row = rows[rowIndex];
        const keys = Object.keys(row || {});
        console.log(`Row ${rowIndex} keys:`, keys);
        if (colIndex >= 0 && colIndex < keys.length) {
          const value = row[keys[colIndex]];
          console.log(`Cell ${cellRef} raw value:`, value, `(type: ${typeof value})`);
          // Convert to number if it's a numeric string
          if (typeof value === 'string') {
            const numValue = Number(value);
            const result = isNaN(numValue) ? value : numValue;
            console.log(`Converted string "${value}" to:`, result);
            return result;
          }
          return value;
        } else {
          console.warn(`Column index ${colIndex} out of bounds for row with ${keys.length} columns`);
        }
      }
    }
    console.warn(`No matching row/column found for cell reference: ${cellRef}`);
    return undefined;
  };

  // Helper: Evaluate JavaScript expression with cell references and return both value and refvalue
  const evaluateExpression = (expression: string): { value: any; refvalue: string } => {
    try {
      // Build a context from all uploaded documents for cross-document reference support
      const formulasContext: Record<string, any> = {};

      for (const doc of uploadedDocs) {
        if (report?.id) {
          // Format: report{reportId}.{docId}
          const key = `report${report.id}.${doc.id}`;
          formulasContext[key] = {
            fileContent: Array.isArray(doc.file_content) ? doc.file_content : [],
            filename: doc.filename || ''
          };
        }
      }

      // Create a safe context with cell reference resolution
      const context: Record<string, any> = {};
      const cellRefPattern = /report\d+(?:\.\d+)?_[A-Z]{1,3}_[A-Z]+\d+/g;
      const matches = expression.match(cellRefPattern) || [];
      const refMap: Record<string, any> = {}; // Track cell refs and their values for refvalue

      for (const cellRef of matches) {
        let resolvedValue: any;

        // Check if it's a cross-document reference (contains a dot)
        if (cellRef.includes('.')) {
          // Cross-document reference
          resolvedValue = resolveCellReferenceFromContext(cellRef, formulasContext);
        } else {
          // Same-document reference - use the legacy resolver
          resolvedValue = resolveCellReference(cellRef);
        }

        context[cellRef] = resolvedValue;
        refMap[cellRef] = resolvedValue;
        console.log(`Resolved ${cellRef} to:`, resolvedValue, `(type: ${typeof resolvedValue})`);
      }

      // If the expression is just a single cell reference, return its value directly
      if (matches.length === 1 && matches[0] === expression.trim()) {
        const value = context[matches[0]];
        return {
          value: value,
          refvalue: `${value}` // Simple case: just the value
        };
      }

      // Use Function constructor for evaluation (safer than eval)
      const func = new Function(...Object.keys(context), `return ${expression}`);
      const result = func(...Object.values(context));

      // Handle NaN - log it and return null or 0
      if (typeof result === 'number' && isNaN(result)) {
        console.warn('Formula evaluated to NaN:', expression, 'Context:', context);
        return {
          value: null,
          refvalue: 'NaN'
        };
      }

      // Create refvalue by replacing cell references with their actual values
      let refvalue = expression;
      for (const [cellRef, cellValue] of Object.entries(refMap)) {
        // Escape special regex characters in cellRef and replace all occurrences
        const escapedRef = cellRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        refvalue = refvalue.replace(new RegExp(escapedRef, 'g'), String(cellValue));
      }

      console.log('Formula result:', result, 'Expression:', expression, 'Refvalue:', refvalue);
      return {
        value: result,
        refvalue: refvalue
      };
    } catch (e) {
      console.error('Expression evaluation error:', e, 'Expression:', expression);
      return {
        value: null,
        refvalue: 'Error'
      };
    }
  };

  // Helper: Convert formulas to new format with evaluated values and refvalues
  const normalizeFormulas = (formulas: Record<string, any>): Record<string, any> => {
    const normalized: Record<string, any> = {};
    for (const [cellRef, formulaOrObj] of Object.entries(formulas)) {
      if (typeof formulaOrObj === 'string') {
        // Old format: convert to new format with evaluated value and refvalue
        const { value, refvalue } = evaluateExpression(formulaOrObj);
        normalized[cellRef] = { formula: formulaOrObj, value: value, refvalue: refvalue };
      } else if (typeof formulaOrObj === 'object' && formulaOrObj !== null) {
        // Already in object format, re-evaluate to ensure value and refvalue are correct
        const { value, refvalue } = evaluateExpression(formulaOrObj.formula);
        normalized[cellRef] = { formula: formulaOrObj.formula, value: value, refvalue: refvalue };
      }
    }
    return normalized;
  };

  // Helper: Extract formula string from formula object
  const getFormulaString = (formulaOrObj: any): string => {
    if (typeof formulaOrObj === 'string') {
      return formulaOrObj;
    } else if (typeof formulaOrObj === 'object' && formulaOrObj !== null && formulaOrObj.formula) {
      return formulaOrObj.formula;
    }
    return '';
  };

  // Helper: Extract evaluated value from formula object
  const getFormulaValue = (formulaOrObj: any): any => {
    if (typeof formulaOrObj === 'object' && formulaOrObj !== null && 'value' in formulaOrObj) {
      return formulaOrObj.value;
    }
    return null;
  };

  const saveReview = async () => {
    if (!report) return;
    try {
      const payload: any = { reviewers_report: reviewContent, overall_score: reviewScore, status: reviewStatus };
      const res = await apiFetch(`/api/reports/${report.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const updated = await res.json();
        setReport(prev => ({ ...prev, reviewersReport: updated.reviewers_report || updated.reviewersReport, overallScore: updated.overall_score || updated.overallScore, status: updated.status || prev?.status }));
        setReviewModalOpen(false);
      } else {
        try { swalError('Save failed', 'Failed to save review'); } catch (e) { }
      }
    } catch (e) { console.error(e); try { swalError('Save failed', 'Failed to save review'); } catch (er) { } }
  };

  // Helper to insert HTML into the review content (used after uploads)
  const insertHtmlAtCaret = (html: string) => {
    const editor = document.getElementById('review-editor');
    if (!editor) {
      setReviewContent((prev) => (prev || '') + html);
      return;
    }
    editor.focus();
    const sel = window.getSelection();
    if (!sel || !sel.getRangeAt || sel.rangeCount === 0) {
      editor.insertAdjacentHTML('beforeend', html);
      setReviewContent((prev) => (editor as HTMLElement).innerHTML || '');
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const el = document.createElement('div');
    el.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node, lastNode;
    while ((node = el.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setReviewContent((editor as HTMLElement).innerHTML || '');
  };

  const uploadMedia = async (file: File) => {
    if (!report) return null;
    const reader = new FileReader();
    return await new Promise<string | null>((resolve) => {
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        try {
          const res = await apiFetch('/api/review_uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ reportId: report.id, filename: file.name, contentBase64: dataUrl, mimeType: file.type }) });
          if (res.ok) {
            const j = await res.json();
            resolve(j.url);
            return;
          }
        } catch (e) { console.error(e); }
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const r = await apiFetch(`/api/reports/${reportId}`, { credentials: 'include' });
        if (!r.ok) { console.error('Failed to load report'); setLoading(false); return; }
        const jr = await r.json();
        setReport(jr);
        // fetch answers and questions so we can show labels, pages, sections
        const [aRes, qRes, docs, uRes, actualTablesRes] = await Promise.all([
          apiFetch(`/api/answers?reportId=${reportId}`, { credentials: 'include' }),
          apiFetch(`/api/questions?activityId=${jr.activity_id}`, { credentials: 'include' }),
          apiFetch(`/api/uploaded_docs?reportId=${jr.id}`, { credentials: 'include' }),
          apiFetch(`/api/users`, { credentials: 'include' }),
          apiFetch(`/api/actual_tables?activityId=${jr.activity_id}`, { credentials: 'include' })
        ]);
        if (aRes.ok) {
          const answersData = await aRes.json() || [];
          // Sort answers by ID to maintain consistent order
          const sortedAnswers = answersData.sort((a: any, b: any) => {
            const aId = Number(a.id) || 0;
            const bId = Number(b.id) || 0;
            return aId - bId;
          });
          setAnswers(sortedAnswers);
          console.log('Loaded answers:', sortedAnswers);
        }
        if (qRes.ok) {
          const questionsData = await qRes.json() || [];
          console.log('Loaded questions:', questionsData);
          console.log('Questions count:', questionsData.length);
          console.log('📊 IMPORTANT: Loaded questions for activity_id:', jr.activity_id);
          if (questionsData.length === 0) {
            console.warn(`⚠️ NO QUESTIONS FOUND for activity_id=${jr.activity_id}. This means either:
1. Questions don't exist in the database for this activity
2. The activity_id is wrong
3. Questions were deleted`);
          }
          if (questionsData.length > 0) {
            console.log('Sample question structure:', questionsData[0]);
          }
          setQuestions(questionsData);
        } else {
          console.error('❌ Questions API failed:', qRes.status, await qRes.text());
        }
        if (docs.ok) {
          const docsData = await docs.json() || [];
          console.log('Loaded uploaded docs:', docsData);
          setUploadedDocs(docsData);
        }
        if (actualTablesRes.ok) {
          const tablesData = await actualTablesRes.json() || [];
          console.log('Loaded actual tables:', tablesData);

          // Fetch rows from physical tables for each table
          const tablesWithRows = await Promise.all(
            tablesData.map(async (table: any) => {
              try {
                const rowsRes = await apiFetch(`/api/actual_tables/${table.id}/physical-rows`, { credentials: 'include' });
                if (rowsRes.ok) {
                  const tableData = await rowsRes.json();
                  console.log(`[Table ${table.id}] Physical rows response:`, {
                    rowCount: tableData.row_count,
                    schemaKeys: tableData.schema ? Object.keys(tableData.schema) : [],
                    firstRow: tableData.rows ? tableData.rows[0] : null
                  });
                  // Use the schema from the physical-rows endpoint response (which includes relationship fields)
                  return {
                    ...table,
                    schema: tableData.schema || table.schema,
                    rows: tableData.rows || [],
                    row_count: tableData.row_count || 0
                  };
                }
              } catch (e) {
                console.error(`Failed to fetch rows for table ${table.id}:`, e);
              }
              return { ...table, rows: [], row_count: 0 };
            })
          );

          console.log('Final tables with rows:', tablesWithRows);
          setActualTables(tablesWithRows);
        }
        if (uRes.ok) setUsers(await uRes.json() || []);
        // fetch activity (title + data)
        try {
          const actRes = await apiFetch(`/api/activities/${jr.activity_id}`, { credentials: 'include' });
          if (actRes.ok) {
            const act = await actRes.json(); setActivityTitle(act.title || act.activityTitle || act.name || null); setActivityData(act);
          }
        } catch (e) { }
        // fetch powerbi config (public)
        try {
          const pb = await apiFetch(`/api/reports/${jr.id}/powerbi`);
          if (pb.ok) { const j = await pb.json(); setPowerbiConfig(j); }
        } catch (e) { }
        // fetch associated template if available
        try {
          if (jr.report_template_id) {
            const t = await apiFetch(`/api/report_templates/${jr.report_template_id}`);
            if (t.ok) { const tj = await t.json(); setBuiltTemplate(tj); }
          }
        } catch (e) { /* ignore */ }
        // fetch all templates for this activity so we can show buttons to build any of them
        try {
          const tplRes = await apiFetch(`/api/report_templates?activityId=${jr.activity_id}`);
          if (tplRes.ok) {
            const tplJson = await tplRes.json(); setTemplatesForActivity(Array.isArray(tplJson) ? tplJson : []);
          }
        } catch (e) { setTemplatesForActivity([]); }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [reportId]);

  // sync review modal default values when report loads
  useEffect(() => {
    if (!report) return;
    try {
      // don't overwrite content if user is actively editing the review (caret inside editor)
      const active = document.activeElement as HTMLElement | null;
      const inEditor = active && (active.closest ? (active.closest('.richtext-editor') || active.closest('#review-editor')) : false);
      if (inEditor) return;
    } catch (e) { }
    setReviewContent(report.reviewersReport || report.reviewers_report || '');
    setReviewScore(report.overallScore ?? report.overall_score ?? null);
    setReviewStatus(report.status || null);
  }, [report]);

  // derive facility name by looking up facility_id against /api/facilities
  useEffect(() => {
    (async () => {
      try {
        setFacilityName(null);
        if (!report) return;
        const fid = report.facility_id || report.facilityId || report.facility;
        if (!fid) return;
        // fetch all facilities and find matching id (server exposes GET /api/facilities)
        const r = await apiFetch('/api/facilities');
        if (!r.ok) return;
        const all = await r.json();
        const found = (all || []).find((f: any) => String(f.id) === String(fid));
        if (found) setFacilityName(found.name || found.title || null);
      } catch (e) { console.error('Failed to load facility name', e); }
    })();
  }, [report]);

  if (loading) return <div>Loading...</div>;
  if (!report) return <div>Report not found.</div>;

  // derive facility name by looking up facility_id against /api/facilities
  const facilityLabelFallback = `Report ${report.id}`;
  const activityResponseType = (report.response_type || report.responseType || '').toString().toLowerCase();
  const userLabel = report.reported_by_name || report.reportedByName || report.reported_by || report.reportedBy || report.user_name || report.userName || (report.reported_by ? `User ${report.reported_by}` : null);
  const subjectLabel = activityResponseType === 'user' ? (userLabel || facilityName || facilityLabelFallback) : (facilityName || facilityLabelFallback);

  const handlePrint = () => window.print();

  const handleGeneratePDF = async () => {
    // Generate PDF server-side and download it
    try {
      const htmlDoc = buildReportHtml();
      const res = await fetch('/api/build_report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlDoc,
          format: 'pdf',
          filename: `report_${report.id}`,
          paperSize: 'A4',
          orientation: 'portrait'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          // Download the PDF
          const link = document.createElement('a');
          link.href = data.url;
          link.download = `report_${report.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        alert('Failed to generate PDF');
      }
    } catch (e) { console.error('PDF generation failed:', e); alert('Failed to generate PDF'); }
  };

  const buildReportHtml = () => {
    // Build a sanitized HTML summary client-side
    const escapeHtml = (s: any) => {
      if (s === null || s === undefined) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    const sanitizeHtml = (html: any) => {
      if (!html) return '';
      let out = String(html || '');
      out = out.replace(/<video[\s\S]*?<\/video>/gi, '');
      out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
      out = out.replace(/<object[\s\S]*?<\/object>/gi, '');
      out = out.replace(/<embed[\s\S]*?<\/embed>/gi, '');
      out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
      out = out.replace(/src=(\"|\')(data:[^\"']{5000,})(\"|\')/gi, '');
      return out;
    };

    // Build questions map
    const qMap: Record<string, any> = {};
    for (const q of questions || []) {
      try {
        if (q && q.id !== undefined) qMap[String(q.id)] = q;
        if (q && q.qid !== undefined) qMap[String(q.qid)] = q;
        if (q && q.question_id !== undefined) qMap[String(q.question_id)] = q;
      } catch (e) { }
    }

    // Build non-grouped answers HTML
    const groupedAnswersMap: Record<string, any[]> = {};
    const nonGroupedAnswers: any[] = [];
    answers.forEach(a => {
      const q = qMap[String(a.question_id)] || {};
      if (q.questionGroup || q.question_group) {
        const groupName = q.questionGroup || q.question_group;
        if (!groupedAnswersMap[groupName]) groupedAnswersMap[groupName] = [];
        groupedAnswersMap[groupName].push({ answer: a, question: q });
      } else {
        nonGroupedAnswers.push(a);
      }
    });

    const answersHtmlParts: string[] = [];
    for (const a of nonGroupedAnswers || []) {
      try {
        const qid = String(a.question_id || a.qid || a.questionId || '');
        const q = qMap[qid] || {};
        const questionText = q.questionText || q.question_text || q.text || q.label || q.title || q.name || qid;
        let val: any = a.answer_value;
        if (val === null || val === undefined) val = '';
        try {
          if (typeof val === 'object') {
            if ('value' in val) val = val.value ?? '';
            else val = JSON.stringify(val);
          } else if (typeof val === 'string' && val.trim().startsWith('[')) {
            // Parse checkbox/multi-select answers stored as JSON arrays
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                // Format as comma-separated list for checkboxes
                val = parsed.join(', ');
              } else {
                val = String(val);
              }
            } catch (e) {
              val = String(val);
            }
          } else if (typeof val === 'string' && val.trim().startsWith('{')) {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object' && 'value' in parsed) {
              val = parsed.value ?? '';
            } else {
              val = String(val);
            }
          } else {
            val = String(val);
          }
        } catch (e) {
          val = String(a.answer_value ?? '');
        }

        // Get metadata fields
        const score = a.score !== undefined && a.score !== null ? String(a.score) : '';
        const reviewersComment = a.reviewers_comment || a.reviewers_report || '';
        const followup = a.quality_improvement_followup || '';

        // Build answer row with metadata below
        let answerRow = `<tr><td style="vertical-align:top;padding:6px;border:1px solid #ddd;width:40%"><strong style="font-size:12px">${escapeHtml(questionText)}</strong></td><td style="padding:6px;border:1px solid #ddd;font-size:12px">${escapeHtml(val)}</td></tr>`;

        // Add metadata row if any metadata exists
        if (score || reviewersComment || followup) {
          answerRow += `<tr><td colspan="2" style="padding:4px 6px;border:1px solid #ddd;background-color:#f9f9f9;font-size:10px">`;
          if (score) answerRow += `<div><strong>Score:</strong> ${escapeHtml(score)}</div>`;
          if (reviewersComment) answerRow += `<div><strong>Reviewer's Comment:</strong> ${escapeHtml(reviewersComment)}</div>`;
          if (followup) answerRow += `<div><strong>Follow-up:</strong> ${escapeHtml(followup)}</div>`;
          answerRow += `</td></tr>`;
        }

        answersHtmlParts.push(answerRow);
      } catch (e) { }
    }

    // Build grouped questions tables
    const groupedQuestionsHtml = Object.entries(groupedAnswersMap).map(([groupName, groupAnswers]) => {
      const rowMap: Record<number, Record<string, any>> = {};
      const columnsMap: Record<string, any> = {};

      groupAnswers.forEach(item => {
        const a = item.answer;
        const q = item.question;
        const rowIndex = a.answer_row_index !== null && a.answer_row_index !== undefined ? Number(a.answer_row_index) : 0;
        const questionId = String(a.question_id);
        if (!rowMap[rowIndex]) rowMap[rowIndex] = {};
        const questionText = q.questionText || q.question_text || q.text || q.label || questionId;
        const qKey = `q_${questionId}`;
        rowMap[rowIndex][qKey] = a.answer_value;
        columnsMap[qKey] = { text: questionText, qKey };
      });

      const sortedRowIndices = Object.keys(rowMap).map(Number).sort((a, b) => a - b);
      const columnDefs = Object.values(columnsMap);

      let tableHtml = `<div style="margin-top:16px;page-break-inside:avoid"><strong>${escapeHtml(groupName.replace(/_/g, ' '))}</strong><table style="border-collapse:collapse;width:100%;margin-top:8px"><thead><tr>`;
      tableHtml += `<th style="border:1px solid #ddd;padding:6px;background:#f7f7f7;text-align:left">Row</th>`;
      columnDefs.forEach((colDef: any) => {
        tableHtml += `<th style="border:1px solid #ddd;padding:6px;background:#f7f7f7;text-align:left">${escapeHtml(colDef.text)}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      sortedRowIndices.forEach((rowIdx) => {
        tableHtml += '<tr>';
        tableHtml += `<td style="border:1px solid #ddd;padding:6px">${rowIdx}</td>`;
        columnDefs.forEach((colDef: any) => {
          const value = rowMap[rowIdx][colDef.qKey];
          let displayValue = value !== undefined && value !== null ? String(value) : '—';
          if (typeof value === 'object') displayValue = JSON.stringify(value);
          if (displayValue.length > 100) displayValue = displayValue.slice(0, 100) + '…';
          tableHtml += `<td style="border:1px solid #ddd;padding:6px">${escapeHtml(displayValue)}</td>`;
        });
        tableHtml += '</tr>';
      });

      tableHtml += '</tbody></table></div>';
      return tableHtml;
    }).join('');

    // Build uploaded docs tables
    const renderUploadedTables = () => {
      const parts: string[] = [];
      for (const d of uploadedDocs || []) {
        try {
          const rpt = (d.report_id ?? d.reportId ?? d.report) || null;
          if (String(rpt) !== String(report.id)) continue;

          // Parse file_content if it's a string
          let rows = d.file_content;
          if (typeof rows === 'string') {
            try {
              rows = JSON.parse(rows);
            } catch (e) {
              rows = null;
            }
          }

          rows = Array.isArray(rows) ? rows : (Array.isArray(d.dataset_data) ? d.dataset_data : []);
          if (!rows || rows.length === 0) continue;
          const keys = Object.keys(rows[0] || {});
          let html = `<div style="margin-top:8px"><div style="font-weight:600;margin-bottom:6px">${escapeHtml(d.filename || 'Uploaded file')}</div><table style="border-collapse:collapse;width:100%"><thead><tr>`;
          for (const k of keys) html += `<th style="border:1px solid #ddd;padding:6px;background:#f7f7f7;text-align:left">${escapeHtml(k)}</th>`;
          html += '</tr></thead><tbody>';
          for (const r of rows) {
            html += '<tr>';
            for (const k of keys) {
              const val = r && typeof r === 'object' && (r[k] !== undefined && r[k] !== null) ? String(r[k]) : '';
              html += `<td style="border:1px solid #ddd;padding:6px">${escapeHtml(val)}</td>`;
            }
            html += '</tr>';
          }
          html += '</tbody></table></div>';
          parts.push(html);
        } catch (e) { console.error('Error rendering uploaded file:', e); }
      }
      return parts.join('\n');
    };

    const reviewers = sanitizeHtml(report.reviewersReport || report.reviewers_report || '');
    let powerbiHtml = '';
    try {
      const pb = powerbiConfig && (powerbiConfig.powerbi_link || powerbiConfig.powerbi_url || powerbiConfig.powerbiLink);
      if (pb) {
        powerbiHtml = `<div style="margin-top:8px"><strong>Power BI:</strong> <a href="${escapeHtml(pb)}" target="_blank" rel="noreferrer">Open Power BI report</a></div>`;
      }
    } catch (e) { }

    const title = `Report ${escapeHtml(String(report.id || ''))}`;
    const facility = escapeHtml(facilityName || report.facility || report.facility_name || report.facilityName || '');
    const activityName = escapeHtml(activityTitle || (activityData && (activityData.title || activityData.name)) || '');
    const submissionDate = escapeHtml(String(report.submission_date || ''));
    const reportedBy = escapeHtml(report.reported_by || report.reported_by_name || report.reportedBy || report.user_name || '');
    const status = escapeHtml(report.status || '');
    const overallScore = escapeHtml(String(report.overallScore ?? report.overall_score ?? ''));

    const htmlDoc = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.2;padding:15px;font-size:12px}h1{font-size:14px;margin-bottom:4px}h2{font-size:12px;margin-top:8px;margin-bottom:4px}p{margin:2px 0;font-size:11px}div{font-size:11px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:3px;border:1px solid #ddd}thead th{background:#f7f7f7;font-size:10px}.section-title{font-weight:600;margin-top:8px;margin-bottom:4px;font-size:11px}</style></head><body>` +
      `<div style="margin-bottom:8px"><strong style="font-size:12px">Facility Name:</strong> <span style="font-size:11px">${facility || '—'}</span></div>` +
      `<div style="margin-bottom:8px"><strong style="font-size:12px">Activity Name:</strong> <span style="font-size:11px">${activityName || '—'}</span></div>` +
      `<div style="margin-bottom:8px"><strong style="font-size:12px">Submission Date:</strong> <span style="font-size:11px">${submissionDate || '—'}</span></div>` +
      `<div style="margin-bottom:8px"><strong style="font-size:12px">Reported By:</strong> <span style="font-size:11px">${reportedBy || '—'}</span></div>` +
      `<div style="margin-bottom:8px"><strong style="font-size:12px">Status:</strong> <span style="font-size:11px">${status || '—'}</span></div>` +
      `<div style="margin-bottom:8px"><strong style="font-size:12px">Overall Score:</strong> <span style="font-size:11px">${overallScore || '—'}</span></div>` +
      `<div class="section-title">Reviewer's Report</div>` +
      `<div style="border:1px solid #eee;padding:6px;margin-bottom:8px;font-size:10px">${reviewers || '<em>No review yet</em>'}</div>` +
      `${powerbiHtml}` +
      `<div class="section-title">Regular Questions & Answers</div>` +
      (answersHtmlParts.length === 0 ? '<div><em>No regular answers submitted</em></div>' : `<table><tbody>${answersHtmlParts.join('')}</tbody></table>`) +
      (groupedQuestionsHtml ? `<div class="section-title">Question Groups</div>${groupedQuestionsHtml}` : '') +
      `<div class="section-title">Uploaded Files</div>` +
      (renderUploadedTables() || '<div><em>No uploaded files</em></div>') +
      `</body></html>`;

    return htmlDoc;
  };

  const handlePrintFormatted = async () => {
    // Build a sanitized HTML summary client-side and open in a new window for printing.
    try {
      const htmlDoc = buildReportHtml();
      const w = window.open('about:blank');
      if (w && w.document) {
        w.document.write(htmlDoc);
        w.document.close();
      } else {
        // Fallback: open data URL (may be blocked on some browsers for large content)
        const blob = new Blob([htmlDoc], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (e) { console.error('Open PDF endpoint failed', e); alert('Failed to open printable view'); }
  };

  const handlePreviewPdf = async () => {
    try {
      const base = getApiBase();
      const url = base ? `${base}/api/reports/${report.id}/pdf?template=1` : `/api/reports/${report.id}/pdf?template=1`;
      window.open(url, '_blank');
    } catch (e) { console.error('Open PDF preview failed', e); alert('Failed to open PDF preview'); }
  };

  const getPaperDimensions = (tplObj: any) => {
    // returns { widthMm, heightMm }
    const map: Record<string, { w: number; h: number }> = {
      'A4': { w: 210, h: 297 },
      'A3': { w: 297, h: 420 },
      'Letter': { w: 215.9, h: 279.4 }
    };
    const paper = (tplObj?.paperSize || tplObj?.paper || 'A4');
    const orient = (tplObj?.orientation || tplObj?.orient || 'portrait');
    const dims = map[paper] || map['A4'];
    if (orient === 'landscape') return { widthMm: dims.h, heightMm: dims.w };
    return { widthMm: dims.w, heightMm: dims.h };
  };

  const handleEmail = async () => {
    try {
      // Generate PDF and send via email
      const htmlDoc = buildReportHtml();
      const res = await fetch('/api/build_report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlDoc,
          format: 'pdf',
          filename: `report_${report.id}`,
          paperSize: 'A4',
          orientation: 'portrait'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          // Open email with subject/body (user can attach the PDF manually for now)
          // Note: mailto: cannot attach files, so we'll open email and ask user to attach
          const subject = encodeURIComponent(`Report ${report.id} from ${report.submission_date}`);
          const body = encodeURIComponent(`Please see the attached PDF for report ${report.id} for activity ${report.activity_id}.\n\nPDF: ${data.url}`);
          window.open(`mailto:?subject=${subject}&body=${body}`);
          // Download the PDF as well
          const link = document.createElement('a');
          link.href = data.url;
          link.download = `report_${report.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        alert('Failed to generate PDF for email');
      }
    } catch (e) {
      console.error('Email with PDF failed:', e);
      alert('Failed to generate PDF for email');
    }
  };

  const savePowerBi = async (payload: any) => {
    try {
      // sanitize payload.powerbi_link: if user pasted an iframe HTML snippet, extract the src attribute
      const extractUrlFromIframe = (maybeIframe: any) => {
        if (!maybeIframe) return null;
        if (typeof maybeIframe !== 'string') return String(maybeIframe);
        const s = maybeIframe.trim();
        // if it looks like an iframe tag, extract src
        if (s.startsWith('<iframe') || /<iframe/i.test(s)) {
          const m = s.match(/src\s*=\s*"([^"]+)"/) || s.match(/src\s*=\s*'([^']+)'/) || s.match(/src\s*=\s*([^\s>]+)/);
          if (m && m[1]) return m[1];
        }
        // If it's a data URL or relative path, return as-is; callers will validate
        return s;
      };
      if (payload && payload.powerbi_link) payload.powerbi_link = extractUrlFromIframe(payload.powerbi_link);
      const res = await apiFetch(`/api/admin/reports/${report.id}/powerbi`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, powerbi_url: payload.powerbi_link || payload.powerbi_url }) });
      if (res.ok) {
        const j = await res.json();
        setPowerbiConfig(j);
        try { swalSuccess('Saved', 'Power BI config saved'); } catch (e) { }
        return true;
      }
      try { swalError('Failed', 'Unable to save Power BI config'); } catch (e) { }
      return false;
    } catch (e) { console.error(e); try { swalError('Failed', 'Unable to save Power BI config'); } catch (er) { } return false; }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{activityTitle ? `${activityTitle} — ${subjectLabel}` : subjectLabel}</h1>
          <p className="text-sm text-gray-500">Submitted: {new Date(report.submission_date).toLocaleString()}</p>
          <div className="inline-flex items-center gap-2">
            <Button onClick={handleGeneratePDF}>Download PDF</Button>
            {/* Replace single 'Preview PDF' with one button per template for this activity */}
            {(templatesForActivity || []).map((tpl: any) => (
              <Button key={tpl.id} variant="secondary" onClick={async () => {
                try {
                  const tplObj = (typeof tpl.template_json === 'string') ? JSON.parse(tpl.template_json || '{}') : (tpl.template_json || {});
                  let fmt = (tplObj.displayFormat || 'pdf').toString().toLowerCase();
                  const supported = ['pdf', 'docx', 'xlsx', 'image'];
                  if (!supported.includes(fmt)) fmt = 'pdf';

                  // Fill placeholders using current report data (questions, answers, uploadedDocs, activityData)
                  const fillTemplate = (htmlStr: string) => {
                    try {
                      let out = String(htmlStr || '');
                      const qMap: Record<string, any> = {};
                      for (const q of questions || []) { try { if (q && (q.id !== undefined)) qMap[String(q.id)] = q; if (q && (q.qid !== undefined)) qMap[String(q.qid)] = q; if (q && (q.question_id !== undefined)) qMap[String(q.question_id)] = q; } catch (e) { } }
                      const answersMap: Record<string, string> = {};
                      for (const a of answers || []) { try { const qid = String(a.question_id || a.questionId || a.qid || ''); if (!qid) continue; if (!answersMap[qid]) { const val = (typeof a.answer_value === 'object') ? JSON.stringify(a.answer_value) : String(a.answer_value || ''); answersMap[qid] = val; } } catch (e) { } }
                      const escapeHtml = (s: any) => { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

                      out = out.replace(/\{\{question_(\w+)\}\}/gi, (m: any, qid: any) => { const ansRaw = answersMap[String(qid)] || ''; const ans = (ansRaw === null || ansRaw === undefined) ? '' : String(ansRaw); return `<div class="report-filled">${escapeHtml(ans)}</div>`; });

                      out = out.replace(/\{\{activity_([a-zA-Z0-9_]+)\}\}/gi, (m: any, field: any) => { try { if (!activityData) return ''; const val = activityData[field] ?? activityData[field.toLowerCase()] ?? ''; return escapeHtml(val); } catch (e) { return ''; } });

                      out = out.replace(/<span[^>]*data-qid=["']?(\w+)["']?[^>]*>([\s\S]*?)<\/span>/gi, (m: any, qid: any) => {
                        const ansRaw = (answers || []).find(a => String(a.question_id || a.qid || a.questionId) === String(qid))?.answer_value || '';
                        const ans = (ansRaw === null || ansRaw === undefined) ? '' : (typeof ansRaw === 'object' ? JSON.stringify(ansRaw) : String(ansRaw));
                        return `<div class="report-filled">${escapeHtml(ans)}</div>`;
                      });

                      out = out.replace(/<div[^>]*data-upload-id=["']?(\d+)["']?[^>]*>[\s\S]*?<\/div>/gi, (m: any, id: any) => {
                        try {
                          const doc = (uploadedDocs || []).find(d => String(d.id) === String(id)); if (!doc) return `<div>Uploaded table ${escapeHtml(id)} not found</div>`;
                          const rows = Array.isArray(doc.file_content) ? doc.file_content : (Array.isArray(doc.dataset_data) ? doc.dataset_data : []);
                          if (!rows || rows.length === 0) return '<div>No table data</div>';
                          const keys = Object.keys(rows[0] || {});
                          let html = '<div class="uploaded-table-wrapper"><table style="border-collapse: collapse; width:100%;"><thead><tr>';
                          for (const k of keys) html += `<th style="border:1px solid #ddd;padding:6px;background:#f7f7f7;text-align:left">${escapeHtml(k)}</th>`;
                          html += '</tr></thead><tbody>';
                          for (const r of rows) { html += '<tr>'; for (const k of keys) { const val = r && typeof r === 'object' && (r[k] !== undefined && r[k] !== null) ? String(r[k]) : ''; html += `<td style="border:1px solid #ddd;padding:6px">${escapeHtml(val)}</td>`; } html += '</tr>'; }
                          html += '</tbody></table></div>';
                          return html;
                        } catch (e) { return `<div>Failed to render uploaded table ${id}</div>`; }
                      });

                      return out;
                    } catch (e) { return htmlStr || ''; }
                  };

                  const html = tplObj.html || '';
                  const filled = fillTemplate(html);
                  if (!filled || String(filled).trim() === '') { try { swalError('Empty template', 'Cannot build an empty template'); } catch (e) { } return; }

                  const payload: any = { html: filled, format: fmt, filename: tpl.name || 'report', paperSize: tplObj.paperSize || 'A4', orientation: tplObj.orientation || 'portrait', context: { activityData, questionsList: questions, answersList: answers, uploadedDocs } };
                  const res = await apiFetch('/api/build_report', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                  if (!res.ok) { const txt = await res.text().catch(() => ''); try { swalError('Build failed', txt || 'Failed to build report'); } catch (e) { } return; }
                  const j = await res.json(); const url = j.url || j.path || null;
                  if (!url) { try { swalError('Build failed', 'Server did not return a URL'); } catch (e) { } return; }
                  // handle by format
                  if (fmt === 'pdf') {
                    // Open the built PDF in a new blank window and embed an iframe so the browser renders it properly.
                    try {
                      const base = getApiBase();
                      const fullUrl = url.startsWith('http') ? url : (base ? `${base}${url}` : url);
                      const w = window.open('about:blank');
                      if (w && w.document) {
                        const title = (tpl && tpl.name) ? tpl.name : `Report ${report.id}`;
                        const htmlDoc = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>html,body{height:100%;margin:0}iframe{border:none;height:100vh;width:100%}</style></head><body><iframe src="${fullUrl}"></iframe></body></html>`;
                        w.document.write(htmlDoc);
                        w.document.close();
                      } else {
                        // fallback
                        const full = url.startsWith('http') ? url : ((getApiBase() || '') + url);
                        window.open(full, '_blank');
                      }
                      setBuiltTemplate(tpl);
                    } catch (e) {
                      console.error('Failed to open PDF in new window', e);
                      const full = url.startsWith('http') ? url : ((getApiBase() || '') + url);
                      window.open(full, '_blank');
                    }
                  } else if (fmt === 'image') {
                    // open lightbox with image
                    const imgUrl = url;
                    setImageModalUrl(imgUrl);
                    setImageModalOpen(true);
                  } else if (fmt === 'docx' || fmt === 'xlsx') {
                    // download
                    try {
                      const filenameFormat = tplObj.filenameFormat || tplObj.fileName || tplObj.nameFormat || tpl.name || `report_${report.id}`;
                      const interpolate = (str: string) => String(str || '').replace(/\{\{\s*activity_title\s*\}\}/gi, activityTitle || '').replace(/\{\{\s*report_id\s*\}\}/gi, String(report.id || '')).replace(/\{\{\s*submission_date\s*\}\}/gi, String(report.submission_date || '')).replace(/[^a-zA-Z0-9-_\. ]/g, '_');
                      const filename = interpolate(filenameFormat) + (fmt === 'docx' ? '.docx' : '.xlsx');
                      const base = getApiBase(); const fullUrl = url.startsWith('http') ? url : (base ? `${base}${url}` : url);
                      const resp = await fetch(fullUrl, { credentials: 'include' }); if (!resp.ok) { window.open(fullUrl, '_blank'); return; }
                      const blob = await resp.blob(); const blobUrl = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = blobUrl; a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(blobUrl); }, 500);
                    } catch (e) { window.open(url, '_blank'); }
                  } else {
                    // fallback open in new tab
                    const full = url.startsWith('http') ? url : ((getApiBase() || '') + url);
                    window.open(full, '_blank');
                  }
                } catch (e) { console.error('Failed to build template', e); try { swalError('Build failed', String(e?.message || e)); } catch (err) { } }
              }}>{tpl.name || 'Preview'}</Button>
            ))}
            <Button variant="secondary" onClick={handleEmail}>Forward via Email</Button>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/activities/${report.activity_id}/followups?reportId=${report.id}`)}>Edit Followups</Button>
          <div className="inline-flex items-center gap-2">
            {report?.status !== 'Completed' && (
              <Button onClick={() => setReviewModalOpen(true)}>Add / Edit Review</Button>
            )}
            {/* builtTemplate download button removed — per-template buttons render above and handle preview/download behavior */}
          </div>
        </div>
      </div>

      {/* Reviewer's report shown first */}
      <Card>
        <h2 className="text-lg font-semibold mb-2">Reviewer's Report</h2>
        <div className="mb-2">
          <div className="text-sm text-gray-700">Status: <span className="font-medium">{report.status || '—'}</span></div>
          <div className="text-sm text-gray-700">Overall Score: <span className="font-medium">{report.overallScore ?? report.overall_score ?? '—'}</span></div>
        </div>
        <div className="prose max-w-full" dangerouslySetInnerHTML={{ __html: report.reviewersReport || report.reviewers_report || '<em>No review yet</em>' }} />
      </Card>

      {/* Power BI Card */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Power BI</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPowerbiExpanded(!powerbiExpanded)}
          >
            {powerbiExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        {powerbiExpanded && (
          <>
            {powerbiConfig && powerbiConfig.mode && powerbiConfig.mode.toLowerCase() === 'disabled' && <div className="text-sm text-gray-500 mb-2">Power BI embed is disabled for this report.</div>}
            {powerbiConfig && powerbiConfig.mode && powerbiConfig.mode.toLowerCase() === 'enabled' && powerbiConfig.powerbi_link && (
              <div className="mb-4">
                <div className="text-sm text-gray-700 mb-2">Embedded Power BI</div>
                <div style={{ width: '100%', minHeight: 360 }}>
                  {(() => {
                    const extractUrlFromIframe = (maybeIframe: any) => {
                      if (!maybeIframe) return null;
                      if (typeof maybeIframe !== 'string') return String(maybeIframe);
                      const s = maybeIframe.trim();
                      if (s.startsWith('<iframe') || /<iframe/i.test(s)) {
                        const m = s.match(/src\s*=\s*"([^"]+)"/) || s.match(/src\s*=\s*'([^']+)'/) || s.match(/src\s*=\s*([^\s>]+)/);
                        if (m && m[1]) return m[1];
                      }
                      return s;
                    };
                    const raw = powerbiConfig.powerbi_link;
                    const url = extractUrlFromIframe(raw);
                    // basic validation: must be absolute http(s) URL
                    if (!url || !/^https?:\/\//i.test(url)) {
                      return <div className="text-sm text-red-500">Invalid Power BI link. Please paste the embed URL (or the iframe snippet) and save.</div>;
                    }
                    return <iframe src={url} title={`powerbi-${report.id}`} style={{ width: '100%', height: 480, border: 'none' }} />;
                  })()}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">Manage Power BI settings for this report.</div>
                <Button onClick={() => setPowerbiModalOpen(true)}>Configure Power BI</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Submitted Answers</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSubmittedAnswersExpanded(!submittedAnswersExpanded)}
          >
            {submittedAnswersExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>

        {submittedAnswersExpanded && (
          <>
            {/* Non-grouped questions in a DataTable */}
            {(() => {
              // Build a quick lookup map for questions by several possible keys
              const qMap: Record<string, any> = {};
              console.log('DEBUG: questions array length =', questions?.length || 0);
              console.log('DEBUG: Sample questions (first 5):', questions?.slice(0, 5).map((q: any) => ({
                id: q?.id,
                qid: q?.qid,
                question_id: q?.question_id,
                questionText: q?.questionText,
                question_text: q?.question_text,
                activity_id: q?.activity_id
              })) || []);

              for (const q of questions) {
                try {
                  if (q && (q.id !== undefined)) qMap[String(q.id)] = q;
                  if (q && (q.qid !== undefined)) qMap[String(q.qid)] = q;
                  if (q && (q.question_id !== undefined)) qMap[String(q.question_id)] = q;
                } catch (e) { /* ignore malformed question */ }
              }
              console.log('DEBUG: Built qMap with', Object.keys(qMap).length, 'questions.');
              console.log('DEBUG: qMap keys:', Object.keys(qMap).slice(0, 20)); // First 20 keys

              console.log('DEBUG: answers array length =', answers?.length || 0);
              console.log('DEBUG: Sample answers (first 5):', answers?.slice(0, 5).map((a: any) => ({
                id: a?.id,
                question_id: a?.question_id,
                questionId: a?.questionId,
                qid: a?.qid,
                answer_value: typeof a?.answer_value === 'string' ? a.answer_value.slice(0, 50) : a?.answer_value
              })) || []);

              // Separate grouped and non-grouped answers
              const groupedAnswersMap: Record<string, any[]> = {};
              const nonGroupedAnswers: any[] = [];

              answers.forEach(a => {
                const q = qMap[String(a.question_id)] || questions.find((x: any) => String(x.id) === String(a.question_id) || String(x.qid) === String(a.question_id) || String(x.question_id) === String(a.question_id));

                // Log every answer lookup for debugging
                if (!q) {
                  console.warn(`❌ Answer ID ${a.id}: question_id="${a.question_id}" NOT FOUND. Checked:`, {
                    in_qMap: !!qMap[String(a.question_id)],
                    qMap_keys_sample: Object.keys(qMap).slice(0, 10),
                    answer_keys: { id: a.id, question_id: a.question_id, questionId: a.questionId, qid: a.qid }
                  });
                }

                if (q && (q.questionGroup || q.question_group)) {
                  const groupName = q.questionGroup || q.question_group;
                  if (!groupedAnswersMap[groupName]) groupedAnswersMap[groupName] = [];
                  groupedAnswersMap[groupName].push({ answer: a, question: q });
                } else {
                  nonGroupedAnswers.push(a);
                }
              });

              console.log('Grouped answers map:', groupedAnswersMap);

              return (
                <div className="space-y-6">
                  {/* Non-grouped answers table */}
                  {nonGroupedAnswers.length > 0 && (() => {
                    const columns = [
                      { key: 'page', label: 'Page' },
                      { key: 'section', label: 'Section' },
                      { key: 'question', label: 'Question' },
                      {
                        key: 'answer', label: 'Answer', render: (row: any) => {
                          const a = row._raw;
                          if (!a) return '—';
                          const v = a.answer_value;
                          const isString = typeof v === 'string';
                          const maybeUrl = (s?: any) => {
                            if (!s) return null;
                            if (typeof s !== 'string') return null;
                            if (/^data:image\//i.test(s)) return s;
                            if (/^https?:\/\//i.test(s)) return s;
                            return null;
                          };
                          let url: string | null = null;
                          if (isString) url = maybeUrl(v as string) || String(v as string);
                          else if (v && typeof v === 'object') {
                            url = (v.url || v.file_url || v.file || v.path || v.downloadUrl || v.download_url) || null;
                          }
                          if (url && (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) || /^data:image\//i.test(url))) {
                            return (
                              <div className="flex items-center gap-2">
                                <img src={url} alt="attachment" className="w-20 h-12 object-cover rounded cursor-pointer border" onClick={() => { setImageModalUrl(url); setImageModalOpen(true); }} />
                                <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600">Open / Download</a>
                              </div>
                            );
                          }
                          if (url && typeof url === 'string' && /^https?:\/\//i.test(url)) {
                            return <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600">Open / Download</a>;
                          }
                          if (v && typeof v === 'object') return <pre className="whitespace-pre-wrap max-w-xs text-sm">{JSON.stringify(v)}</pre>;
                          if (isString && String(v).length > 200) return <div className="max-w-lg text-sm">{String(v).slice(0, 200)}…</div>;
                          return String(v ?? '—');
                        }
                      },
                      { key: 'reviewers_comment', label: 'Reviewer Comment' },
                      { key: 'quality_improvement_followup', label: 'Followup' },
                      { key: 'recorded_by', label: 'Recorded By' },
                      { key: 'score', label: 'Score' },
                      { key: 'answer_datetime', label: 'Answer Date/Time' },
                    ];

                    const data = nonGroupedAnswers.map(a => {
                      const q = qMap[String(a.question_id)] || questions.find((x: any) => String(x.id) === String(a.question_id) || String(x.qid) === String(a.question_id) || String(x.question_id) === String(a.question_id));
                      const questionText = q ? (q.questionText || q.question_text || q.text || q.label || q.title || q.name || '(untitled question)') : `Question ${String(a.question_id)}`;
                      if (!q) console.warn(`Question ${a.question_id} not found in questions array`);
                      const recordedByUser = users.find((u: any) => String(u.id) === String(a.recorded_by));
                      const recordedByName = recordedByUser ? `${recordedByUser.first_name || ''} ${recordedByUser.last_name || ''}`.trim() || recordedByUser.email || String(recordedByUser.id) : String(a.recorded_by || '');
                      return {
                        page: (q && (q.pageName || q.page_name)) || '',
                        section: (q && (q.sectionName || q.section_name)) || '',
                        question: questionText,
                        answer: typeof a.answer_value === 'object' ? JSON.stringify(a.answer_value) : String(a.answer_value),
                        _raw: a,
                        reviewers_comment: a.reviewers_comment || '—',
                        quality_improvement_followup: a.quality_improvement_followup || '—',
                        recorded_by: recordedByName,
                        score: a.score || '—',
                        answer_datetime: a.answer_datetime || '—',
                      };
                    });

                    return (
                      <div>
                        <h3 className="text-md font-semibold mb-3 text-gray-700">Questions</h3>
                        <DataTable columns={columns} data={data} />
                      </div>
                    );
                  })()}

                  {/* Grouped questions as sub-tables with filtering */}
                  {Object.entries(groupedAnswersMap).length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold mb-3 text-gray-700">More...</h3>
                      {Object.entries(groupedAnswersMap).map(([groupName, groupAnswers]) => {
                        // Organize answers by row_index, grouping by unique row_index values
                        const rowMap: Record<number, Record<string, any>> = {};
                        const columnsMap: Record<string, any> = {}; // Store column definitions by qKey

                        groupAnswers.forEach(item => {
                          const a = item.answer;
                          const q = item.question;

                          // answer_row_index is a top-level column in the answers table
                          const rowIndex = a.answer_row_index !== null && a.answer_row_index !== undefined ? Number(a.answer_row_index) : 0;
                          const questionId = String(a.question_id);

                          if (!rowMap[rowIndex]) rowMap[rowIndex] = {};

                          const questionText = q ? (q.questionText || q.question_text || q.text || q.label || q.title || q.name || '(untitled question)') : `Question ${questionId}`;
                          const qKey = `q_${questionId}`;

                          rowMap[rowIndex][qKey] = a.answer_value;
                          columnsMap[qKey] = { text: questionText, qKey };
                        });

                        const sortedRowIndices = Object.keys(rowMap).map(Number).sort((a, b) => a - b);
                        const columnDefs = Object.values(columnsMap);

                        console.log(`Group "${groupName}" - rowMap:`, rowMap, 'sortedRowIndices:', sortedRowIndices, 'answers count:', groupAnswers.length);

                        // Convert to DataTable format with filters
                        const groupTableColumns = [
                          { key: 'rowIndex', label: 'Row Index' },
                          ...columnDefs.map((colDef: any) => ({ key: colDef.qKey, label: colDef.text })),
                          { key: 'score', label: 'Score' },
                          { key: 'recorded_by', label: 'Recorded By' },
                          { key: 'answer_datetime', label: 'Answer Date/Time' },
                          { key: 'reviewers_comment', label: 'Reviewer Comment' },
                          { key: 'quality_improvement_followup', label: 'QI Followup' }
                        ];

                        const groupTableData = sortedRowIndices.map((rowIdx) => {
                          const row: Record<string, any> = { rowIndex: String(rowIdx) };
                          columnDefs.forEach((colDef: any) => {
                            const value = rowMap[rowIdx][colDef.qKey];
                            let displayValue = value !== undefined && value !== null ? String(value) : '—';
                            if (typeof value === 'object') displayValue = JSON.stringify(value);
                            row[colDef.qKey] = displayValue;
                          });
                          // Add additional fields from the answer
                          const firstAnswer = groupAnswers.find(item => {
                            const itemRowIndex = item.answer.answer_row_index !== null && item.answer.answer_row_index !== undefined ? Number(item.answer.answer_row_index) : 0;
                            return itemRowIndex === rowIdx;
                          });
                          if (firstAnswer) {
                            const a = firstAnswer.answer;
                            const recordedByUser = users.find((u: any) => String(u.id) === String(a.recorded_by));
                            const recordedByName = recordedByUser ? `${recordedByUser.first_name || ''} ${recordedByUser.last_name || ''}`.trim() || recordedByUser.email || String(recordedByUser.id) : String(a.recorded_by || '');
                            row.score = a.score || '—';
                            row.recorded_by = recordedByName;
                            row.answer_datetime = a.answer_datetime || '—';
                            row.reviewers_comment = a.reviewers_comment || '—';
                            row.quality_improvement_followup = a.quality_improvement_followup || '—';
                          }
                          return row;
                        });

                        return (
                          <div key={groupName} className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
                            <h4 className="font-semibold text-sm text-gray-800 mb-3">{groupName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</h4>
                            {groupTableData.length > 0 ? (
                              <DataTable columns={groupTableColumns} data={groupTableData} pageSize={25} persistKey={`grouped_${groupName}`} />
                            ) : (
                              <div className="text-sm text-gray-500 text-center py-4">No data</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </Card>

      <Card className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Conversation / Query Assistant</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConversationExpanded(!conversationExpanded)}
          >
            {conversationExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        {conversationExpanded && (
          <div className="mt-4">
            <ConversationPanel context={{ report, answers, uploadedDocs }} scope={`report:${report.id}`} />
          </div>
        )}
      </Card>

      {/* Paper preview modal for built template HTML */}
      <Modal
        isOpen={!!paperPreviewOpen}
        onClose={() => { setPaperPreviewOpen(false); setPreviewUrl(null); setPreviewFormat(null); }}
        title={builtTemplate ? `${builtTemplate.name || 'Report'} — Report ${report.id}` : `Report ${report.id}`}
        size="xl"
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#f3f4f6', padding: 16, maxWidth: '95%', overflow: 'auto' }}>
            {(previewUrl || builtTemplate) ? (() => {
              // If we have a built preview URL (from /api/build_report), prefer that. Otherwise fall back
              // to the older server-side PDF endpoint using builtTemplate.
              const base = getApiBase();
              const urlToUse = previewUrl ? (previewUrl.startsWith('http') ? previewUrl : (base ? `${base}${previewUrl}` : previewUrl)) : (base ? `${base}/api/reports/${report.id}/pdf?template=1` : `/api/reports/${report.id}/pdf?template=1`);
              const tplObj = builtTemplate ? ((typeof builtTemplate.template_json === 'string') ? JSON.parse(builtTemplate.template_json || '{}') : (builtTemplate.template_json || {})) : {};
              const html = tplObj.html || builtTemplate?.html || '';
              const dims = getPaperDimensions(tplObj);
              const widthMm = dims.widthMm; const heightMm = dims.heightMm;
              return (
                <div style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 12 }}>
                  <div style={{ width: '100%', height: '80vh' }}>
                    {/* If preview is an image, show image; otherwise show iframe for PDF */}
                    {previewFormat === 'image' ? (
                      <div style={{ display: 'flex', justifyContent: 'center' }}><img src={urlToUse} alt="preview" style={{ maxWidth: '100%', maxHeight: '80vh' }} /></div>
                    ) : (
                      <iframe src={urlToUse} title={`report-pdf-${report.id}`} style={{ width: '100%', height: '100%', border: 'none' }} />
                    )}
                  </div>
                  {(!html || String(html).trim() === '') ? null : (
                    <div className="mt-4" style={{ width: `${widthMm}mm`, height: `${heightMm}mm`, overflow: 'auto', direction: 'ltr' }}>
                      <div dangerouslySetInnerHTML={{ __html: html }} />
                    </div>
                  )}
                </div>
              );
            })() : <div className="text-sm text-gray-500">No built template available to preview.</div>}
          </div>
        </div>
      </Modal>

      {/* Power BI Settings Modal (configuration) */}
      <Modal isOpen={!!powerbiModalOpen} onClose={() => setPowerbiModalOpen(false)} title={`Power BI Settings — Report ${report.id}`} size="lg" footer={(
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPowerbiModalOpen(false)}>Close</Button>
          <Button onClick={async () => {
            const ok = await savePowerBi({ powerbi_link: powerbiConfig?.powerbi_link, link_type: powerbiConfig?.link_type, mode: powerbiConfig?.mode });
            if (ok) setPowerbiModalOpen(false);
          }}>Save Power BI</Button>
        </div>
      )}>
        <div className="space-y-4">
          <label className="block text-sm font-medium">Power BI Link / Embed</label>
          <textarea className="w-full border rounded p-2" rows={4} value={powerbiConfig?.powerbi_link || ''} onChange={e => setPowerbiConfig(prev => ({ ...(prev || {}), powerbi_link: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <select className="border p-2 rounded" value={powerbiConfig?.link_type || ''} onChange={e => setPowerbiConfig(prev => ({ ...(prev || {}), link_type: e.target.value }))}>
              <option value="">(Select type)</option>
              <option value="embed">Embed</option>
              <option value="iframe">Iframe</option>
              <option value="link">Link</option>
            </select>
            <select className="border p-2 rounded" value={powerbiConfig?.mode || 'disabled'} onChange={e => setPowerbiConfig(prev => ({ ...(prev || {}), mode: e.target.value }))}>
              <option value="disabled">Disabled</option>
              <option value="enabled">Enabled</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Image lightbox modal for attachments */}
      <Modal isOpen={!!imageModalOpen} onClose={() => { setImageModalOpen(false); setImageModalUrl(null); }} title="Attachment Preview" size="lg" footer={(
        <div className="flex justify-end">
          <a href={imageModalUrl || '#'} target="_blank" rel="noreferrer"><Button variant="secondary">Open in new tab</Button></a>
          <Button onClick={() => { setImageModalOpen(false); setImageModalUrl(null); }}>Close</Button>
        </div>
      )}>
        <div className="w-full flex justify-center">
          {imageModalUrl ? <img src={imageModalUrl} alt="attachment" style={{ maxWidth: '100%', maxHeight: '70vh' }} /> : <div>No image</div>}
        </div>
      </Modal>

      {/* Actual Tables Section */}
      {actualTables && actualTables.length > 0 && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Flat Files</h2>
            <button
              onClick={() => setActualTablesExpanded(!actualTablesExpanded)}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium"
            >
              {actualTablesExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {actualTablesExpanded && (
            <div className="space-y-4">
              {actualTables.map(table => (
                <div key={table.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{table.title}</h3>
                      <p className="text-sm text-gray-600">Database: <code className="bg-gray-200 px-2 py-1 rounded">{table.database_name}</code></p>
                      <p className="text-xs text-gray-500 mt-1">
                        Rows: {table.row_count || 0} | Created: {new Date(table.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => exportTableToExcel(table)}
                      >
                        Download Excel
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const ok = await swalConfirm({ title: 'Delete rows?', text: `Delete all ${table.row_count || 0} rows from "${table.title}" for this report?` });
                          if (!ok) return;
                          try {
                            const res = await apiFetch(`/api/actual_tables/${table.id}/rows/report/${report.id}`, { method: 'DELETE', credentials: 'include' });
                            if (res.ok) {
                              const data = await res.json();
                              try { swalSuccess('Deleted', `${data.deletedCount || 0} rows deleted successfully`); } catch (e) { }
                              setTimeout(() => window.location.reload(), 500);
                            }
                          } catch (e) {
                            console.error('Delete failed:', e);
                            try { swalError('Failed', 'Failed to delete rows'); } catch (er) { }
                          }
                        }}
                      >
                        Delete Rows
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            const ok = await swalConfirm({ title: 'Delete entire table?', text: `This will permanently delete the table "${table.title}" and all its data. This action cannot be undone.` });
                            if (!ok) return;
                            try {
                              const res = await apiFetch(`/api/actual_tables/${table.id}`, { method: 'DELETE', credentials: 'include' });
                              if (res.ok) {
                                setActualTables(prev => prev.filter(t => t.id !== table.id));
                                try { swalSuccess('Deleted', 'Table deleted successfully'); } catch (e) { }
                                setTimeout(() => window.location.reload(), 500);
                              }
                            } catch (e) {
                              console.error('Delete failed:', e);
                              try { swalError('Failed', 'Failed to delete table'); } catch (er) { }
                            }
                          }}
                        >
                          Delete Table
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Editable Table with Checkboxes and Formulas */}
                  <div className="mt-4">
                    {editingTableId === table.id ? (
                      // Editing mode
                      <div className="space-y-4">
                        {/* Table with checkboxes and editable cells */}
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-gray-100 border-b">
                                <th className="border p-2 w-8 text-center">
                                  <input
                                    type="checkbox"
                                    checked={(tableSelectedRows[table.id]?.size || 0) > 0 && (tableSelectedRows[table.id]?.size || 0) === (tableEditingData[table.id]?.length || 0)}
                                    onChange={(e) => {
                                      const rows = tableEditingData[table.id] || [];
                                      if (e.target.checked) {
                                        setTableSelectedRows(prev => ({ ...prev, [table.id]: new Set(rows.map((_, i) => i)) }));
                                      } else {
                                        setTableSelectedRows(prev => ({ ...prev, [table.id]: new Set() }));
                                      }
                                    }}
                                  />
                                </th>
                                {table.schema && Object.keys(table.schema).map(colName => (
                                  <th key={colName} className="border p-2 bg-gray-100 font-semibold text-left">{colName}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(tableEditingData[table.id] || []).map((row, rowIdx) => (
                                <tr key={rowIdx} className={tableNewRows[table.id]?.has(rowIdx) ? 'bg-yellow-50' : ''}>
                                  <td className="border p-2 text-center bg-gray-50">
                                    <input
                                      type="checkbox"
                                      checked={tableSelectedRows[table.id]?.has(rowIdx) || false}
                                      onChange={(e) => {
                                        setTableSelectedRows(prev => {
                                          const current = prev[table.id] || new Set();
                                          const newSet = new Set(current);
                                          if (e.target.checked) {
                                            newSet.add(rowIdx);
                                          } else {
                                            newSet.delete(rowIdx);
                                          }
                                          return { ...prev, [table.id]: newSet };
                                        });
                                      }}
                                    />
                                  </td>
                                  {table.schema && Object.keys(table.schema).map((colName, colIdx) => {
                                    const cellKey = `${rowIdx}_${colName}`;
                                    const isChanged = tableChangedCells[table.id]?.has(cellKey);
                                    const cellRef = generateCellName(table.id, table.title || 'table', colIdx, rowIdx);
                                    const isSelected = tableSelectedCell === `${table.id}_${rowIdx}_${colName}`;
                                    return (
                                      <td
                                        key={colName}
                                        className={`border p-2 relative group ${isChanged ? 'bg-orange-100' : ''} ${isSelected ? 'bg-purple-100 ring-2 ring-purple-300' : ''}`}
                                      >
                                        <input
                                          type="text"
                                          value={row[colName] ?? ''}
                                          onChange={(e) => {
                                            const newData = [...(tableEditingData[table.id] || [])];
                                            newData[rowIdx][colName] = e.target.value;
                                            setTableEditingData(prev => ({ ...prev, [table.id]: newData }));

                                            // Mark cell as changed
                                            setTableChangedCells(prev => {
                                              const current = prev[table.id] || new Set();
                                              const newSet = new Set(current);
                                              newSet.add(cellKey);
                                              return { ...prev, [table.id]: newSet };
                                            });
                                          }}
                                          onMouseDown={(e: React.MouseEvent) => {
                                            // Handle formula/cell reference insertion when formula or cellName input is focused
                                            if (tableEditingModeRef.current === 'formula') {
                                              e.preventDefault(); // Prevent cell input from getting focus
                                              const inputEl = tableFormulaInputRef.current;
                                              if (inputEl) {
                                                const cursorPos = inputEl.selectionStart !== undefined ? inputEl.selectionStart : tableFormulaInput.length;
                                                const currentFormula = tableFormulaInput;
                                                const newFormula = currentFormula.slice(0, cursorPos) + cellRef + currentFormula.slice(cursorPos);
                                                setTableFormulaInput(newFormula);

                                                // Refocus the formula textarea and position cursor after the inserted reference
                                                setTimeout(() => {
                                                  if (inputEl) {
                                                    inputEl.selectionStart = inputEl.selectionEnd = cursorPos + cellRef.length;
                                                    inputEl.focus();
                                                  }
                                                }, 0);
                                              }
                                            } else if (tableEditingModeRef.current === 'cellName') {
                                              e.preventDefault(); // Prevent cell input from getting focus
                                              const inputEl = tableCellNameInputRef.current;
                                              if (inputEl) {
                                                const cursorPos = inputEl.selectionStart !== undefined ? inputEl.selectionStart : (tableSelectedCell?.length || 0);
                                                setTableSelectedCell(`${table.id}_${rowIdx}_${colName}`);

                                                // Refocus the cell name input
                                                setTimeout(() => {
                                                  if (inputEl) {
                                                    inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
                                                    inputEl.focus();
                                                  }
                                                }, 0);
                                              }
                                            }
                                            // If no input is in focus (tableEditingModeRef.current === null), 
                                            // allow normal input behavior by NOT preventing default
                                          }}
                                          onFocus={() => {
                                            // Mark this cell as selected when focused
                                            setTableSelectedCell(`${table.id}_${rowIdx}_${colName}`);
                                          }}
                                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          title={`Click to edit. Hover shows cell reference: ${cellRef}`}
                                        />
                                        <div className="hidden group-hover:block absolute bottom-full left-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap mb-1 z-10">
                                          <div>{cellRef}</div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => {
                              // Add new empty row
                              const newRowIdx = (tableEditingData[table.id] || []).length;
                              const newRow: Record<string, any> = {};
                              if (table.schema) {
                                Object.keys(table.schema).forEach(colName => {
                                  newRow[colName] = '';
                                });
                              }
                              setTableEditingData(prev => ({
                                ...prev,
                                [table.id]: [...(prev[table.id] || []), newRow]
                              }));
                              setTableNewRows(prev => {
                                const current = prev[table.id] || new Set();
                                const newSet = new Set(current);
                                newSet.add(newRowIdx);
                                return { ...prev, [table.id]: newSet };
                              });
                            }}
                          >
                            Add Row
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={(tableSelectedRows[table.id]?.size || 0) === 0}
                            onClick={async () => {
                              const selectedCount = tableSelectedRows[table.id]?.size || 0;
                              const ok = await swalConfirm({ title: 'Delete rows?', text: `Delete ${selectedCount} selected row(s)?` });
                              if (!ok) return;

                              const newData = (tableEditingData[table.id] || []).filter((_, i) => !tableSelectedRows[table.id]?.has(i));
                              setTableEditingData(prev => ({ ...prev, [table.id]: newData }));
                              setTableSelectedRows(prev => ({ ...prev, [table.id]: new Set() }));

                              // Mark deleted rows in changed cells
                              const deleted = (tableEditingData[table.id] || []).filter((_, i) => tableSelectedRows[table.id]?.has(i));
                              setTableChangedCells(prev => {
                                const current = prev[table.id] || new Set();
                                const newSet = new Set(current);
                                deleted.forEach((_, idx) => {
                                  if (table.schema) {
                                    Object.keys(table.schema).forEach(colName => {
                                      newSet.add(`${idx}_${colName}_DELETED`);
                                    });
                                  }
                                });
                                return { ...prev, [table.id]: newSet };
                              });
                            }}
                          >
                            Delete Selected ({tableSelectedRows[table.id]?.size || 0})
                          </Button>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={async () => {
                              try {
                                const changedCells = tableChangedCells[table.id] || new Set();
                                const newRowIndices = tableNewRows[table.id] || new Set();

                                // Collect only changed data
                                const updates: any[] = [];
                                const newRows: any[] = [];

                                (tableEditingData[table.id] || []).forEach((row, rowIdx) => {
                                  if (newRowIndices.has(rowIdx)) {
                                    // New row
                                    newRows.push(row);
                                  } else {
                                    // Only include rows with changed cells
                                    const rowChanges: Record<string, any> = { row_index: rowIdx };
                                    let hasChanges = false;

                                    if (table.schema) {
                                      Object.keys(table.schema).forEach(colName => {
                                        const cellKey = `${rowIdx}_${colName}`;
                                        if (changedCells.has(cellKey)) {
                                          rowChanges[colName] = row[colName];
                                          hasChanges = true;
                                        }
                                      });
                                    }

                                    if (hasChanges) {
                                      updates.push(rowChanges);
                                    }
                                  }
                                });

                                // Send only changed data
                                const payload = {
                                  report_id: report.id,
                                  updates: updates, // Only rows with changes
                                  new_rows: newRows, // New rows to insert
                                  deleted_rows: Array.from(tableSelectedRows[table.id] || []) // Deleted row indices
                                };

                                const res = await apiFetch(`/api/actual_tables/${table.id}/rows`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(payload),
                                  credentials: 'include'
                                });

                                if (res.ok) {
                                  try { swalSuccess('Saved', 'Changes saved successfully'); } catch (e) { }
                                  setEditingTableId(null);
                                  setTimeout(() => window.location.reload(), 500);
                                } else {
                                  const error = await res.json();
                                  try { swalError('Error', error.message || 'Failed to save'); } catch (e) { }
                                }
                              } catch (e) {
                                console.error('Save failed:', e);
                                try { swalError('Error', 'Failed to save changes'); } catch (er) { }
                              }
                            }}
                          >
                            Save Changes
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingTableId(null);
                              setTableEditingData(prev => {
                                const newState = { ...prev };
                                delete newState[table.id];
                                return newState;
                              });
                              setTableSelectedRows(prev => {
                                const newState = { ...prev };
                                delete newState[table.id];
                                return newState;
                              });
                              setTableChangedCells(prev => {
                                const newState = { ...prev };
                                delete newState[table.id];
                                return newState;
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>

                        {/* Formula Builder for Actual Tables */}
                        <details className="bg-blue-50 border border-blue-200 rounded p-3">
                          <summary className="font-semibold text-blue-900 cursor-pointer">Formula Guide & Examples</summary>
                          <div className="mt-2 space-y-2 text-xs text-gray-700">
                            <p><strong>Simple Calculation:</strong> <code>A1 * 2</code></p>
                            <p><strong>Reference Same Table:</strong> <code>A1 + B1</code></p>
                            <p><strong>Complex Calculation:</strong> <code>(A1 + B1) / 2</code></p>
                            <p><strong>Cross-Table References:</strong> <code>report{report?.id || 1}_HD_A1 + A1</code></p>
                            <p><strong>Multiple Table References:</strong> <code>report{report?.id || 1}_HD_A1 + report{report?.id || 1}_F_D1 * 1.5</code></p>
                          </div>
                        </details>

                        <div className="space-y-2 mb-3 bg-gray-50 p-3 rounded border">
                          <div>
                            <label className="text-xs font-medium text-gray-700 block mb-1">Step 1: Click a cell to select it</label>
                            <input
                              ref={tableCellNameInputRef}
                              type="text"
                              placeholder="Cell will appear here when clicked (or type manually)"
                              className="w-full border rounded px-2 py-1 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={tableSelectedCell ? (() => {
                                const parts = tableSelectedCell.split('_');
                                if (parts.length >= 3) {
                                  // Find column index from the table schema
                                  const rowIdx = parseInt(parts[1]);
                                  const colName = parts.slice(2).join('_');
                                  const colIdx = table.schema ? Object.keys(table.schema).indexOf(colName) : -1;
                                  if (colIdx >= 0) {
                                    return generateCellName(table.id, table.title || 'table', colIdx, rowIdx);
                                  }
                                }
                                return tableSelectedCell;
                              })() : ''}
                              onChange={(e) => {
                                const input = e.target.value;
                                if (input) {
                                  setTableSelectedCell(`${table.id}_${input}`);
                                }
                              }}
                              onFocus={() => { tableEditingModeRef.current = 'cellName'; }}
                              onBlur={() => { tableEditingModeRef.current = null; }}
                              title="Click a cell in the table above to select it, or type/paste cell reference here"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700 block mb-1">Step 2: Enter formula (value only - no formulas saved). Can reference other tables like report{report?.id || 1}_HD_A1, report{report?.id || 1}_F_D1, report{report?.id || 1}_HCF_A5, etc.</label>
                            <textarea
                              ref={tableFormulaInputRef}
                              placeholder="JavaScript expression (e.g., 'A1 * 2' or report1_HD_A1 + B1' or 'report1_F_D1 * 1.5')"
                              className="w-full border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical min-h-24"
                              value={tableFormulaInput}
                              onChange={(e) => setTableFormulaInput(e.target.value)}
                              onFocus={() => { tableEditingModeRef.current = 'formula'; }}
                              onBlur={() => { tableEditingModeRef.current = null; }}
                              title="Enter your formula here"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!tableSelectedCell) {
                                try { swalError('Error', 'Please click a cell first'); } catch (e) { }
                                return;
                              }
                              if (!tableFormulaInput.trim()) {
                                try { swalError('Error', 'Please enter a formula'); } catch (e) { }
                                return;
                              }

                              try {
                                const parts = tableSelectedCell.split('_');
                                const tableId = parts[0];
                                const rowIdx = parseInt(parts[1]);
                                const colName = parts.slice(2).join('_');

                                // Helper function to generate abbreviation from name
                                const generateAbbr = (name: string): string => {
                                  const abbr = name
                                    .split(/\s+/)
                                    .map(word => word.charAt(0).toUpperCase())
                                    .join('')
                                    .substring(0, 3);
                                  return abbr || 'T'; // Default 'T' if no name
                                };

                                // Helper function to convert column letters to index (A=0, B=1, AA=26)
                                const letterToIndex = (letters: string): number => {
                                  let idx = 0;
                                  for (let i = 0; i < letters.length; i++) {
                                    idx = idx * 26 + (letters.charCodeAt(i) - 64);
                                  }
                                  return idx - 1;
                                };

                                // Helper function to resolve a cell reference and return its value
                                const resolveCellRef = (cellRef: string): any => {
                                  // Format: report{reportId}_{tableAbbr}_{cellRef} (e.g., report1_HD_A1)
                                  const match = cellRef.match(/^report(\d+)_([A-Z]{1,3})_([A-Z]+)(\d+)$/i);
                                  if (!match) {
                                    console.warn('Invalid cell reference format:', cellRef);
                                    return undefined;
                                  }

                                  const [, reportId, tableAbbr, colLetters, rowStr] = match;
                                  const refRowIdx = Number(rowStr) - 1;
                                  const refColIdx = letterToIndex(colLetters);

                                  // Check if it's a reference to an uploaded file
                                  const uploadedDoc = uploadedDocs.find(doc => {
                                    const abbr = generateAbbr(doc.filename || '');
                                    return abbr === tableAbbr && String(doc.report_id || doc.reportId || doc.report) === String(reportId);
                                  });

                                  if (uploadedDoc) {
                                    const rows = Array.isArray(uploadedDoc.file_content) ? uploadedDoc.file_content : [];
                                    if (refRowIdx >= 0 && refRowIdx < rows.length && refColIdx >= 0) {
                                      const row = rows[refRowIdx];
                                      const keys = Object.keys(row || {});
                                      if (refColIdx < keys.length) {
                                        const value = row[keys[refColIdx]];
                                        // Try to convert to number if it looks numeric
                                        if (typeof value === 'string') {
                                          const num = Number(value);
                                          return isNaN(num) ? value : num;
                                        }
                                        return value;
                                      }
                                    }
                                    return undefined;
                                  }

                                  // Check if it's a reference to an actual table
                                  const actualTable = actualTables?.find(t => {
                                    const abbr = generateAbbr(t.title || '');
                                    return abbr === tableAbbr;
                                  });

                                  if (actualTable) {
                                    const rows = actualTable.rows || [];
                                    if (refRowIdx >= 0 && refRowIdx < rows.length && refColIdx >= 0) {
                                      const row = rows[refRowIdx];
                                      const keys = actualTable.schema ? Object.keys(actualTable.schema) : [];
                                      if (refColIdx < keys.length) {
                                        const value = row[keys[refColIdx]];
                                        // Try to convert to number if it looks numeric
                                        if (typeof value === 'string') {
                                          const num = Number(value);
                                          return isNaN(num) ? value : num;
                                        }
                                        return value;
                                      }
                                    }
                                    return undefined;
                                  }

                                  console.warn(`Could not find table with abbreviation: ${tableAbbr}`);
                                  return undefined;
                                };

                                // Build context with current row values
                                const context: Record<string, any> = {};

                                const currentRow = (tableEditingData[table.id] || [])[rowIdx];
                                if (currentRow) {
                                  Object.entries(currentRow).forEach(([key, value]) => {
                                    context[key] = value;
                                  });
                                }

                                // Parse and resolve cell references in formula
                                // Format: report{reportId}_{tableAbbr}_{cellRef}
                                const cellRefPattern = /report\d+_[A-Z]{1,3}_[A-Z]+\d+/gi;
                                const matches = (tableFormulaInput.match(cellRefPattern) || []) as string[];
                                const uniqueCellRefs = [...new Set(matches)]; // Remove duplicates

                                for (const cellRef of uniqueCellRefs) {
                                  const resolvedValue = resolveCellRef(cellRef as string);
                                  if (resolvedValue !== undefined) {
                                    context[cellRef as string] = resolvedValue;
                                  } else {
                                    context[cellRef as string] = 0; // Default to 0 if unresolved
                                  }
                                }

                                // Evaluate formula safely with proper escaping
                                // Use a function with parameters instead of const declarations
                                const validKeys: string[] = [];
                                const invalidKeys: string[] = [];

                                for (const key of Object.keys(context)) {
                                  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
                                    validKeys.push(key);
                                  } else {
                                    invalidKeys.push(key);
                                  }
                                }

                                // For invalid keys (with special chars), create safe replacements
                                let formulaToEval = tableFormulaInput;
                                const replacementContext: Record<string, any> = { ...context };

                                for (let i = 0; i < invalidKeys.length; i++) {
                                  const invalidKey = invalidKeys[i];
                                  const placeholder = `_ref${i}`;
                                  delete replacementContext[invalidKey];
                                }

                                // Build parameter list from all keys (now valid)
                                const paramNames = Object.keys(replacementContext);
                                const paramValues = paramNames.map(key => replacementContext[key]);

                                const func = new Function(...paramNames, `return ${formulaToEval}`);
                                const result = func(...paramValues);

                                if (typeof result === 'number' && isNaN(result)) {
                                  try { swalError('Error', 'Formula evaluated to NaN'); } catch (e) { }
                                  return;
                                }

                                // Update cell with calculated value (not formula)
                                const newData = [...(tableEditingData[table.id] || [])];
                                newData[rowIdx][colName] = result;
                                setTableEditingData(prev => ({ ...prev, [table.id]: newData }));

                                // Mark cell as changed
                                setTableChangedCells(prev => {
                                  const current = prev[table.id] || new Set();
                                  const newSet = new Set(current);
                                  newSet.add(`${rowIdx}_${colName}`);
                                  return { ...prev, [table.id]: newSet };
                                });

                                setTableFormulaInput('');
                                setTableSelectedCell(null);
                                try { swalSuccess('Success', 'Cell value updated with formula result'); } catch (e) { }
                              } catch (e) {
                                console.error('Formula evaluation failed:', e);
                                try { swalError('Error', 'Formula evaluation failed: ' + (e as any).message); } catch (er) { }
                              }
                            }}
                            disabled={!tableSelectedCell}
                          >
                            Apply Formula (Value Only)
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setTableSelectedCell(null);
                              setTableFormulaInput('');
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="space-y-3">
                        {table.rows && table.rows.length > 0 ? (
                          (() => {
                            const columns = table.schema ? Object.keys(table.schema).map(colName => ({
                              key: colName,
                              label: colName
                            })) : [];
                            const data = table.rows.map((row, idx) => ({
                              ...row,
                              _key: idx
                            }));
                            return <DataTable columns={columns} data={data} pageSize={10} />;
                          })()
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded">
                            No data rows
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            // Initialize editing mode
                            setEditingTableId(table.id);
                            setTableEditingData(prev => ({
                              ...prev,
                              [table.id]: JSON.parse(JSON.stringify(table.rows || []))
                            }));
                            setTableSelectedRows(prev => ({ ...prev, [table.id]: new Set() }));
                            setTableChangedCells(prev => ({ ...prev, [table.id]: new Set() }));
                            setTableNewRows(prev => ({ ...prev, [table.id]: new Set() }));
                          }}
                        >
                          Edit Table
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Uploaded Files</h2>
          <div className="flex items-center gap-2">
            <input className="border p-2 rounded text-sm" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
            <button
              onClick={() => setUploadedFilesExpanded(!uploadedFilesExpanded)}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium"
            >
              {uploadedFilesExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>
        {uploadedFilesExpanded && (
          <>
            {/* File upload section during edit */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <label className="block text-xs font-medium text-gray-700 mb-2">Upload additional Excel files</label>
              <label className="px-2 py-1 border rounded cursor-pointer inline-block text-sm text-blue-600 hover:bg-blue-100">
                Choose file
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        try {
                          const ExcelJS = await import('exceljs');
                          const arrayBuffer = ev.target?.result as ArrayBuffer;
                          const workbook = new ExcelJS.Workbook();
                          await workbook.xlsx.load(arrayBuffer);
                          const worksheet = workbook.worksheets[0];

                          if (!worksheet) {
                            try { swalError('Error', 'No data found in file'); } catch (err) { }
                            return;
                          }

                          const rows: any[] = [];
                          worksheet.eachRow((row, idx) => {
                            if (idx === 1) return; // Skip header
                            const rowData: Record<string, any> = {};
                            row.eachCell((cell, colNumber) => {
                              const header = worksheet.getRow(1).getCell(colNumber).value;
                              if (header) {
                                rowData[String(header)] = cell.value || '';
                              }
                            });
                            rows.push(rowData);
                          });

                          // Create new uploaded_docs entry
                          const res = await apiFetch(`/api/uploaded_docs`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              reportId: report.id,
                              filename: file.name,
                              fileContent: rows,
                              activityId: report.activity_id,
                              facilityId: report.facility_id
                            })
                          });

                          if (res.ok) {
                            const newDoc = await res.json();
                            setUploadedDocs(prev => [...prev, newDoc]);
                            try { swalSuccess('Success', 'File uploaded successfully'); } catch (err) { }
                          } else {
                            try { swalError('Error', 'Failed to upload file'); } catch (err) { }
                          }
                        } catch (err) {
                          console.error('Upload processing error:', err);
                          try { swalError('Error', 'Failed to process file'); } catch (e) { }
                        }
                      };
                      reader.readAsArrayBuffer(file);
                    } catch (err) {
                      console.error('Upload error:', err);
                      try { swalError('Error', 'Upload failed'); } catch (e) { }
                    }
                  }}
                />
              </label>
            </div>

            {uploadedDocs.length === 0 && <div className="text-sm text-gray-500">No uploaded files.</div>}

            {/* File list with action buttons */}
            {(() => {
              if (!report) return null;

              console.log('Report ID:', report.id, 'All uploaded docs:', uploadedDocs);

              const filteredDocs = (uploadedDocs || []).filter(d => {
                if (!d) return false;
                // Match by report_id
                const docReportId = d.report_id ?? d.reportId ?? d.report;
                const reportId = report.id;
                console.log('Checking doc:', d.filename, 'docReportId:', docReportId, 'reportId:', reportId, 'Match:', String(docReportId) === String(reportId));
                if (String(docReportId) !== String(reportId)) return false;
                return true;
              }).filter(d => {
                if (!search) return true;
                const s = search.toLowerCase();
                const fname = String(d.filename || d.fileName || '');
                return fname.toLowerCase().includes(s);
              });

              if (filteredDocs.length === 0) {
                return <div className="text-sm text-gray-500">No files uploaded for this report.</div>;
              }

              return (
                <div className="space-y-3">
                  {filteredDocs.map(d => {
                    const isParsed = !d.isRawFile && (Array.isArray(d.file_content) || (d.file_content && typeof d.file_content === 'object'));
                    const isEditing = editingDocId === d.id;
                    // Check if file is CSV or Excel
                    const filename = d.filename || '';
                    const isCsvOrExcel = /\.(csv|xlsx|xls)$/i.test(filename);

                    return (
                      <div key={d.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{d.filename || 'Uploaded file'}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Uploaded: {new Date(d.created_at || d.createdAt).toLocaleString()}
                            </div>
                            {d.facility_name && <div className="text-xs text-gray-600 mt-1">Facility: {d.facility_name}</div>}
                            {d.user_first_name && <div className="text-xs text-gray-600">User: {d.user_first_name} {d.user_last_name}</div>}
                            {d.file_content && Array.isArray(d.file_content) && (
                              <div className="text-xs text-gray-500 mt-1">
                                {d.file_content.length} row(s)
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {isParsed && isCsvOrExcel && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingDocId(d.id);
                                  const fileContent = Array.isArray(d.file_content) ? JSON.parse(JSON.stringify(d.file_content)) : [];
                                  setEditingDocData(fileContent);
                                  setOriginalDocData(fileContent);
                                  setEditedCells(new Set());
                                  setEditingNewRows(new Set());
                                  setDeletedRowIndices(new Set());
                                  setCellFormulas((d.formulas && typeof d.formulas === 'object') ? normalizeFormulas(d.formulas) : {});
                                }}
                              >
                                {isEditing ? 'Done Editing' : 'Edit'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                try {
                                  // If it's a raw file, download from blob storage/original source
                                  if (d.isRawFile || !isCsvOrExcel) {
                                    // Download original file as-is
                                    const link = document.createElement('a');
                                    link.href = d.file_url || `${getApiBase()}/api/uploaded_docs/${d.id}/download`;
                                    link.download = d.filename || 'file';
                                    document.body.appendChild(link);
                                    link.click();
                                    setTimeout(() => {
                                      document.body.removeChild(link);
                                    }, 100);
                                  } else {
                                    // For CSV/Excel, convert to xlsx
                                    const ExcelJS = await import('exceljs');
                                    const workbook = new ExcelJS.Workbook();
                                    const worksheet = workbook.addWorksheet('Sheet1');
                                    const rows = Array.isArray(d.file_content) ? d.file_content : [];
                                    if (rows.length > 0) {
                                      worksheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key }));
                                      worksheet.addRows(rows);
                                    }
                                    const buffer = await workbook.xlsx.writeBuffer();
                                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = d.filename ? d.filename.replace(/\.[^.]+$/, '') + '.xlsx' : 'uploaded_file.xlsx';
                                    document.body.appendChild(a);
                                    a.click();
                                    setTimeout(() => {
                                      document.body.removeChild(a);
                                      window.URL.revokeObjectURL(url);
                                    }, 100);
                                  }
                                } catch (e) {
                                  console.error('Download failed:', e);
                                  try { swalError('Download Failed', 'Failed to download file'); } catch (er) { }
                                }
                              }}
                            >
                              Download
                            </Button>
                            {isAdmin && isParsed && isCsvOrExcel && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={async () => {
                                  try {
                                    const defaultDbName = d.filename?.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'imported_table';
                                    const defaultTitle = d.filename?.replace(/\.[^.]+$/, '') || 'Imported Table';

                                    // Show modal with both fields
                                    const { value, isConfirmed } = await Swal.fire({
                                      title: 'Make Flat File',
                                      html: `
                                    <div style="text-align: left;">
                                      <label style="display: block; margin-top: 15px; font-weight: 500; margin-bottom: 5px;">Table Title</label>
                                      <input id="tableTitle" type="text" placeholder="e.g., Sales Report" value="${defaultTitle}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" />
                                      
                                      <label style="display: block; margin-top: 15px; font-weight: 500; margin-bottom: 5px;">Database Name (no spaces)</label>
                                      <input id="databaseName" type="text" placeholder="e.g., sales_report" value="${defaultDbName}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" />
                                    </div>
                                  `,
                                      showCancelButton: true,
                                      confirmButtonText: 'Create Table',
                                      cancelButtonText: 'Cancel',
                                      didOpen: (modal) => {
                                        const titleInput = modal.querySelector('#tableTitle') as HTMLInputElement;
                                        if (titleInput) titleInput.focus();
                                      },
                                      preConfirm: () => {
                                        const titleInput = (document.getElementById('tableTitle') as HTMLInputElement)?.value || '';
                                        const dbNameInput = (document.getElementById('databaseName') as HTMLInputElement)?.value || '';

                                        if (!titleInput.trim()) {
                                          Swal.showValidationMessage('Table title is required');
                                          return null;
                                        }
                                        if (!dbNameInput.trim()) {
                                          Swal.showValidationMessage('Database name is required');
                                          return null;
                                        }
                                        if (!/^[a-z0-9_]+$/.test(dbNameInput)) {
                                          Swal.showValidationMessage('Database name can only contain lowercase letters, numbers, and underscores');
                                          return null;
                                        }

                                        return { title: titleInput, databaseName: dbNameInput };
                                      }
                                    });

                                    if (!isConfirmed || !value) return;

                                    const { title, databaseName } = value;

                                    // Create the actual table via API
                                    const fileContent = Array.isArray(d.file_content) ? d.file_content : [];
                                    const res = await apiFetch('/api/actual_tables', {
                                      method: 'POST',
                                      credentials: 'include',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        title,
                                        databaseName,
                                        activityId: report?.activity_id,
                                        programId: report?.program_id,
                                        reportId: report?.id,
                                        businessId: report?.business_id,
                                        fileContent
                                      })
                                    });

                                    if (res.ok) {
                                      const result = await res.json();
                                      try { swalSuccess('Success', `Actual table "${title}" created with ${fileContent.length} rows`); } catch (e) { }
                                      setTimeout(() => window.location.reload(), 500);
                                    } else {
                                      const err = await res.json();
                                      try { swalError('Failed', err.error || 'Failed to create table'); } catch (e) { }
                                    }
                                  } catch (e) {
                                    console.error('Create flat file failed:', e);
                                    try { swalError('Failed', 'Failed to create flat file'); } catch (er) { }
                                  }
                                }}
                              >
                                Create Flat File
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={async () => {
                                  const ok = await swalConfirm({ title: 'Delete file?', text: `Delete "${d.filename || 'uploaded file'}"?` });
                                  if (!ok) return;
                                  try {
                                    const res = await apiFetch(`/api/uploaded_docs/${d.id}`, { method: 'DELETE', credentials: 'include' });
                                    if (res.ok) {
                                      setUploadedDocs(prev => prev.filter(x => x.id !== d.id));
                                      try { swalSuccess('Deleted', 'File deleted successfully'); } catch (e) { }
                                      setTimeout(() => window.location.reload(), 500);
                                    }
                                  } catch (e) {
                                    console.error('Delete failed:', e);
                                    try { swalError('Failed', 'Failed to delete file'); } catch (er) { }
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Editable grid for parsed files */}
                        {isEditing && isParsed && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="font-medium text-sm mb-3 text-gray-700">Edit Data</h4>



                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-2 py-2 text-left font-medium text-gray-700 w-12">
                                      #
                                    </th>
                                    {editingDocData.length > 0 && Object.keys(editingDocData[0]).map((key, colIdx) => (
                                      <th key={key} className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                        <div className="flex flex-col gap-1">
                                          <div>
                                            <div className="font-medium">{key}</div>
                                            <div className="text-xs text-gray-500">
                                              {generateCellName(d.id, d.filename, colIdx, 0).split('_').slice(1).join('_')}
                                            </div>
                                          </div>
                                          <select
                                            value={columnDataTypes[key] || 'text'}
                                            onChange={(e) => {
                                              const newDataType = e.target.value;
                                              setColumnDataTypes(prev => ({
                                                ...prev,
                                                [key]: newDataType
                                              }));

                                              // If changing to date type, transform existing data to dd/mm/yyyy format
                                              if (newDataType === 'date') {
                                                const newData = [...editingDocData];
                                                newData.forEach((row, rowIdx) => {
                                                  const cellValue = row[key];
                                                  if (cellValue) {
                                                    // Parse ISO date string or other date formats
                                                    let date: Date | null = null;
                                                    if (typeof cellValue === 'string') {
                                                      // Handle ISO format like "2026-10-25T00:00:00.000Z"
                                                      date = new Date(cellValue);
                                                      if (isNaN(date.getTime())) {
                                                        // Try to parse as YYYY-MM-DD
                                                        const parts = cellValue.split('-');
                                                        if (parts.length === 3) {
                                                          date = new Date(parts[0] + '-' + parts[1] + '-' + parts[2]);
                                                        }
                                                      }
                                                    } else if (cellValue instanceof Date) {
                                                      date = cellValue;
                                                    }

                                                    // Convert to dd/mm/yyyy format
                                                    if (date && !isNaN(date.getTime())) {
                                                      const day = String(date.getDate()).padStart(2, '0');
                                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                                      const year = date.getFullYear();
                                                      row[key] = `${day}/${month}/${year}`;
                                                      setEditedCells(prev => new Set([...prev, `${rowIdx}_${key}`]));
                                                    }
                                                  }
                                                });
                                                setEditingDocData(newData);
                                              }
                                            }}
                                            className="text-xs border rounded px-1 py-0.5 bg-white"
                                            title="Set data type for this column"
                                          >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="date">Date</option>
                                            <option value="email">Email</option>
                                            <option value="phone">Phone</option>
                                            <option value="currency">Currency</option>
                                          </select>
                                        </div>
                                      </th>
                                    ))}
                                    <th className="border border-gray-300 px-2 py-2 w-12">
                                      <button
                                        onClick={() => {
                                          const newRow: Record<string, any> = {};
                                          if (editingDocData.length > 0) {
                                            Object.keys(editingDocData[0]).forEach(key => {
                                              newRow[key] = '';
                                            });
                                          }
                                          setEditingDocData(prev => [...prev, newRow]);
                                          setEditingNewRows(prev => new Set([...prev, editingDocData.length]));
                                        }}
                                        className="text-green-600 hover:text-green-800 font-bold text-lg"
                                        title="Add new row"
                                      >
                                        +
                                      </button>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {editingDocData.map((row, rowIdx) => (
                                    <tr key={rowIdx} className={editingNewRows.has(rowIdx) ? 'bg-green-50' : ''}>
                                      <td className="border border-gray-300 px-2 py-2 text-center text-gray-600 font-medium">
                                        {rowIdx + 1}
                                      </td>
                                      {Object.keys(row).map((key, colIdx) => {
                                        const cellKey = `${rowIdx}_${key}`;
                                        const isEdited = editedCells.has(cellKey);
                                        const cellRef = generateCellName(d.id, d.filename, colIdx, rowIdx);
                                        const isSelected = selectedCellForFormula === cellRef;
                                        const hasFormula = cellFormulas[cellRef];
                                        const dataType = columnDataTypes[key] || 'text';

                                        // Render input based on data type
                                        const renderInput = () => {
                                          // Get formula string and use stored value if available, otherwise evaluate
                                          const formulaString = hasFormula ? getFormulaString(hasFormula) : '';
                                          const storedValue = hasFormula ? getFormulaValue(hasFormula) : null;
                                          let displayValue = row[key] ?? '';
                                          if (hasFormula) {
                                            if (storedValue !== null) {
                                              displayValue = storedValue;
                                            } else {
                                              // Re-evaluate formula if no stored value
                                              const { value } = evaluateExpression(formulaString);
                                              displayValue = value ?? row[key] ?? '';
                                            }
                                          }
                                          const commonProps = {
                                            value: displayValue,
                                            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                                              const newData = [...editingDocData];
                                              let newValue: any = (e.target as HTMLInputElement).value;

                                              // Type conversion based on data type
                                              if (dataType === 'number') {
                                                newValue = newValue === '' ? '' : Number(newValue);
                                              } else if (dataType === 'currency') {
                                                newValue = newValue === '' ? '' : parseFloat(newValue);
                                              }

                                              newData[rowIdx][key] = newValue;
                                              setEditingDocData(newData);
                                              setEditedCells(prev => new Set([...prev, cellKey]));
                                            },
                                            className: `w-full px-2 py-1 border rounded text-sm cursor-pointer ${isSelected ? 'border-purple-500 bg-purple-100 ring-2 ring-purple-300' :
                                              hasFormula ? 'border-blue-400 bg-blue-50' :
                                                isEdited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                              } focus:outline-none focus:ring-2 focus:ring-blue-500`,
                                            title: hasFormula ? `Formula: ${cellFormulas[cellRef]?.formula || ''}\nRef Value: ${cellFormulas[cellRef]?.refvalue || ''}` : 'Click to select or use formula input'
                                          };

                                          switch (dataType) {
                                            case 'number':
                                            case 'currency':
                                              return <input type="number" {...commonProps} step="any" />;
                                            case 'date':
                                              // Display as text in dd/mm/yyyy format since we transform to that format
                                              return <input type="text" placeholder="dd/mm/yyyy" {...commonProps} />;
                                            case 'email':
                                              return <input type="email" {...commonProps} />;
                                            case 'phone':
                                              return <input type="tel" {...commonProps} />;
                                            default:
                                              return <input type="text" {...commonProps} />;
                                          }
                                        };

                                        return (
                                          <td
                                            key={cellKey}
                                            className="border border-gray-300 px-3 py-2 relative group"
                                            onMouseDown={(e: React.MouseEvent) => {
                                              // onMouseDown fires BEFORE input loses focus on blur
                                              // This ensures editingModeRef still has the correct value
                                              if (editingModeRef.current === 'formula') {
                                                e.preventDefault(); // Prevent input from losing focus yet
                                                const inputEl = formulaInputRef.current;
                                                if (inputEl) {
                                                  const cursorPos = inputEl.selectionStart !== undefined ? inputEl.selectionStart : formulaInput.length;
                                                  const currentFormula = formulaInput;
                                                  const newFormula = currentFormula.slice(0, cursorPos) + cellRef + currentFormula.slice(cursorPos);
                                                  setFormulaInput(newFormula);

                                                  // Refocus the formula textarea and position cursor after the inserted reference
                                                  setTimeout(() => {
                                                    if (inputEl) {
                                                      inputEl.selectionStart = inputEl.selectionEnd = cursorPos + cellRef.length;
                                                      inputEl.focus();
                                                    }
                                                  }, 0);
                                                }
                                              } else if (editingModeRef.current === 'cellName') {
                                                e.preventDefault(); // Prevent input from losing focus yet
                                                const inputEl = cellNameInputRef.current;
                                                if (inputEl) {
                                                  const cursorPos = inputEl.selectionStart !== undefined ? inputEl.selectionStart : (selectedCellForFormula?.length || 0);
                                                  const currentName = selectedCellForFormula || '';
                                                  const newName = currentName.slice(0, cursorPos) + cellRef + currentName.slice(cursorPos);
                                                  setSelectedCellForFormula(newName);

                                                  // Refocus the cell name input and position cursor after the inserted reference
                                                  setTimeout(() => {
                                                    if (inputEl) {
                                                      inputEl.selectionStart = inputEl.selectionEnd = cursorPos + cellRef.length;
                                                      inputEl.focus();
                                                    }
                                                  }, 0);
                                                }
                                              } else if (hasFormula && editingModeRef.current === null) {
                                                // If cell has formula and no input is in focus, populate the formula form
                                                e.preventDefault();
                                                setSelectedCellForFormula(cellRef);
                                                setFormulaInput(getFormulaString(hasFormula));
                                                // Scroll to formula section
                                                setTimeout(() => {
                                                  const formulaSection = document.querySelector('[data-formula-section]');
                                                  if (formulaSection) {
                                                    formulaSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                                  }
                                                }, 100);
                                              }
                                            }}
                                          >
                                            {renderInput()}
                                            <div className="hidden group-hover:block absolute bottom-full left-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap mb-1 z-10">
                                              <div>{cellRef}</div>
                                              {hasFormula && <div className="text-yellow-300">Formula: {getFormulaString(hasFormula)}</div>}
                                            </div>
                                          </td>
                                        );
                                      })}
                                      <td className="border border-gray-300 px-2 py-2 text-center">
                                        <button
                                          onClick={() => {
                                            // Delete the row from data
                                            setEditingDocData(prev => prev.filter((_, i) => i !== rowIdx));

                                            // Track deleted rows (only if not a new row)
                                            if (!editingNewRows.has(rowIdx)) {
                                              setDeletedRowIndices(prev => new Set([...prev, rowIdx]));
                                            }

                                            // Update new rows set
                                            setEditingNewRows(prev => {
                                              const newSet = new Set(prev);
                                              newSet.delete(rowIdx);
                                              // Adjust indices for rows after the deleted row
                                              const adjusted = new Set<number>();
                                              for (const idx of newSet) {
                                                const idxNum = Number(idx);
                                                adjusted.add(idxNum > rowIdx ? idxNum - 1 : idxNum);
                                              }
                                              return adjusted;
                                            });

                                            // Delete formulas associated with this row
                                            setCellFormulas(prev => {
                                              const updated = { ...prev };
                                              const cellsToDelete: string[] = [];
                                              const cellsToUpdate: Record<string, any> = {};

                                              for (const [cellRef, formula] of Object.entries(updated)) {
                                                // Extract row number from cell reference (e.g., "report1_R_A10" -> row 9, 0-indexed)
                                                const match = cellRef.match(/([A-Z]+)(\d+)$/);
                                                if (match) {
                                                  const cellRowIndex = Number(match[2]) - 1; // Convert to 0-indexed
                                                  if (cellRowIndex === rowIdx) {
                                                    // Mark for deletion if this cell is in the deleted row
                                                    cellsToDelete.push(cellRef);
                                                  } else if (cellRowIndex > rowIdx) {
                                                    // Adjust cell reference if it's in a row after the deleted row
                                                    const newRowNum = cellRowIndex - 1; // Adjust after deletion
                                                    const newCellRef = cellRef.replace(/(\d+)$/, String(newRowNum + 1)); // +1 for 1-based indexing in cell references
                                                    cellsToUpdate[newCellRef] = formula;
                                                    cellsToDelete.push(cellRef);
                                                  }
                                                }
                                              }

                                              // Remove old references and add updated ones
                                              for (const cellRef of cellsToDelete) {
                                                delete updated[cellRef];
                                              }
                                              Object.assign(updated, cellsToUpdate);

                                              return updated;
                                            });
                                          }}
                                          className="text-red-600 hover:text-red-800 font-bold text-lg"
                                          title="Delete row"
                                        >
                                          ×
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Computed Cells Section */}
                            <div className="mt-4 p-12 bg-purple-50 border border-purple-200 rounded" data-formula-section>
                              <h5 className="font-medium text-sm text-gray-800 mb-2">🧮 Computed Cell Formula</h5>
                              <p className="text-xs text-gray-600 mb-2">
                                <strong>Click on a cell with a formula to load it here:</strong> If formula input is focused → adds cell reference to formula. Otherwise → selects the cell for formula assignment.
                              </p>

                              {/* Guide Section */}
                              <details className="mb-3 border border-purple-300 bg-white rounded p-2 text-xs">
                                <summary className="font-medium text-gray-700 cursor-pointer hover:text-purple-600">📖 Formula Guide & Examples</summary>
                                <div className="mt-2 space-y-2 text-gray-600">
                                  <p><strong>Formulas are JavaScript expressions</strong> that return a single value. Click cells to insert their references.</p>

                                  <div className="bg-gray-50 border-l-4 border-purple-400 pl-2 py-1">
                                    <p className="font-medium text-gray-700">Simple Examples (Same Document):</p>
                                    <code className="block text-xs bg-gray-100 p-1 rounded mt-1">
                                      {`${generateCellName(d.id, d.filename, 0, 0)} + ${generateCellName(d.id, d.filename, 1, 0)}`}
                                    </code>
                                    <code className="block text-xs bg-gray-100 p-1 rounded mt-1">
                                      {`${generateCellName(d.id, d.filename, 0, 0)} * 0.15`}
                                    </code>
                                  </div>

                                  <div className="bg-gray-50 border-l-4 border-blue-400 pl-2 py-1">
                                    <p className="font-medium text-gray-700">Cross-Document References:</p>
                                    <p className="text-xs text-gray-700 mt-1">Reference cells from other uploaded documents using format: <code>report_ID.doc_ID_abbr_COLUMN+ROW</code></p>
                                    <code className="block text-xs bg-gray-100 p-1 rounded mt-1">
                                      {`report${report?.id || 1}.doc2_HD_A1 + ${generateCellName(d.id, d.filename, 0, 0)}`}
                                    </code>
                                    <code className="block text-xs bg-gray-100 p-1 rounded mt-1">
                                      {`(${generateCellName(d.id, d.filename, 0, 0)} / report${report?.id || 1}.doc3_T_C5) * 100`}
                                    </code>
                                  </div>

                                  <div className="bg-gray-50 border-l-4 border-indigo-400 pl-2 py-1">
                                    <p className="font-medium text-gray-700">Complex Example (Multi-step calculation):</p>
                                    <code className="block text-xs bg-gray-100 p-1 rounded mt-1 font-mono">
                                      {`const base = ${generateCellName(d.id, d.filename, 0, 0)};\nconst rate = ${generateCellName(d.id, d.filename, 1, 0)} / 100;\nconst result = base * (1 + rate);\nreturn Math.round(result * 100) / 100;`}
                                    </code>
                                  </div>

                                  <div className="bg-gray-50 border-l-4 border-green-400 pl-2 py-1">
                                    <p className="font-medium text-gray-700">Text & Number Combination:</p>
                                    <code className="block text-xs bg-gray-100 p-1 rounded mt-1 font-mono">
                                      {`const firstName = "${generateCellName(d.id, d.filename, 0, 0)}";\nconst lastName = "${generateCellName(d.id, d.filename, 1, 0)}";\nconst age = ${generateCellName(d.id, d.filename, 2, 0)};\nreturn firstName + " " + lastName + " (Age: " + age + ")";`}
                                    </code>
                                  </div>

                                  <p className="text-gray-600 italic">💡 <strong>Note:</strong> The formula must return a value at the end (explicitly or implicitly). Use <code>return</code> keyword for complex formulas. See CROSS_DOCUMENT_REFERENCES.md for detailed documentation.</p>
                                </div>
                              </details>

                              <div className="space-y-2 mb-3">
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1">Step 1: Click a cell or enter cell name</label>
                                  <input
                                    ref={cellNameInputRef}
                                    type="text"
                                    placeholder="Cell Name (e.g., 'report1_PL_B6') - Click a cell to set or click here and click cells to insert"
                                    className="w-full border rounded px-2 py-1 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedCellForFormula || ''}
                                    onChange={(e) => setSelectedCellForFormula(e.target.value)}
                                    onFocus={() => { editingModeRef.current = 'cellName'; }}
                                    onBlur={() => { editingModeRef.current = null; }}
                                    title="Select cell by clicking table cells, or type/paste cell reference"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1">Step 2: Enter formula</label>
                                  <textarea
                                    ref={formulaInputRef}
                                    placeholder={`JavaScript expression (e.g., '${generateCellName(d.id, d.filename, 0, 0)} * 2' or 'A1 + B1 * 0.1')`}
                                    className="w-full border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical min-h-24"
                                    value={formulaInput}
                                    onChange={(e) => setFormulaInput(e.target.value)}
                                    onFocus={() => { editingModeRef.current = 'formula'; }}
                                    onBlur={() => { editingModeRef.current = null; }}
                                    title="Focus this field and click cells to insert their references"
                                  />
                                </div>
                              </div>                            <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (!selectedCellForFormula) {
                                      try { swalError('Error', 'Please select a cell first by clicking on it in the table'); } catch (e) { }
                                      return;
                                    }
                                    if (!formulaInput.trim()) {
                                      try { swalError('Error', 'Please enter a formula'); } catch (e) { }
                                      return;
                                    }

                                    // Parse the cell reference to find row and column
                                    const cellRef = selectedCellForFormula;
                                    const cellRefPattern = /report\d+_[A-Z]{1,3}_([A-Z]+)(\d+)$/;
                                    const match = cellRef.match(cellRefPattern);

                                    if (!match) {
                                      try { swalError('Error', 'Invalid cell reference format'); } catch (e) { }
                                      return;
                                    }

                                    const [, letters, rowStr] = match;
                                    const rowIndex = Number(rowStr) - 1;

                                    // Convert letter(s) to column index
                                    let colIndex = 0;
                                    for (let i = 0; i < letters.length; i++) {
                                      colIndex = colIndex * 26 + (letters.charCodeAt(i) - 64);
                                    }
                                    colIndex--;

                                    // Check bounds
                                    if (rowIndex < 0 || rowIndex >= editingDocData.length) {
                                      try { swalError('Error', 'Row index out of bounds'); } catch (e) { }
                                      return;
                                    }

                                    const row = editingDocData[rowIndex];
                                    const keys = Object.keys(row);
                                    if (colIndex < 0 || colIndex >= keys.length) {
                                      try { swalError('Error', 'Column index out of bounds'); } catch (e) { }
                                      return;
                                    }
                                    // Evaluate formula and update cell
                                    const { value: result, refvalue } = evaluateExpression(formulaInput);
                                    const colKey = keys[colIndex];

                                    // Check if result is NaN
                                    if (typeof result === 'number' && isNaN(result)) {
                                      try { swalError('Error', 'Formula evaluated to NaN. Check that all referenced cells contain numeric values.'); } catch (e) { }
                                      return;
                                    }

                                    const newData = [...editingDocData];
                                    newData[rowIndex][colKey] = result !== null ? result : '';
                                    setEditingDocData(newData);

                                    // Store formula for this cell with evaluated value and refvalue
                                    setCellFormulas(prev => ({
                                      ...prev,
                                      [cellRef]: { formula: formulaInput, value: result !== null ? result : '', refvalue: refvalue }
                                    }));

                                    // Mark cell as edited
                                    setEditedCells(prev => new Set([...prev, `${rowIndex}_${colKey}`]));

                                    setFormulaInput('');
                                    setSelectedCellForFormula(null);
                                    try { swalSuccess('Success', `Cell updated with formula result`); } catch (e) { }
                                  }}
                                  disabled={!selectedCellForFormula}
                                >
                                  Set Formula
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setSelectedCellForFormula(null);
                                    setFormulaInput('');
                                  }}
                                >
                                  Clear
                                </Button>
                              </div>
                              <p className="text-xs text-gray-600 mt-2">
                                <strong>How to use:</strong> Click a cell in the table to select it, enter your JavaScript formula in the textarea, then click "Set Formula" to apply. The calculated value will immediately appear in the cell after saving. Open "Formula Guide & Examples" above for syntax help.
                              </p>
                            </div>

                            <div className="flex gap-2 mt-4">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const changedRows: Record<number, Record<string, any>> = {};
                                    editedCells.forEach(cellKey => {
                                      const parts = cellKey.split('_');
                                      const rowIdx = Number(parts[0]);
                                      const key = parts.slice(1).join('_');
                                      if (!changedRows[rowIdx]) changedRows[rowIdx] = {};
                                      changedRows[rowIdx][key] = editingDocData[rowIdx][key];
                                    });

                                    // Normalize formulas to include evaluated values
                                    const normalizedFormulas = Object.keys(cellFormulas).length > 0 ? normalizeFormulas(cellFormulas) : null;

                                    const res = await apiFetch(`/api/uploaded_docs/${d.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({
                                        partialUpdate: changedRows,
                                        newRows: Array.from(editingNewRows).map(idx => editingDocData[idx]),
                                        deletedRowIndices: Array.from(deletedRowIndices),
                                        cellFormulas: normalizedFormulas,
                                        columnDataTypes: Object.keys(columnDataTypes).length > 0 ? columnDataTypes : null
                                      })
                                    });

                                    if (res.ok) {
                                      const json = await res.json();
                                      setUploadedDocs(prev => prev.map(x => x.id === d.id ? {
                                        ...x,
                                        file_content: json.file_content || editingDocData,
                                        formulas: json.formulas || cellFormulas,
                                        columnDataTypes: json.columnDataTypes || columnDataTypes
                                      } : x));
                                      setEditingDocId(null);
                                      setEditedCells(new Set());
                                      setEditingNewRows(new Set());
                                      setDeletedRowIndices(new Set());
                                      setCellFormulas({});
                                      setColumnDataTypes({});
                                      setSelectedCellForFormula(null);
                                      setFormulaInput('');
                                      try { swalSuccess('Saved', 'Changes saved successfully'); } catch (e) { }
                                    } else {
                                      console.error('Save failed:', await res.text());
                                      try { swalError('Failed', 'Failed to save changes'); } catch (e) { }
                                    }
                                  } catch (e) {
                                    console.error('Save error:', e);
                                    try { swalError('Failed', 'Failed to save changes'); } catch (er) { }
                                  }
                                }}
                              >
                                Save Changes
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingDocId(null);
                                  setEditedCells(new Set());
                                  setEditingDocData([]);
                                  setEditingNewRows(new Set());
                                  setCellFormulas({});
                                  setColumnDataTypes({});
                                  setSelectedCellForFormula(null);
                                  setFormulaInput('');
                                  editingModeRef.current = null;
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </Card>

      {/* Review modal with toolbar and media upload */}
      <Modal isOpen={!!reviewModalOpen} onClose={() => setReviewModalOpen(false)} title={`Review Report ${report.id}`} size="xl" footer={(
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>Cancel</Button>
          <Button onClick={saveReview}>Save Review</Button>
        </div>
      )}>
        <div className="space-y-4">
          <div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 mb-2">
                <div className="flex-1" />
                {isAdmin && (
                  <Button className="text-red-600" onClick={async () => {
                    try {
                      const ok = await swalConfirm({ title: 'Delete this report?', text: 'This will remove associated uploaded files.' });
                      if (!ok) return;
                      const res = await apiFetch(`/api/reports/${report.id}`, { method: 'DELETE', credentials: 'include' });
                      if (res.ok) { try { swalSuccess('Deleted', 'Report deleted'); } catch (e) { } setTimeout(() => window.location.reload(), 500); }
                      else { try { swalError('Failed', 'Failed to delete report'); } catch (e) { } }
                    } catch (e) { console.error(e); try { swalError('Failed', 'Failed to delete report'); } catch (er) { } }
                  }}>Delete</Button>
                )}
              </div>

              <div className="flex gap-2 mb-2 items-center">
                <label className="px-2 py-1 border rounded cursor-pointer inline-block">
                  Image
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return; const url = await uploadMedia(f); if (url) setReviewContent(prev => (prev || '') + `<img src="${url}" style="max-width:100%"/>`);
                  }} />
                </label>
                <label className="px-2 py-1 border rounded cursor-pointer inline-block">
                  Video File
                  <input type="file" accept="video/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return; const url = await uploadMedia(f); if (url) setReviewContent(prev => (prev || '') + `<video controls src="${url}" style="max-width:100%"></video>`);
                  }} />
                </label>
                <div className="flex-1">
                  <input placeholder="Paste a YouTube or embed URL here" className="w-full border rounded p-2" value={String((powerbiConfig && powerbiConfig._lastVideoUrl) || '')} onChange={e => setPowerbiConfig(prev => ({ ...(prev || {}), _lastVideoUrl: e.target.value }))} />
                </div>
                <Button onClick={() => {
                  const v = powerbiConfig?._lastVideoUrl;
                  if (!v) return;
                  let url = String(v);
                  if (/youtube\.com\/watch\?v=/.test(url)) { const id = url.split('v=')[1].split('&')[0]; url = `https://www.youtube.com/embed/${id}`; }
                  else if (/youtu\.be\//.test(url)) { const id = url.split('youtu.be/')[1].split('?')[0]; url = `https://www.youtube.com/embed/${id}`; }
                  insertHtmlAtCaret(`<iframe src="${url}" style="width:100%;height:360px;border:none" allowfullscreen></iframe>`);
                }}>Insert Video URL</Button>
              </div>

              <div>
                <RichTextEditor value={reviewContent || ''} onChange={(v) => setReviewContent(v)} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Overall Score</label>
            <input type="number" className="w-full border rounded p-2" value={reviewScore ?? ''} onChange={e => setReviewScore(e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select className="w-full border rounded p-2" value={reviewStatus || ''} onChange={e => setReviewStatus(e.target.value)}>
              <option value="">(Select)</option>
              <option value="Completed">Completed</option>
              <option value="Draft">Draft</option>
              <option value="Reviewed">Reviewed</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const EditableJsonTable: React.FC<{ doc: any, search?: string, onSaved?: (doc: any) => void }> = ({ doc, search = '', onSaved }) => {
  const [content, setContent] = useState<any[]>(Array.isArray(doc.file_content) ? doc.file_content : []);
  const [edited, setEdited] = useState<Record<string, any>>({});

  useEffect(() => setContent(Array.isArray(doc.file_content) ? doc.file_content : []), [doc]);

  const columns = React.useMemo(() => {
    const cols = new Set<string>();
    for (const row of content) {
      if (row && typeof row === 'object') Object.keys(row).forEach(k => cols.add(k));
    }
    return Array.from(cols);
  }, [content]);

  const filtered = content.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return columns.some(c => (String((r[c] || '')).toLowerCase().includes(s)));
  });

  const saveCell = async (rowIndex: number, colKey: string, newValue: any) => {
    try {
      const res = await apiFetch(`/api/uploaded_docs/${doc.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ rowIndex, colKey, newValue })
      });
      if (res.ok) {
        const json = await res.json();
        setContent(json.file_content);
        onSaved && onSaved({ ...doc, file_content: json.file_content });
      } else {
        console.error('Failed to save cell', await res.text());
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50"><tr>
          <th className="px-4 py-2 text-left">#</th>
          {columns.map(c => <th key={c} className="px-4 py-2 text-left">{c}</th>)}
        </tr></thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filtered.map((row, ri) => (
            <tr key={ri}>
              <td className="px-4 py-2 text-sm">{ri}</td>
              {columns.map(c => (
                <td key={c} className="px-4 py-2 text-sm">
                  <input className="w-full border rounded p-1 text-sm" defaultValue={row[c] ?? ''} onBlur={e => {
                    const newVal = e.target.value;
                    if (String(row[c] ?? '') !== newVal) {
                      saveCell(ri, c, newVal);
                    }
                  }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default ReportViewPage;