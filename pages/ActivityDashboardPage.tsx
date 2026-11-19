import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import AIAssistantDashboard from '../components/AIAssistantDashboard';
import { confirm, error as swalError, success as swalSuccess } from '../components/ui/swal';
import { useActivityPermissions } from '../hooks/useActivityPermissions';
import { useData } from '../hooks/useData';
import { Bar, Pie, Line, Scatter } from 'react-chartjs-2';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { PublicClientApplication } from '@azure/msal-browser';
import * as powerbiSdk from 'powerbi-client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Title, Tooltip, Legend);

type StatCondition = {
  id: string;
  questionId: string;
  operator: string;
  value: string;
  isCustomValue?: boolean;
};

type InteractiveStatItem = {
  statKey: string;
  questionId: string;
  aggregateType: string;
  conditions: StatCondition[];
};

type DashboardChartsConfig = {
  selectedQuestionIds: string[];
  chartTypes: Record<string, string>;
};

const ActivityDashboardPage: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useData();
  const { checkPermission, permissions } = useActivityPermissions(activityId);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [facilitiesMap, setFacilitiesMap] = useState<Record<string, string>>({});
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [chartTypes, setChartTypes] = useState<Record<string, string>>({});
  const [powerbiModalOpen, setPowerbiModalOpen] = useState(false);
  const [powerbiInput, setPowerbiInput] = useState('');
  const [powerbiLinkType, setPowerbiLinkType] = useState<string | null>(null);
  const [powerbiMode, setPowerbiMode] = useState<string | null>(null);
  const [powerbiSaving, setPowerbiSaving] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);
  const quickCreateContainerRef = useRef<HTMLDivElement | null>(null);
  // AI assistant states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);
  const [aiResponseSql, setAiResponseSql] = useState<string | null>(null);
  const [aiQueryResult, setAiQueryResult] = useState<any | null>(null);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([]);
  const [selectedBusinessRules, setSelectedBusinessRules] = useState<any[]>([]);
  const [interactiveStats, setInteractiveStats] = useState<InteractiveStatItem[]>([]);
  const [statsResults, setStatsResults] = useState<Record<string, number | string>>({});
  const [selectedStatQuestion, setSelectedStatQuestion] = useState<string>('');
  const [selectedStatAggregateType, setSelectedStatAggregateType] = useState<string>('');
  const [selectedStatConditions, setSelectedStatConditions] = useState<StatCondition[]>([]);
  const [statsSettingsModalOpen, setStatsSettingsModalOpen] = useState(false);
  const [chartsSettingsModalOpen, setChartsSettingsModalOpen] = useState(false);
  const [dashboardConfigSaving, setDashboardConfigSaving] = useState(false);

  function parseJsonConfig(value: any) {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return null;
      }
    }
    if (typeof value === 'object') return value;
    return null;
  }

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`/api/activity_dashboard/${activityId}`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          setData(json);
          const savedStatsConfig = parseJsonConfig(json?.activity?.dashboard_stats_config);
          const savedChartsConfig = parseJsonConfig(json?.activity?.dashboard_charts_config) as DashboardChartsConfig | null;

          if (Array.isArray(savedStatsConfig?.items)) {
            const restored = savedStatsConfig.items
              .filter((s: any) => s && s.questionId && s.aggregateType)
              .map((s: any, idx: number) => {
                const restoredConditions: StatCondition[] = Array.isArray(s.conditions)
                  ? s.conditions
                    .filter((c: any) => c && c.questionId && c.operator && c.value !== undefined && c.value !== null)
                    .map((c: any, cIdx: number) => ({
                      id: `restored-cond-${idx}-${cIdx}`,
                      questionId: String(c.questionId),
                      operator: String(c.operator),
                      value: String(c.value),
                      isCustomValue: c.isCustomValue === true,
                    }))
                  : [];
                return {
                  questionId: String(s.questionId),
                  aggregateType: String(s.aggregateType),
                  conditions: restoredConditions,
                  statKey: '',
                };
              });
            setInteractiveStats(restored);
          } else {
            setInteractiveStats([]);
          }

          setSelectedQuestionIds(Array.isArray(savedChartsConfig?.selectedQuestionIds) ? savedChartsConfig!.selectedQuestionIds.map((id) => String(id)) : []);
          setChartTypes(savedChartsConfig?.chartTypes && typeof savedChartsConfig.chartTypes === 'object' ? savedChartsConfig.chartTypes : {});
        } else {
          // If the dashboard endpoint isn't available, try fetching the activity as a fallback
          const txt = await res.text();
          console.error('Failed to load dashboard', txt);
          if (res.status === 404) {
            try {
              const aRes = await fetch(`/api/activities/${activityId}`, { credentials: 'include' });
              if (aRes.ok) {
                const a = await aRes.json();
                setData({ activity: a, questions: [], reports: [], answers: [], answersByQuestion: {}, uploadedDocs: [] });
                setInteractiveStats([]);
                setSelectedQuestionIds([]);
                setChartTypes({});
              }
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchDashboard();

    // fetch users and facilities for name mapping
    (async () => {
      try {
        const [uRes, fRes] = await Promise.all([
          fetch('/api/users', { credentials: 'include' }),
          fetch('/api/facilities', { credentials: 'include' })
        ]);
        if (uRes.ok) {
          const users = await uRes.json();
          const map: Record<string, string> = {};
          users.forEach((u: any) => map[String(u.id)] = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || String(u.id));
          setUsersMap(map);
        }
        if (fRes.ok) {
          const facs = await fRes.json();
          const fmap: Record<string, string> = {};
          facs.forEach((f: any) => fmap[String(f.id)] = f.name || String(f.id));
          setFacilitiesMap(fmap);
        }
      } catch (e) { console.error('Failed to fetch users/facilities', e); }
    })();
  }, [activityId]);


  const activity = data?.activity || {};
  const questions = Array.isArray(data?.questions) ? data.questions : [];
  const reports = Array.isArray(data?.reports) ? data.reports : [];
  const answersByQuestion = data?.answersByQuestion || {};
  const uploadedDocs = Array.isArray(data?.uploadedDocs) ? data.uploadedDocs : [];
  const allAnswers = Array.isArray(data?.answers) ? data.answers : [];

  const normalizeAnswerValue = (value: any): string => {
    let v = value;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          v = JSON.parse(trimmed);
        } catch (e) {
          v = trimmed;
        }
      }
    }
    if (v && typeof v === 'object') {
      if ('value' in v) {
        v = v.value;
      } else if ('label' in v) {
        v = v.label;
      } else if ('text' in v) {
        v = v.text;
      } else if (Array.isArray(v)) {
        v = v.map(item => normalizeAnswerValue(item)).filter(Boolean).join(', ');
      } else {
        v = JSON.stringify(v);
      }
    }
    if (v === undefined || v === null) return '';
    return String(v).trim();
  };

  const getAnswersForQuestion = (questionId: string): any[] => {
    const byMap = answersByQuestion?.[questionId] || answersByQuestion?.[String(questionId)] || [];
    if (Array.isArray(byMap) && byMap.length > 0) {
      return byMap;
    }
    return allAnswers.filter((a: any) => String(a.question_id) === String(questionId));
  };

  const calculateStat = (answers: any[], aggregateType: string): number | string => {
    if (aggregateType === 'count') return answers.length;

    const nums = answers
      .map((a: any) => {
        const n = parseFloat(normalizeAnswerValue(a.answer_value));
        return isNaN(n) ? undefined : n;
      })
      .filter((n: any) => n !== undefined);

    if (nums.length === 0) return '—';

    switch (aggregateType) {
      case 'sum':
        return nums.reduce((a: number, b: number) => a + b, 0);
      case 'average':
        return (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(2);
      case 'min':
        return Math.min(...nums);
      case 'max':
        return Math.max(...nums);
      case 'median': {
        const sorted = nums.sort((a: number, b: number) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);
      }
      case 'std_dev': {
        const avg = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
        const variance = nums.reduce((a: number, b: number) => a + Math.pow(b - avg, 2), 0) / nums.length;
        return Math.sqrt(variance).toFixed(2);
      }
      default:
        return '—';
    }
  };

  const getDistinctResponsesByQuestion = (questionId: string): string[] => {
    const rows = getAnswersForQuestion(questionId);
    const values = Array.from(new Set(
      rows
        .map((a: any) => normalizeAnswerValue(a.answer_value))
        .filter((v: string) => v !== '')
    ));
    return values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  };

  const compareWithOperator = (leftRaw: string, operator: string, rightRaw: string): boolean => {
    const left = String(leftRaw ?? '').trim();
    const right = String(rightRaw ?? '').trim();
    const leftNum = Number(left);
    const rightNum = Number(right);
    const hasNumericPair = left !== '' && right !== '' && !Number.isNaN(leftNum) && !Number.isNaN(rightNum);

    switch (operator) {
      case '==':
      case '===':
        return left.toLowerCase() === right.toLowerCase();
      case '!=':
      case '!==':
        return left.toLowerCase() !== right.toLowerCase();
      case '>':
        return hasNumericPair ? leftNum > rightNum : left > right;
      case '>=':
        return hasNumericPair ? leftNum >= rightNum : left >= right;
      case '<':
        return hasNumericPair ? leftNum < rightNum : left < right;
      case '<=':
        return hasNumericPair ? leftNum <= rightNum : left <= right;
      case 'contains':
        return left.toLowerCase().includes(right.toLowerCase());
      case 'not_contains':
        return !left.toLowerCase().includes(right.toLowerCase());
      default:
        return false;
    }
  };

  const getMatchingReportIds = (conditions: StatCondition[]): Set<string> => {
    const completeConditions = conditions.filter(c => c.questionId && c.operator && c.value !== '');
    if (completeConditions.length === 0) {
      return new Set((reports || []).map((r: any) => String(r.id)));
    }

    const matchedReportIds = new Set<string>();
    for (const report of reports || []) {
      const reportId = String(report.id);
      const passesAll = completeConditions.every((condition) => {
        const rows = getAnswersForQuestion(condition.questionId).filter((a: any) => String(a.report_id) === reportId);
        if (rows.length === 0) return false;
        return rows.some((a: any) => compareWithOperator(normalizeAnswerValue(a.answer_value), condition.operator, condition.value));
      });
      if (passesAll) {
        matchedReportIds.add(reportId);
      }
    }
    return matchedReportIds;
  };

  const buildStatKey = (questionId: string, aggregateType: string, conditions: StatCondition[]): string => {
    const applyWhere = aggregateType === 'count';
    if (!applyWhere) {
      return `${questionId}-${aggregateType}-all`;
    }
    const completeConditions = conditions
      .filter(c => c.questionId && c.operator && c.value !== '')
      .map(c => `${c.questionId}:${c.operator}:${c.value}`);
    const whereKey = completeConditions.length ? completeConditions.join('|') : 'all';
    return `${questionId}-${aggregateType}-${whereKey}`;
  };

  useEffect(() => {
    if (!Array.isArray(interactiveStats) || interactiveStats.length === 0) {
      setStatsResults({});
      return;
    }

    const normalizedStats = interactiveStats.map((stat) => {
      const conditions = Array.isArray(stat.conditions) ? stat.conditions : [];
      const statKey = stat.statKey || buildStatKey(stat.questionId, stat.aggregateType, conditions);
      return { ...stat, statKey };
    });

    const changedKeys = normalizedStats.some((s, idx) => s.statKey !== interactiveStats[idx]?.statKey);
    if (changedKeys) {
      setInteractiveStats(normalizedStats);
      return;
    }

    const recalculated: Record<string, number | string> = {};
    normalizedStats.forEach((stat) => {
      const conditionsToApply = stat.aggregateType === 'count' ? (stat.conditions || []) : [];
      const matchingReportIds = getMatchingReportIds(conditionsToApply);
      const filteredAnswers = getAnswersForQuestion(stat.questionId).filter((a: any) => matchingReportIds.has(String(a.report_id)));
      recalculated[stat.statKey] = calculateStat(filteredAnswers, stat.aggregateType);
    });
    setStatsResults(recalculated);
  }, [interactiveStats, allAnswers, reports, answersByQuestion]);

  const handleAddStat = (questionId: string, aggregateType: string, conditions: StatCondition[]) => {
    if (!aggregateType || !questionId) return;
    const effectiveConditions = aggregateType === 'count' ? conditions : [];
    const statKey = buildStatKey(questionId, aggregateType, effectiveConditions);
    if (interactiveStats.some(s => s.statKey === statKey)) {
      swalError('Duplicate stat', 'This stat definition already exists.');
    } else {
      const completeConditions = effectiveConditions.filter(c => c.questionId && c.operator && c.value !== '');
      setInteractiveStats(prev => [...prev, { statKey, questionId, aggregateType, conditions: completeConditions }]);
    }
  };

  const handleAddStatClick = () => {
    if (selectedStatQuestion && selectedStatAggregateType) {
      const whereApplies = selectedStatAggregateType === 'count';
      if (whereApplies) {
        const incomplete = selectedStatConditions.some(c =>
          (!c.questionId || !c.operator || c.value === '' || c.value === null)
        );
        if (incomplete) {
          swalError('Incomplete filter', 'Please complete every "Where" condition or remove empty ones.');
          return;
        }
      }
      handleAddStat(selectedStatQuestion, selectedStatAggregateType, selectedStatConditions);
      setSelectedStatQuestion('');
      setSelectedStatAggregateType('');
      setSelectedStatConditions([]);
    }
  };

  const handleAddCondition = () => {
    setSelectedStatConditions(prev => [...prev, { id: `cond-${Date.now()}-${prev.length}`, questionId: '', operator: '==', value: '' }]);
  };

  const handleRemoveCondition = (conditionId: string) => {
    setSelectedStatConditions(prev => {
      return prev.filter(c => c.id !== conditionId);
    });
  };

  const handleConditionChange = (conditionId: string, patch: Partial<StatCondition>) => {
    setSelectedStatConditions(prev => prev.map(c => {
      if (c.id !== conditionId) return c;
      const next = { ...c, ...patch };
      if (Object.prototype.hasOwnProperty.call(patch, 'questionId')) {
        next.value = '';
      }
      return next;
    }));
  };

  const saveDashboardConfig = async (statsItems: InteractiveStatItem[], chartsConfig: DashboardChartsConfig) => {
    if (!activity?.id) return;
    try {
      setDashboardConfigSaving(true);
      const payload = {
        dashboard_stats_config: {
          items: statsItems.map((s) => ({
            questionId: s.questionId,
            aggregateType: s.aggregateType,
            conditions: (s.conditions || []).map((c) => ({
              questionId: c.questionId,
              operator: c.operator,
              value: c.value,
              isCustomValue: c.isCustomValue === true,
            })),
          })),
        },
        dashboard_charts_config: chartsConfig,
      };
      const resp = await fetch(`/api/admin/activities/${activity.id}/dashboard-config`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || 'Failed to save dashboard config');
      }
      const updated = await resp.json();
      if (updated?.activity) {
        setData((prev: any) => ({ ...prev, activity: { ...(prev?.activity || {}), ...updated.activity } }));
      }
      swalSuccess('Saved', 'Dashboard configuration saved.');
    } catch (e: any) {
      console.error('Failed to save dashboard config', e);
      swalError('Save failed', String(e?.message || e || 'Failed to save dashboard config'));
    } finally {
      setDashboardConfigSaving(false);
    }
  };


  // Check if user has permission to view this activity
  const userRole = String(currentUser?.role || '').toLowerCase().trim();
  const isAdmin = userRole === 'admin' || userRole === 'super-admin' || userRole === 'super_admin';
  const hasViewAccess = isAdmin || checkPermission('can_view');

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data available for this activity.</div>;

  if (!isAdmin && !hasViewAccess) {
    return (
      <Card className="bg-red-50 border border-red-200">
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-700 mb-4">You do not have permission to view this activity dashboard.</p>
          <Button onClick={() => navigate('/activities')} variant="secondary">Back to Activities</Button>
        </div>
      </Card>
    );
  }

  // Utility to strip HTML tags
  function stripHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  const handleDownloadPdf = () => {
    // Simple client-side PDF/print: open print dialog for the dashboard
    window.print();
  };

  const launchQuickCreate = async () => {
    const clientId = import.meta.env.VITE_POWERBI_CLIENT_ID;
    const tenantId = import.meta.env.VITE_POWERBI_TENANT_ID || 'common';
    if (!clientId) {
      swalError(
        'Power BI setup required',
        'Set VITE_POWERBI_CLIENT_ID, VITE_POWERBI_TENANT_ID, and VITE_POWERBI_REDIRECT_URI in .env, then restart the app.'
      );
      return;
    }

    setQuickCreateLoading(true);
    setQuickCreateOpen(true);
    setPowerbiModalOpen(false);

    try {
      const redirectUri = import.meta.env.VITE_POWERBI_REDIRECT_URI || window.location.origin;
      const msal = new PublicClientApplication({
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${tenantId}`,
          redirectUri,
        },
        cache: {
          cacheLocation: 'sessionStorage',
          storeAuthStateInCookie: false,
        },
      });

      await msal.initialize();
      const scopes = [
        'openid',
        'profile',
        'offline_access',
        'https://analysis.windows.net/powerbi/api/Content.Create',
        'https://analysis.windows.net/powerbi/api/Dataset.ReadWrite.All',
        'https://analysis.windows.net/powerbi/api/Report.Read.All',
        'https://analysis.windows.net/powerbi/api/Workspace.Read.All',
      ];

      const accounts = msal.getAllAccounts();
      let account = msal.getActiveAccount() || accounts[0] || null;
      if (!account) {
        const loginResult = await msal.loginPopup({ scopes });
        account = loginResult.account;
        msal.setActiveAccount(account);
      }

      let accessToken = '';
      try {
        const silent = await msal.acquireTokenSilent({ account, scopes });
        accessToken = silent.accessToken;
      } catch (silentError) {
        const interactive = await msal.acquireTokenPopup({ account, scopes });
        accessToken = interactive.accessToken;
      }

      const entityType = String(activity.response_type || activity.responseType || '').toLowerCase();
      const entityColumn = entityType === 'user'
        ? 'User'
        : entityType === 'facility'
          ? 'Facility'
          : 'Entity';

      const uniqueQuestionColumns: Array<{ name: string; questionId: string }> = [];
      questions.forEach((question: any) => {
        const baseName = String(question.question_text || question.text || `Question ${question.id}`).replace(/\s+/g, ' ').trim();
        let name = baseName || `Question ${question.id}`;
        let suffix = 2;
        while (uniqueQuestionColumns.some(column => column.name === name)) {
          name = `${baseName} (${suffix++})`;
        }
        uniqueQuestionColumns.push({ name, questionId: String(question.id) });
      });

      const columnNames = ['Report ID', 'Submission Date', 'Status', entityColumn, ...uniqueQuestionColumns.map(c => c.name)];
      const rows: string[][] = [];
      (reports || []).slice(0, 10000).forEach((report: any) => {
        const reportAnswers = allAnswers.filter((answer: any) => String(answer.report_id) === String(report.id));
        const entityName = entityType === 'user'
          ? (usersMap[String(report.user_id)] || String(report.user_id || ''))
          : entityType === 'facility'
            ? (facilitiesMap[String(report.facility_id)] || String(report.facility_id || ''))
            : '';

        const row = [
          String(report.id),
          report.submission_date ? new Date(report.submission_date).toISOString() : '',
          String(report.status || ''),
          entityName,
          ...uniqueQuestionColumns.map(column => {
            const answer = reportAnswers.find((item: any) => String(item.question_id) === column.questionId);
            return answer ? normalizeAnswerValue(answer.answer_value) : '';
          }),
        ];
        rows.push(row);
      });

      if (rows.length === 0) {
        swalError('No collected data', 'This activity has no report rows to transform into a Power BI report.');
        setQuickCreateOpen(false);
        return;
      }

      const inferDataType = (index: number) => {
        const values = rows.map(row => row[index]).filter(value => value !== '');
        if (index === 1 && values.length > 0 && values.every(value => !Number.isNaN(Date.parse(value)))) {
          return powerbiSdk.models.DataType.DateTime;
        }
        if (values.length > 0 && values.every(value => !Number.isNaN(Number(value)))) {
          const decimals = values.some(value => value.includes('.'));
          return decimals ? powerbiSdk.models.DataType.Number : powerbiSdk.models.DataType.Int32;
        }
        return powerbiSdk.models.DataType.Text;
      };

      const tableName = 'Table';
      const tableSchemaList = [{
        name: tableName,
        columns: columnNames.map((name, index) => ({
          name,
          dataType: inferDataType(index),
        })),
      }];

      const data = [{
        name: tableName,
        rows,
      }];

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!quickCreateContainerRef.current) {
        throw new Error('Power BI report container is not available.');
      }

      const service = new powerbiSdk.service.Service(
        powerbiSdk.factories.hpmFactory,
        powerbiSdk.factories.wpmpFactory,
        powerbiSdk.factories.routerFactory
      );

      const config: any = {
        type: 'quickCreate',
        accessToken,
        tokenType: powerbiSdk.models.TokenType.Aad,
        embedUrl: 'https://app.powerbi.com/quickcreate',
        datasetCreateConfig: {
          modelName: `${activity.title || 'Activity'} Collected Data`,
          locale: 'en_US',
          tableSchemaList,
          data,
        },
        reportCreationMode: powerbiSdk.models.ReportCreationMode.QuickExplore,
        settings: {
          localeSettings: {
            language: 'en_US',
          },
        },
      };

      service.quickCreate(quickCreateContainerRef.current, config);
    } catch (error: any) {
      console.error('Power BI Quick Create failed', error);
      const message = String(error?.message || error || 'Unable to start Power BI Quick Create.');
      swalError('Power BI Quick Create failed', message);
      setQuickCreateOpen(false);
    } finally {
      setQuickCreateLoading(false);
    }
  };

  const standaloneUrl = `${window.location.origin}/standalone-form/${activity.id}`;
  return (
    <div className="space-y-6 pb-20">
      <div>
        <div>
          <h1 className="text-2xl font-bold">{activity.title} — Collected Data</h1>
          <p className="text-sm text-gray-500">{stripHtml(activity.details)}</p>
          <div className="mt-2">
            <span className="text-xs text-gray-600">Shareable Form Link: </span>
            <a href={standaloneUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline break-all">{standaloneUrl}</a>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <div className="inline-flex items-center space-x-2">
            <Button onClick={() => navigate('/activities')} variant="secondary">Back</Button>
            <Button onClick={() => navigate(`/activities/fill/${activity.id}`)} variant="primary">New +</Button>
            {isAdmin && <Button onClick={() => navigate(`/reports/builder?activityId=${activity.id}`)} variant="secondary">Build Report</Button>}
            <Button onClick={handleDownloadPdf}>Download PDF</Button>
            <Button variant="secondary" onClick={() => navigate(`/activities/${activity.id}/submitted-answers`)}>View Saved Data</Button>
            <Button variant="secondary" onClick={() => navigate(`/activities/${activity.id}/excel-tables`)}>View Excel Tables</Button>
          </div>
        </div>
      </div>

      {/* Power BI Modal */}
      {powerbiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white w-11/12 max-w-2xl p-6 rounded shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Configure Power BI for this activity</h3>
              <div>
                <Button size="sm" variant="secondary" onClick={() => setPowerbiModalOpen(false)}>Close</Button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">Paste an iframe snippet or the direct iframe <code>src</code> URL below.</div>
              <textarea className="w-full border rounded p-2 text-sm" rows={4} value={powerbiInput} onChange={e => setPowerbiInput(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <select className="border p-2 rounded" value={powerbiLinkType || ''} onChange={e => setPowerbiLinkType(e.target.value || null)}>
                  <option value="">(Select type)</option>
                  <option value="embed">Embed</option>
                  <option value="iframe">Iframe</option>
                  <option value="link">Link</option>
                  <option value="quick-create">One-Click Power BI Transform</option>
                </select>
                <select className="border p-2 rounded" value={powerbiMode || 'disabled'} onChange={e => setPowerbiMode(e.target.value || null)}>
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                </select>
              </div>
              <div className="text-xs text-gray-500">Example: &lt;iframe src=\"https://app.powerbi.com/....\" width=\"..\" height=\"..\"&gt;&lt;/iframe&gt;</div>
              {powerbiLinkType === 'quick-create' && (
                <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  Transform all collected rows for this activity into a live Power BI report.
                  The first use opens Microsoft sign-in. A Power BI account/license and the
                  Entra SPA credentials configured in <code>.env</code> are required.
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setPowerbiModalOpen(false); }}>Cancel</Button>
              {powerbiLinkType === 'quick-create' ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={quickCreateLoading}
                  onClick={launchQuickCreate}
                >
                  {quickCreateLoading ? 'Opening Power BI...' : 'Transform Data in Power BI'}
                </Button>
              ) : (
              <Button size="sm" variant="primary" onClick={async () => {
                // sanitize and extract src
                const s = (powerbiInput || '').trim();
                const extract = (v: string) => {
                  if (!v) return null;
                  const t = v.trim();
                  if (t.startsWith('<iframe') || /<iframe/i.test(t)) {
                    const m = t.match(/src\s*=\s*"([^"]+)"/) || t.match(/src\s*=\s*'([^']+)'/) || t.match(/src\s*=\s*([^\s>]+)/);
                    if (m && m[1]) return m[1];
                  }
                  return t;
                };
                const url = extract(s);
                if (!url || !/^https?:\/\//i.test(url)) { swalError('Invalid URL', 'Please provide a valid http/https Power BI embed URL or iframe.'); return; }
                try {
                  setPowerbiSaving(true);
                  const res = await fetch(`/api/admin/activities/${activity.id}/powerbi`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ powerbi_link: url, powerbi_url: url, link_type: powerbiLinkType || null, mode: powerbiMode || null }) });
                  if (!res.ok) { const txt = await res.text().catch(() => ''); swalError('Save failed', txt || 'Unable to save Power BI configuration'); setPowerbiSaving(false); return; }
                  // refresh dashboard
                  const r = await fetch(`/api/activity_dashboard/${activityId}`, { credentials: 'include' });
                  if (r.ok) setData(await r.json());
                  setPowerbiModalOpen(false);
                  swalSuccess('Saved', 'Power BI configuration saved');
                } catch (e) { console.error(e); swalError('Save failed', 'Unable to save Power BI configuration'); }
                finally { setPowerbiSaving(false); }
              }}>Save</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {quickCreateOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white w-full max-w-7xl h-[90vh] rounded-lg shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h3 className="text-lg font-semibold">Power BI Quick Create</h3>
                <p className="text-xs text-gray-500">Live report generated from collected activity data</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setQuickCreateOpen(false)}>Close</Button>
            </div>
            <div
              ref={quickCreateContainerRef}
              className="flex-1 min-h-0"
              style={{ minHeight: '500px' }}
            />
          </div>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Interactive Stats</h2>
          <button
            type="button"
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
            onClick={() => setStatsSettingsModalOpen(true)}
            title="Configure interactive stats"
          >
            <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <p className="text-sm text-gray-500">Configured statistics appear below and persist for this activity.</p>

        {interactiveStats.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">No stats configured. Click the settings cog to add stats.</div>
        ) : (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {interactiveStats.map((stat, idx) => {
                const q = questions.find((q: any) => String(q.id) === stat.questionId);
                const result = statsResults[stat.statKey];
                return (
                  <div key={`${stat.statKey}-${idx}`} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs text-gray-600 font-medium">
                          {stat.aggregateType.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{q?.question_text || 'Unknown'}</div>
                        {stat.aggregateType === 'count' && stat.conditions.length > 0 && (
                          <div className="text-xs text-gray-500 mt-2">
                            WHERE {stat.conditions.map((c, cIdx) => {
                              const cq = questions.find((qq: any) => String(qq.id) === c.questionId);
                              return `${cIdx > 0 ? ' AND ' : ''}${cq?.question_text || c.questionId} ${c.operator} "${c.value}"`;
                            }).join('')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const nextStats = interactiveStats.filter(s => s.statKey !== stat.statKey);
                          setInteractiveStats(nextStats);
                          saveDashboardConfig(nextStats, { selectedQuestionIds, chartTypes });
                        }}
                        className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mt-3">{result}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Interactive Charts</h2>
          <button
            type="button"
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
            onClick={() => setChartsSettingsModalOpen(true)}
            title="Configure chart controls"
          >
            <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <p className="text-sm text-gray-500">Charts are interactive. Use the charts to explore distribution of collected answers.</p>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {questions.filter((q: any) => selectedQuestionIds.includes(String(q.id))).map((q: any) => {
            const answersForQ = (answersByQuestion[q.id] || []).map((a: any) => {
              // answer_value may be JSON; normalize to string
              let v = a.answer_value;
              if (v && typeof v === 'object') v = v.value ?? JSON.stringify(v);
              return v === null || typeof v === 'undefined' ? '—' : String(v);
            });
            // tally
            const counts: Record<string, number> = {};
            for (const v of answersForQ) counts[v] = (counts[v] || 0) + 1;
            const labels = Object.keys(counts).slice(0, 10);
            const data = {
              labels,
              datasets: [
                {
                  label: 'Responses',
                  data: labels.map(l => counts[l] || 0),
                  backgroundColor: 'rgba(37,99,235,0.6)'
                }
              ]
            };

            const chartType = chartTypes[String(q.id)] || 'bar';
            return (
              <div key={q.id} className="bg-white p-4 rounded shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">{q.question_text}</div>
                    <div className="text-xs text-gray-500">{q.question_helper}</div>
                  </div>
                  <div className="ml-4 text-sm">
                    <label className="text-xs text-gray-600 mr-2">Chart</label>
                    <select className="p-1 border rounded text-sm" value={chartType} onChange={e => setChartTypes(prev => ({ ...prev, [q.id]: e.target.value }))}>
                      <option value="bar">Bar</option>
                      <option value="column">Column (alias of Bar)</option>
                      <option value="stackedBar">Stacked Bar</option>
                      <option value="pie">Pie</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="scatter">Scatter</option>
                      <option value="table">Table</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-sm">Responses: {(answersByQuestion[q.id] || []).length}</div>
                  <div className="mt-2 h-44">
                    {chartType === 'bar' && <Bar data={data} options={{ responsive: true, maintainAspectRatio: false }} />}
                    {chartType === 'column' && <Bar data={data} options={{ responsive: true, maintainAspectRatio: false }} />}
                    {chartType === 'stackedBar' && <Bar data={data} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } }, scales: { x: { stacked: true }, y: { stacked: true } } }} />}
                    {chartType === 'pie' && <Pie data={{ labels: data.labels, datasets: [{ data: data.datasets[0].data, backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] }] }} options={{ responsive: true, maintainAspectRatio: false }} />}
                    {chartType === 'line' && <Line data={{ labels: data.labels, datasets: [{ label: 'Responses', data: data.datasets[0].data, fill: false, borderColor: 'rgba(37,99,235,0.8)' }] }} options={{ responsive: true, maintainAspectRatio: false }} />}
                    {chartType === 'area' && <Line data={{ labels: data.labels, datasets: [{ label: 'Responses', data: data.datasets[0].data, fill: true, backgroundColor: 'rgba(37,99,235,0.2)', borderColor: 'rgba(37,99,235,0.8)' }] }} options={{ responsive: true, maintainAspectRatio: false }} />}
                    {chartType === 'scatter' && (() => {
                      const scatterPoints = data.labels.map((lbl: any, i: number) => ({ x: i + 1, y: data.datasets[0].data[i] }));
                      const scatterData = { datasets: [{ label: 'Responses (scatter)', data: scatterPoints, backgroundColor: 'rgba(37,99,235,0.7)' }] };
                      const scatterOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Category (index)' } }, y: { title: { display: true, text: 'Count' } } } };
                      return <Scatter data={scatterData} options={scatterOptions} />;
                    })()}
                    {chartType === 'table' && (
                      <div className="overflow-auto max-h-44 border rounded p-2 bg-gray-50">
                        <table className="min-w-full text-sm">
                          <thead><tr><th className="text-left">Value</th><th className="text-right">Count</th></tr></thead>
                          <tbody>
                            {data.labels.map((l: any, idx: number) => (
                              <tr key={l}><td>{l}</td><td className="text-right">{data.datasets[0].data[idx]}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Power BI</h2>
        <p className="text-sm text-gray-500">Embed your Power BI report here (iframe) or connect external dashboard.</p>
        <div className="mt-4">
          <div className="flex items-center justify-end mb-2">
            <Button variant="secondary" size="sm" onClick={() => { setPowerbiInput(activity.powerbi_url || ''); setPowerbiLinkType(activity.powerbi_link_type || null); setPowerbiMode(activity.powerbi_mode || null); setPowerbiModalOpen(true); }}>Configure Power BI</Button>
          </div>
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
            const raw = activity.powerbi_url;
            const url = extractUrlFromIframe(raw);
            if (!url || !/^https?:\/\//i.test(url)) {
              return <div className="text-sm text-red-500">No valid Power BI embed URL saved for this activity.</div>;
            }
            return <iframe title="PowerBI" src={url} style={{ width: '100%', height: 300, border: 'none' }} />;
          })()}
        </div>
      </Card>

      <AIAssistantDashboard activityId={activityId!} currentUser={currentUser} />

      {statsSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white w-11/12 max-w-4xl p-6 rounded shadow-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Interactive Stats Settings</h3>
              <Button size="sm" variant="secondary" onClick={() => setStatsSettingsModalOpen(false)}>Close</Button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aggregate Type</label>
                  <select
                    value={selectedStatAggregateType}
                    onChange={(e) => {
                      setSelectedStatAggregateType(e.target.value);
                      if (e.target.value !== 'count') setSelectedStatConditions([]);
                    }}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Choose aggregate type...</option>
                    <option value="count">Count</option>
                    <option value="sum">Sum</option>
                    <option value="average">Average</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                    <option value="median">Median</option>
                    <option value="std_dev">Std Dev</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Question</label>
                  <select
                    value={selectedStatQuestion}
                    onChange={(e) => setSelectedStatQuestion(e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Choose a question...</option>
                    {questions.map((q: any) => (
                      <option key={q.id} value={q.id}>{q.question_text}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                {selectedStatAggregateType === 'count' && (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Where (optional)</label>
                    {selectedStatConditions.length === 0 && (
                      <div className="text-xs text-gray-500 mb-2">No filters. Count will include all collected responses.</div>
                    )}
                    <div className="space-y-2">
                      {selectedStatConditions.map((condition, idx) => {
                        const valueOptions = condition.questionId ? getDistinctResponsesByQuestion(condition.questionId) : [];
                        return (
                          <div key={condition.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                            <div className="md:col-span-5">
                              <label className="block text-xs text-gray-500 mb-1">{idx === 0 ? 'Question' : 'And Question'}</label>
                              <select
                                value={condition.questionId}
                                onChange={(e) => handleConditionChange(condition.id, { questionId: e.target.value })}
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="">Choose question...</option>
                                {questions.map((q: any) => (
                                  <option key={q.id} value={q.id}>{q.question_text}</option>
                                ))}
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">Operator</label>
                              <select
                                value={condition.operator}
                                onChange={(e) => handleConditionChange(condition.id, { operator: e.target.value })}
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="==">==</option>
                                <option value="===">===</option>
                                <option value="!=">!=</option>
                                <option value="!==">!==</option>
                                <option value=">">{'>'}</option>
                                <option value=">=">{'>='}</option>
                                <option value="<">{'<'}</option>
                                <option value="<=">{'<='}</option>
                                <option value="contains">contains</option>
                                <option value="not_contains">not contains</option>
                              </select>
                            </div>
                            <div className="md:col-span-4">
                              <label className="block text-xs text-gray-500 mb-1">Response Value</label>
                              {condition.isCustomValue ? (
                                <input
                                  type="text"
                                  value={condition.value}
                                  onChange={(e) => handleConditionChange(condition.id, { value: e.target.value })}
                                  placeholder="Enter a custom value..."
                                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                              ) : (
                                <select
                                  value={condition.value}
                                  onChange={(e) => {
                                    if (e.target.value === '__custom__') {
                                      handleConditionChange(condition.id, { isCustomValue: true, value: '' });
                                    } else {
                                      handleConditionChange(condition.id, { isCustomValue: false, value: e.target.value });
                                    }
                                  }}
                                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  disabled={!condition.questionId}
                                >
                                  <option value="__custom__">Custom value</option>
                                  <option value="">Choose response...</option>
                                  {valueOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}
                              {condition.isCustomValue && (
                                <button
                                  type="button"
                                  className="mt-1 text-xs text-primary-600 hover:text-primary-800"
                                  onClick={() => handleConditionChange(condition.id, { isCustomValue: false, value: '' })}
                                >
                                  Choose from responses
                                </button>
                              )}
                            </div>
                            <div className="md:col-span-1">
                              <button
                                type="button"
                                className="w-full px-2 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50"
                                onClick={() => handleRemoveCondition(condition.id)}
                                title="Remove condition"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleAddCondition}
                        className="px-3 py-2 border border-primary-300 text-primary-700 rounded hover:bg-primary-50 font-medium text-sm"
                      >
                        Add More Conditions
                      </button>
                    </div>
                  </>
                )}
                {selectedStatAggregateType && selectedStatAggregateType !== 'count' && (
                  <div className="text-xs text-gray-500">
                    WHERE is not used for {selectedStatAggregateType}. The result uses all responses for the selected question.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleAddStatClick}
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 font-medium text-sm"
                >
                  Add Stat
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={dashboardConfigSaving}
                  onClick={() => saveDashboardConfig(interactiveStats, { selectedQuestionIds, chartTypes })}
                >
                  {dashboardConfigSaving ? 'Saving...' : 'Save Stats Config'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {chartsSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white w-11/12 max-w-3xl p-6 rounded shadow-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Chart Controls</h3>
              <Button size="sm" variant="secondary" onClick={() => setChartsSettingsModalOpen(false)}>Close</Button>
            </div>
            <p className="text-sm text-gray-500">Select which questions to include in charts.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border p-3 rounded">
              {questions.map((q: any) => (
                <label key={q.id} className="text-sm">
                  <input type="checkbox" checked={selectedQuestionIds.includes(String(q.id))} onChange={(e) => {
                    const id = String(q.id);
                    setSelectedQuestionIds(prev => e.target.checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id));
                  }} />
                  <span className="ml-2">{q.question_text}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                disabled={dashboardConfigSaving}
                onClick={() => saveDashboardConfig(interactiveStats, { selectedQuestionIds, chartTypes })}
              >
                {dashboardConfigSaving ? 'Saving...' : 'Save Chart Config'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold mb-2">All Collected Reports</h2>
        {/* DataTable with column-level filter */}
        {(() => {
          const columns = [
            { key: 'id', label: 'Report ID' },
            { key: 'submission_date', label: 'Submitted' },
            { key: 'facility_id', label: 'Facility' },
            { key: 'user_id', label: 'User' },
            { key: 'status', label: 'Status' },
            { key: 'reviewers_report', label: "Reviewer's Report" },
            {
              key: 'actions', label: 'Actions', render: (row: any) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/reports/${row.__raw.id}`)}>View</Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    const base = `/activities/fill/${activity.id}`;
                    const params = new URLSearchParams();
                    params.set('reportId', String(row.__raw.id));
                    if ((activity.response_type || activity.responseType || '').toString().toLowerCase() === 'facility') {
                      params.set('facilityId', String(row.__raw.facility_id || row.__raw.facilityId || ''));
                    } else if ((activity.response_type || activity.responseType || '').toString().toLowerCase() === 'user') {
                      params.set('userId', String(row.__raw.user_id || row.__raw.userId || ''));
                    }
                    navigate(`${base}?${params.toString()}`);
                  }}>Edit</Button>
                  {isAdmin && (
                    <Button size="sm" variant="danger" onClick={async () => {
                      const ok = await confirm({ title: 'Delete report?', text: `Permanently delete report ${row.id}?` });
                      if (!ok) return;
                      try {
                        const resp = await fetch(`/api/reports/${row.__raw.id}`, { method: 'DELETE', credentials: 'include' });
                        if (resp.ok) {
                          const r = await fetch(`/api/activity_dashboard/${activityId}`, { credentials: 'include' });
                          if (r.ok) setData(await r.json());
                          swalSuccess('Deleted', 'Report deleted');
                        } else {
                          const txt = await resp.text().catch(() => ''); swalError('Delete failed', txt || 'Unable to delete report');
                        }
                      } catch (e) { console.error(e); swalError('Delete failed', 'Unable to delete report'); }
                    }}>Delete</Button>
                  )}
                </div>
              )
            },
          ];
          const data = reports.map((r: any) => ({
            id: r.id,
            submission_date: new Date(r.submission_date).toLocaleString(),
            facility_id: (r.facility_id ? (facilitiesMap[String(r.facility_id)] || r.facility_id) : '—'),
            user_id: (r.user_id ? (usersMap[String(r.user_id)] || r.user_id) : '—'),
            status: r.status || '—',
            reviewers_report: stripHtml(r.reviewers_report),
            __raw: r,
          }));
          return <DataTable columns={columns} data={data} onCellEdit={undefined} />;
        })()}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Uploaded Files</h2>
        {uploadedDocs.length === 0 && <div className="text-sm text-gray-500">No uploaded files.</div>}
        {uploadedDocs.map((d: any) => (
          <div key={d.id} className="mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{d.filename || 'Uploaded file'}</div>
                <div className="text-xs text-gray-500">Uploaded: {new Date(d.created_at).toLocaleString()}</div>
                {d.facility_name && <div className="text-xs text-gray-600">Facility: {d.facility_name}</div>}
                {d.user_first_name && <div className="text-xs text-gray-600">User: {d.user_first_name} {d.user_last_name}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => { setSelectedDoc(d); setFileSearch(''); setFileModalOpen(true); }}>View</Button>
                <Button size="sm" variant="secondary" onClick={async () => {
                  // download as excel
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
                  a.download = (d.filename ? d.filename.replace(/\.[^.]+$/, '') : 'uploaded_file') + '.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
                }}>Download</Button>
                {isAdmin && (
                  <Button size="sm" variant="danger" onClick={async () => {
                    const ok = await confirm({ title: 'Delete uploaded file?', text: 'This will permanently remove the uploaded file.' });
                    if (!ok) return;
                    try {
                      const res = await fetch(`/api/uploaded_docs/${d.id}`, { method: 'DELETE', credentials: 'include' });
                      if (res.ok) {
                        // refresh dashboard data
                        const r = await fetch(`/api/activity_dashboard/${activityId}`, { credentials: 'include' });
                        if (r.ok) {
                          setData(await r.json());
                          swalSuccess('Deleted', 'Uploaded file deleted');
                        }
                      } else {
                        const txt = await res.text().catch(() => '');
                        swalError('Delete failed', txt || 'Unable to delete the uploaded file');
                      }
                    } catch (e) { console.error(e); swalError('Delete failed', 'Unable to delete the uploaded file'); }
                  }}>Delete</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* File Modal */}
      {fileModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white w-11/12 max-w-4xl p-6 rounded shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{selectedDoc.filename}</h3>
              <div className="flex items-center gap-2">
                <input className="border p-2 rounded text-sm" placeholder="Search..." value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
                <button className="px-3 py-1 bg-gray-100 rounded" onClick={() => setFileModalOpen(false)}>Close</button>
              </div>
            </div>
            <div className="overflow-auto max-h-96">
              {(() => {
                const rows = Array.isArray(selectedDoc.file_content) ? selectedDoc.file_content : [];
                if (rows.length === 0) return <div className="text-sm text-gray-500">No data</div>;
                const colsSet = new Set<string>();
                rows.forEach((r: any) => Object.keys(r || {}).forEach(k => colsSet.add(k)));
                const cols = Array.from(colsSet).map(c => ({ key: c, label: c }));
                const filtered = rows.filter((r: any) => {
                  if (!fileSearch) return true;
                  const s = fileSearch.toLowerCase();
                  return Object.values(r || {}).some((v: any) => String(v || '').toLowerCase().includes(s));
                });
                return <DataTable columns={cols} data={filtered} onCellEdit={undefined} />;
              })()}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 bg-gray-100 rounded" onClick={async () => {
                // download
                const ExcelJS = await import('exceljs');
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Sheet1');
                const rows = Array.isArray(selectedDoc.file_content) ? selectedDoc.file_content : [];
                if (rows.length > 0) {
                  worksheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key }));
                  worksheet.addRows(rows);
                }
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = (selectedDoc.filename ? selectedDoc.filename.replace(/\.[^.]+$/, '') : 'uploaded_file') + '.xlsx';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
              }}>Download Excel</button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setFileModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold mb-2">Data Quality Followups</h2>
        <p className="text-sm text-gray-500">Manage followups for questions created during data collection.</p>
        <div className="mt-4">
          <Button onClick={() => navigate(`/activities/${activityId}/followups`)}>Open Followups Page</Button>
        </div>
      </Card>
    </div>
  );
};

export default ActivityDashboardPage;

