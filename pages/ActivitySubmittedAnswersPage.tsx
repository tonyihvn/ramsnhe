import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';

const ActivitySubmittedAnswersPage: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activityTitle, setActivityTitle] = useState<string | null>(null);
  const [activityLevel, setActivityLevel] = useState<string | null>(null);
  const [transpose, setTranspose] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const [res, qRes, fRes, uRes] = await Promise.all([
          fetch(`/api/answers?activityId=${activityId}`, { credentials: 'include' }),
          fetch(`/api/questions?activityId=${activityId}`, { credentials: 'include' }),
          fetch(`/api/facilities`, { credentials: 'include' }),
          fetch(`/api/users`, { credentials: 'include' })
        ]);
        if (res.ok) setAnswers(await res.json() || []);
        if (qRes.ok) setQuestions(await qRes.json() || []);
        if (fRes.ok) setFacilities(await fRes.json() || []);
        if (uRes.ok) setUsers(await uRes.json() || []);
        try {
          const aRes = await fetch(`/api/activities/${activityId}`, { credentials: 'include' });
          if (aRes.ok) {
            const a = await aRes.json();
            setActivityTitle(a?.title || null);
            setActivityLevel(a?.level || null);
          }
        } catch (e) { /* ignore */ }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [activityId]);

  if (loading) return <div>Loading...</div>;

  const columns = [
    { key: 'report_id', label: 'Report ID' },
    { key: 'question', label: 'Question' },
    { key: 'answer', label: 'Answer' },
    { key: 'facility', label: 'Facility' },
    { key: 'user', label: 'User' },
    { key: 'recorded_by', label: 'Recorded By' },
    { key: 'score', label: 'Score' },
    { key: 'answer_datetime', label: 'Answer Date/Time' },
    { key: 'reviewers_comment', label: 'Reviewer Comment' },
    { key: 'quality_improvement_followup', label: 'QI Followup' },
    { key: 'created_at', label: 'Submitted At' },
  ];

  const qMap: Record<string, any> = {};
  for (const q of questions) {
    try {
      // map by several possible keys so we can match answers stored as 'q123', numeric ids, or by fieldName
      if (q && q.id !== undefined) {
        qMap[String(q.id)] = q;
        qMap[`q${String(q.id)}`] = q;
      }
      if (q && q.qid !== undefined) qMap[String(q.qid)] = q;
      if (q && q.question_id !== undefined) qMap[String(q.question_id)] = q;
      if (q && (q.fieldName || q.field_name)) {
        qMap[String(q.fieldName || q.field_name)] = q;
      }
    } catch (e) { }
  }
  const fMap: Record<string, any> = {};
  for (const f of facilities) { try { if (f && f.id !== undefined) fMap[String(f.id)] = f; } catch (e) { } }
  const uMap: Record<string, any> = {};
  for (const u of users) { try { if (u && u.id !== undefined) uMap[String(u.id)] = u; } catch (e) { } }

  // Extract grouped questions (separate from non-grouped answers)
  const groupedAnswersMap: Record<string, any[]> = {};
  const nonGroupedAnswers = answers.filter(a => {
    const q = qMap[String(a.question_id)];
    const groupName = q?.questionGroup || q?.question_group;
    if (groupName) {
      if (!groupedAnswersMap[groupName]) groupedAnswersMap[groupName] = [];
      groupedAnswersMap[groupName].push(a);
      return false; // exclude from non-grouped
    }
    return true;
  });

  const rows = nonGroupedAnswers.map(a => {
    const q = qMap[String(a.question_id)] || {};
    const questionText = q.questionText || q.question_text || q.text || q.label || String(a.question_id);
    const facility = fMap[String(a.facility_id)];
    const user = uMap[String(a.user_id)];
    const recordedByUser = uMap[String(a.recorded_by)];
    const answerVal = (a.answer_value && typeof a.answer_value === 'object') ? (a.answer_value.value ?? JSON.stringify(a.answer_value)) : a.answer_value;
    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || String(user.id) : String(a.user_id || '');
    const recordedByName = recordedByUser ? `${recordedByUser.first_name || ''} ${recordedByUser.last_name || ''}`.trim() || recordedByUser.email || String(recordedByUser.id) : String(a.recorded_by || '');
    const facilityName = facility ? (facility.name || facility.facility_name || String(facility.id)) : String(a.facility_id || '');
    return {
      report_id: a.report_id,
      question: questionText,
      answer: answerVal,
      facility: facilityName,
      user: userName,
      recorded_by: recordedByName,
      score: a.score || '—',
      answer_datetime: a.answer_datetime || '—',
      reviewers_comment: a.reviewers_comment || '—',
      quality_improvement_followup: a.quality_improvement_followup || '—',
      created_at: a.created_at
    };
  });

  // Build transposed view: columns are questions, rows are reports
  const questionIdentifiers: string[] = [];
  for (const q of questions) {
    try {
      if (q && q.id !== undefined) questionIdentifiers.push(String(q.id));
      else if (q && q.qid !== undefined) questionIdentifiers.push(String(q.qid));
      else if (q && q.question_id !== undefined) questionIdentifiers.push(String(q.question_id));
      else if (q && (q.fieldName || q.field_name)) questionIdentifiers.push(String(q.fieldName || q.field_name));
    } catch (e) { }
  }
  // ensure uniqueness
  const uniqueQuestionIds = Array.from(new Set(questionIdentifiers));

  const transposedColumns = [{ key: 'report_id', label: 'Report ID' }, { key: 'facility', label: 'Facility' }, ...uniqueQuestionIds.map(id => ({ key: id, label: (qMap[id]?.questionText || qMap[id]?.question_text || qMap[id]?.text || qMap[id]?.label || id) }))];

  const reportsMap: Record<string, any> = {};
  for (const a of answers) {
    const rid = a.report_id || 'unknown';
    if (!reportsMap[rid]) {
      const base: Record<string, any> = { report_id: rid, facility: '' };
      for (const qid of uniqueQuestionIds) base[qid] = '';
      reportsMap[rid] = base;
    }
    const key = String(a.question_id);
    const answerVal = (a.answer_value && typeof a.answer_value === 'object') ? (a.answer_value.value ?? JSON.stringify(a.answer_value)) : a.answer_value;
    reportsMap[rid][key] = answerVal;
    // set facility (use mapping if available)
    try {
      const facility = fMap[String(a.facility_id)];
      const facilityName = facility ? (facility.name || facility.facility_name || String(facility.id)) : String(a.facility_id || '');
      reportsMap[rid].facility = facilityName;
    } catch (e) { }
  }
  const transposedRows = Object.values(reportsMap);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{activityTitle || `Activity ${activityId}`}</h1>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" className="form-checkbox" checked={transpose} onChange={e => setTranspose(e.target.checked)} />
            <span className="text-sm">Transpose Records</span>
          </label>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
            <Button variant="secondary" onClick={async () => {
              try {
                const dataToExport = transpose ? transposedRows : rows;
                if (!dataToExport || dataToExport.length === 0) { alert('No data to export'); return; }
                const ExcelJS = await import('exceljs');
                const workbook = new ExcelJS.Workbook();
                const sheet = workbook.addWorksheet('Answers');
                let colsDef: any[] = [];
                if (transpose) {
                  colsDef = transposedColumns.map(c => ({ header: c.label, key: c.key }));
                } else {
                  colsDef = [
                    { header: 'Report ID', key: 'report_id' },
                    { header: 'Question', key: 'question' },
                    { header: 'Answer', key: 'answer' },
                    { header: 'Facility', key: 'facility' },
                    { header: 'User', key: 'user' },
                    { header: 'Recorded By', key: 'recorded_by' },
                    { header: 'Score', key: 'score' },
                    { header: 'Answer Date/Time', key: 'answer_datetime' },
                    { header: 'Reviewer Comment', key: 'reviewers_comment' },
                    { header: 'QI Followup', key: 'quality_improvement_followup' },
                    { header: 'Submitted At', key: 'created_at' }
                  ];
                }
                sheet.columns = colsDef;
                for (const r of dataToExport) {
                  sheet.addRow(r);
                }
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument-spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `activity_${activityId}_answers.xlsx`; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 500);
              } catch (e) { console.error('Export failed', e); alert('Export failed'); }
            }}>Export to Excel</Button>
          </div>
        </div>
      </div>

      <Card>
        <p className="text-sm text-gray-500 mb-4">This view shows all answers submitted for this activity across all reports. Each row represents a single answer (question-level).</p>
        {transpose ? (
          <div className="overflow-x-auto border rounded">
            <DataTable columns={transposedColumns} data={transposedRows} stickyHeader />
          </div>
        ) : (
          <DataTable columns={columns} data={rows} />
        )}
      </Card>

      {/* Grouped Questions Section */}
      {Object.keys(groupedAnswersMap).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">More...</h2>
          {Object.entries(groupedAnswersMap).map(([groupName, groupAnswersData]) => {
            // Organize grouped answers by row_index
            const rowMap: Record<number, Record<string, any>> = {};
            const columnsMap: Record<string, any> = {};
            const reportsSet = new Set<string>();

            groupAnswersData.forEach(a => {
              const q = qMap[String(a.question_id)] || {};
              const rowIndex = a.answer_row_index !== null && a.answer_row_index !== undefined ? Number(a.answer_row_index) : 0;
              const questionId = String(a.question_id);
              const questionText = q.questionText || q.question_text || q.text || q.label || questionId;
              const qKey = `q_${questionId}`;

              if (!rowMap[rowIndex]) rowMap[rowIndex] = { rowIndex: String(rowIndex), report_id: '' };
              rowMap[rowIndex][qKey] = a.answer_value;
              columnsMap[qKey] = { key: qKey, label: questionText };
              reportsSet.add(String(a.report_id));
            });

            // Build columns with row index, facility/user, and question columns
            const groupColumns = [
              { key: 'rowIndex', label: 'Row Index' },
              activityLevel === 'facility'
                ? { key: 'facility', label: 'Facility' }
                : { key: 'user', label: 'User' },
              ...Object.values(columnsMap),
              { key: 'score', label: 'Score' },
              { key: 'recorded_by', label: 'Recorded By' },
              { key: 'answer_datetime', label: 'Answer Date/Time' },
              { key: 'reviewers_comment', label: 'Reviewer Comment' },
              { key: 'quality_improvement_followup', label: 'QI Followup' }
            ];

            const sortedRowIndices = Object.keys(rowMap).map(Number).sort((a, b) => a - b);
            const groupTableData = sortedRowIndices.map((rowIdx) => {
              const rowData = rowMap[rowIdx];
              // Fill in facility or user based on activity level and additional fields
              const answerForRow = Object.values(groupAnswersData).find((a: any) => {
                const rIdx = a.answer_row_index !== null && a.answer_row_index !== undefined ? Number(a.answer_row_index) : 0;
                return rIdx === rowIdx;
              });

              if (answerForRow) {
                const a = answerForRow as any;
                if (activityLevel === 'facility') {
                  const facility = fMap[String(a.facility_id)];
                  rowData.facility = facility ? (facility.name || facility.facility_name || String(facility.id)) : String(a.facility_id || '');
                } else {
                  const user = uMap[String(a.user_id)];
                  const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || String(user.id) : String(a.user_id || '');
                  rowData.user = userName;
                }
                // Add additional fields
                const recordedByUser = uMap[String(a.recorded_by)];
                const recordedByName = recordedByUser ? `${recordedByUser.first_name || ''} ${recordedByUser.last_name || ''}`.trim() || recordedByUser.email || String(recordedByUser.id) : String(a.recorded_by || '');
                rowData.score = a.score || '—';
                rowData.recorded_by = recordedByName;
                rowData.answer_datetime = a.answer_datetime || '—';
                rowData.reviewers_comment = a.reviewers_comment || '—';
                rowData.quality_improvement_followup = a.quality_improvement_followup || '—';
              }
              return rowData;
            });

            return (
              <Card key={groupName}>
                <h3 className="text-md font-semibold mb-3 text-gray-700">
                  {groupName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}
                </h3>
                {groupTableData.length > 0 ? (
                  <DataTable columns={groupColumns} data={groupTableData} pageSize={25} persistKey={`activity_grouped_${groupName}`} />
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">No data</div>
                )}
              </Card>
            );
          })}
        </div>
      )}


    </div>
  );
};

export default ActivitySubmittedAnswersPage;
