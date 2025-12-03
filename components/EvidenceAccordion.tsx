import React, { useState, useEffect } from 'react';
import BundlePreview from './BundlePreview';

const EvidenceAccordion: React.FC<{ facility: any; mapAnswers?: any | null }> = ({ facility, mapAnswers: mapAnswersProp }) => {
  const [open, setOpen] = useState(false);
  const [mapAnswers, setMapAnswers] = useState<any | null>(mapAnswersProp || null);

  useEffect(() => {
    let cancelled = false;
    // If the parent passed mapAnswers, use it and skip fetching
    if (mapAnswersProp) { setMapAnswers(mapAnswersProp); return; }
    if (!open) return;
    (async () => {
      try {
        const fid = facility && (facility.id || facility.id === 0) ? facility.id : null;
        if (!fid) return;
        const resp = await fetch(`/api/public/facility_map_answers?facilityId=${encodeURIComponent(fid)}`);
        if (!resp.ok) return;
        const j = await resp.json();
        if (!cancelled) setMapAnswers(j);
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [open, facility && facility.id, mapAnswersProp]);

  // helper: gather reviewer comments and validator-marked show_on_map items
  const renderReviewerSection = () => {
    if (!mapAnswers || !Array.isArray(mapAnswers.reports) || mapAnswers.reports.length === 0) return null;
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ marginBottom: 6 }}><strong>Reviewer Comments & Approvals</strong></div>
        {mapAnswers.reports.map((r: any) => (
          <div key={r.reportId} style={{ marginBottom: 8, padding: 8, border: '1px dashed #eee', borderRadius: 6 }}>
            {r.reviewers_report && <div style={{ fontSize: 13, color: '#444', marginBottom: 6 }}><strong>Report {r.reportId} review:</strong> {r.reviewers_report}</div>}
            {Array.isArray(Object.keys(r.answers || {})) && (
              <div style={{ display: 'grid', gap: 6 }}>
                {Object.entries(r.answers || {}).map(([qid, ansObj]: any) => {
                  const qc = (ansObj && typeof ansObj === 'object') ? ansObj : { value: ansObj };
                  if ((!qc.reviewers_comment && !qc.quality_improvement_followup)) return null;
                  return (
                    <div key={qid} style={{ fontSize: 13 }}>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Question {qid}</div>
                      {qc.reviewers_comment && <div style={{ fontWeight: 600 }}>Comment: {qc.reviewers_comment}</div>}
                      {qc.quality_improvement_followup && <div style={{ fontSize: 13, color: '#444' }}>Followup: {qc.quality_improvement_followup}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderValidatorCertificates = () => {
    if (!mapAnswers || !Array.isArray(mapAnswers.reports) || mapAnswers.reports.length === 0) return null;
    // Collect questions that have show_on_map_roles including 'Validator'
    const validatorMap: Record<string, Array<{ reportId: any; question: any; answer: any }>> = {};
    for (const r of mapAnswers.reports) {
      const qlist = Array.isArray(r.showOnMapQuestions) ? r.showOnMapQuestions : [];
      for (const q of qlist) {
        const roles = Array.isArray(q.show_on_map_roles) ? q.show_on_map_roles.map((s: any) => String(s).toLowerCase()) : [];
        if (roles.includes('validator') || roles.includes('validators')) {
          const qid = String(q.id);
          const ansObj = r.answers ? r.answers[qid] : null;
          const sec = q.sectionName || q.pageName || 'General';
          if (!validatorMap[sec]) validatorMap[sec] = [];
          validatorMap[sec].push({ reportId: r.reportId, question: q, answer: ansObj });
        }
      }
    }
    if (Object.keys(validatorMap).length === 0) return null;
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ marginBottom: 6 }}><strong>Certificates / References (Validator)</strong></div>
        {Object.entries(validatorMap).map(([section, items]) => (
          <div key={section} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{section}</div>
            {items.map((it, idx) => (
              <div key={idx} style={{ padding: 8, border: '1px solid #f2f2f2', borderRadius: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: '#333' }}><strong>Report</strong> {it.reportId}</div>
                <div style={{ fontSize: 13, color: '#444', marginTop: 4 }}>{it.question.questionText || it.question.id}</div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>{(it.answer && (typeof it.answer === 'object' ? (it.answer.value ?? JSON.stringify(it.answer)) : String(it.answer))) || '—'}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <button onClick={() => setOpen(s => !s)} style={{ background: 'transparent', border: 'none', color: '#0077cc', cursor: 'pointer' }}>{open ? 'Hide Evidence' : 'Show Evidence'}</button>
      {open && (
        <div style={{ marginTop: 8, padding: 10, border: '1px solid #eee', borderRadius: 6 }}>
          <div style={{ marginBottom: 6 }}><strong>Certificates / References</strong></div>
          <ul>
            {(facility?.evidence?.certificates || []).map((c: any) => <li key={c.id}>{c.id} — {c.note}</li>)}
            {!(facility?.evidence?.certificates || []).length && <li>None (synthetic)</li>}
          </ul>

          <div style={{ marginTop: 8 }}>
            <strong>Telemetry Targets & Actuals</strong>
            <div style={{ fontSize: 13, color: '#444' }}>
              Targets met: {facility?.evidence?.targets_met ? 'Yes' : 'No'}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Sampling Notes / Provenance</strong>
            <div style={{ fontSize: 13, color: '#444' }}>{facility?.evidence?.sampling_note || 'Synthetic sampling note'}</div>
          </div>

          {renderReviewerSection()}

          {renderValidatorCertificates()}

          <div style={{ marginTop: 12 }}>
            <BundlePreview facility={facility} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceAccordion;
