import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useMockData } from '../hooks/useMockData';
import { FormDefinition, Question, AnswerType, UploadedFile, ActivityReport, Facility, User } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import MInput from '../components/ui/MInput';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import * as ExcelJS from 'exceljs';
import { filterOptionsByCondition } from '../utils/conditionEvaluator';

import { MapContainer, TileLayer, Marker, useMapEvents, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../hooks/useTheme';

// Fix default icon paths for Leaflet when bundled by Vite
const _iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href;
const _iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href;
const _shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href;
const DefaultIcon = L.icon({ iconUrl: _iconUrl as unknown as string, iconRetinaUrl: _iconRetinaUrl as unknown as string, shadowUrl: _shadowUrl as unknown as string, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const ClickableMap = ({ lat, lng, onChange }: { lat: number, lng: number, onChange: (lat: number, lng: number) => void }) => {
    const [pos, setPos] = useState<[number, number] | null>(lat && lng ? [lat, lng] : null);
    useMapEvents({
        click(e) {
            const p: [number, number] = [e.latlng.lat, e.latlng.lng];
            setPos(p);
            onChange(p[0], p[1]);
        }
    });
    return pos ? <Marker position={pos as any} /> : null;
};

const LocationMapPicker = ({ value, onChange, onClose, facilities, users }: { value: any, onChange: (lat: number, lng: number) => void, onClose: () => void, facilities: Facility[]; users: User[] }) => {
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);

    // Parse existing value if present (format: "lat,lng")
    React.useEffect(() => {
        if (value && typeof value === 'string') {
            const [parsedLat, parsedLng] = value.split(',').map(v => parseFloat(v));
            if (!isNaN(parsedLat)) setLat(parsedLat);
            if (!isNaN(parsedLng)) setLng(parsedLng);
        }
    }, [value]);

    const center: [number, number] = lat && lng ? [lat, lng] : [9.0820, 8.6753]; // Nigeria center fallback

    return (
        <div className="bg-gray-100 p-2 rounded">
            <div className="text-xs text-gray-600 mb-2 text-center">Click on the map to pick a location; hover facility/user markers to see names</div>
            <div style={{ height: 320 }} className="mb-2">
                <MapContainer center={center as any} zoom={6} style={{ height: '100%', width: '100%' }}>
                    {(() => {
                        const { settings } = (useTheme as any)();
                        const provider = (settings && (settings as any).defaultMapProvider) ? (settings as any).defaultMapProvider : 'leaflet';
                        const hereKey = (settings && (settings as any).hereApiKey) ? (settings as any).hereApiKey : null;
                        const googleKey = (settings && (settings as any).googleMapsApiKey) ? (settings as any).googleMapsApiKey : null;
                        const providers: any = {
                            leaflet: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors', subdomains: ['a', 'b', 'c'] },
                            osmand: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors (OsmAnd)', subdomains: ['a', 'b', 'c'] },
                            organic: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors (Organic Maps)', subdomains: ['a', 'b', 'c'] },
                            herewego: { url: hereKey ? `https://{s}.base.maps.ls.hereapi.com/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?apiKey=${hereKey}` : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© HERE', subdomains: ['1', '2', '3', '4'] },
                            google: { url: googleKey ? `https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleKey}` : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© Google', subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }
                        };
                        const cfg = providers[provider] || providers.leaflet;
                        return <TileLayer attribution={cfg.attribution} url={cfg.url} {...(cfg.subdomains ? { subdomains: cfg.subdomains } : {})} />;
                    })()}
                    {/* show existing facilities and users as markers with hover tooltips */}
                    {Array.isArray(facilities) && facilities.map((f) => {
                        if (!f || !f.location) return null;
                        const parts = String(f.location).split(',').map(p => parseFloat(p));
                        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
                        return (
                            <Marker key={`fac-${f.id}`} position={[parts[0], parts[1]] as any}>
                                <Tooltip direction="top" offset={[0, -10]}>{f.name}</Tooltip>
                            </Marker>
                        );
                    })}
                    {Array.isArray(users) && users.map((u) => {
                        if (!u || !u.location) return null;
                        const parts = String(u.location).split(',').map(p => parseFloat(p));
                        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
                        return (
                            <Marker key={`user-${u.id}`} position={[parts[0], parts[1]] as any}>
                                <Tooltip direction="top" offset={[0, -10]}>{u.firstName ? `${u.firstName} ${u.lastName || ''}` : u.email}</Tooltip>
                            </Marker>
                        );
                    })}
                    <ClickableMap lat={lat as any} lng={lng as any} onChange={(a, b) => { setLat(a); setLng(b); }} />
                </MapContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="number" placeholder="Latitude" value={lat ?? ''} onChange={(e) => setLat(parseFloat(e.target.value) || 0)} className="border border-gray-300 rounded px-2 py-1 text-sm" step="0.0000001" />
                <input type="number" placeholder="Longitude" value={lng ?? ''} onChange={(e) => setLng(parseFloat(e.target.value) || 0)} className="border border-gray-300 rounded px-2 py-1 text-sm" step="0.0000001" />
            </div>
            <div className="flex gap-2 justify-end">
                <button onClick={onClose} className="px-3 py-1 bg-gray-300 text-gray-800 text-sm rounded hover:bg-gray-400">Cancel</button>
                <button onClick={() => onChange(lat || 0, lng || 0)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Select Location</button>
            </div>
        </div>
    );
};

// Lightweight searchable select used when a question is marked searchable in the builder
const SearchableSelect: React.FC<{
    options: { value: any; label: string; score?: number }[];
    value: any;
    placeholder?: string;
    onChange: (val: any) => void;
    disabled?: boolean;
}> = ({ options, value, placeholder, onChange, disabled }) => {
    const [input, setInput] = React.useState<string>('');
    const [open, setOpen] = React.useState<boolean>(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('click', handle);
        return () => document.removeEventListener('click', handle);
    }, []);

    // Show label for current value
    React.useEffect(() => {
        const sel = options.find(o => String(o.value) === String(value));
        setInput(sel ? sel.label : '');
    }, [value, JSON.stringify(options)]);

    const filtered = (options || []).filter(o => String(o.label).toLowerCase().includes(String(input || '').toLowerCase()));

    return (
        <div ref={ref} className="relative">
            <input
                type="text"
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={placeholder || 'Type to filter...'}
                value={input}
                onChange={e => { setInput(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                disabled={(disabled as any) === true}
            />
            {open && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto bg-white border rounded shadow-lg">
                    {(filtered.length === 0) && <div className="p-2 text-xs text-gray-500">No matching options</div>}
                    {filtered.map((opt) => (
                        <div key={`${opt.value}-${opt.label}`} className="p-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => {
                            if (opt && opt.score !== undefined) onChange({ value: opt.value, score: Number(opt.score) });
                            else onChange(opt.value);
                            setInput(opt.label);
                            setOpen(false);
                        }}>{opt.label}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

const RenderQuestion = ({ question, value, onChange, facilities, users, disabled, allAnswers = {} }: { question: Question, value: any, onChange: (value: any) => void, facilities: Facility[]; users: User[]; disabled?: boolean; allAnswers?: Record<string, any> }) => {
    // Local state/hooks used by some input types (e.g. location picker)
    const [showLocationMap, setShowLocationMap] = useState(false);
    const handleLocationClick = () => setShowLocationMap(s => !s);

    switch (question.answerType) {
        case AnswerType.TEXT:
            return <MInput label={question.questionText} type="text" value={value || ''} onChange={onChange} disabled={!!disabled} />;
        case AnswerType.TEXTAREA:
            return <MInput label={question.questionText} type="textarea" value={value || ''} onChange={onChange} rows={4} disabled={!!disabled} />;
        case AnswerType.NUMBER:
            return <MInput label={question.questionText} type="number" value={value || ''} onChange={onChange} disabled={!!disabled} />;
        case AnswerType.DATE:
            return <MInput label={question.questionText} type="date" value={value || ''} onChange={onChange} disabled={!!disabled} />;
        case AnswerType.TIME:
            return <MInput label={question.questionText} type="time" value={value || ''} onChange={onChange} disabled={!!disabled} />;
        case AnswerType.DROPDOWN:
            const filteredOptions = filterOptionsByCondition(question.options || [], allAnswers);
            if (question.metadata && question.metadata.searchable) {
                return (
                    <SearchableSelect
                        options={filteredOptions.map(o => ({ value: o.value as any, label: o.label, score: o.score }))}
                        value={(value && typeof value === 'object' && 'value' in value) ? value.value : (value || '')}
                        onChange={(val: any) => {
                            if (val && typeof val === 'object' && 'value' in val) onChange(val);
                            else {
                                const sel = filteredOptions.find(o => String(o.value) === String(val));
                                if (sel && sel.score !== undefined) onChange({ value: val, score: Number(sel.score) });
                                else onChange(val);
                            }
                        }}
                        placeholder="Select..."
                        disabled={!!disabled}
                    />
                );
            }
            return (
                <MInput
                    label={question.questionText}
                    type="select"
                    value={(value && typeof value === 'object' && 'value' in value) ? value.value : (value || '')}
                    onChange={(val: any) => {
                        const sel = filteredOptions.find(o => String(o.value) === String(val));
                        if (sel && sel.score !== undefined) onChange({ value: val, score: Number(sel.score) });
                        else onChange(val);
                    }}
                    options={filteredOptions.map(o => ({ value: o.value as any, label: o.label }))}
                    placeholder="Select..."
                    disabled={!!disabled}
                />
            );
        case AnswerType.RADIO:
            const radioFilteredOptions = filterOptionsByCondition(question.options || [], allAnswers);
            return (
                <div>
                    {radioFilteredOptions?.map((opt) => (
                        <MInput
                            key={`${question.id}-radio-${opt.value}`}
                            type="radio"
                            name={question.id}
                            label={opt.label}
                            value={(() => { if (value && typeof value === 'object' && 'value' in value) return String(value.value) === String(opt.value); return String(value) === String(opt.value); })()}
                            onChange={(v) => {
                                if (opt && opt.score !== undefined) onChange({ value: opt.value, score: Number(opt.score) });
                                else onChange(opt.value);
                            }}
                            disabled={!!disabled}
                        />
                    ))}
                </div>
            );
        case AnswerType.CHECKBOX:
            const checkboxFilteredOptions = filterOptionsByCondition(question.options || [], allAnswers);
            const currentVals = Array.isArray(value) ? value : [];
            const handleCheck = (val: string, checked: boolean) => {
                if (checked) onChange([...currentVals, val]);
                else onChange(currentVals.filter((v: string) => v !== val));
            };
            return (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{question.questionText}</label>
                    {checkboxFilteredOptions?.map((opt) => (
                        <MInput key={`${question.id}-checkbox-${opt.value}`} type="checkbox" name={`${question.id}-${opt.value}`} label={opt.label} value={currentVals.includes(opt.value)} onChange={(v) => handleCheck(opt.value as string, v)} disabled={!!disabled} />
                    ))}
                </div>
            );
        case AnswerType.FILE:
            const allowed = question.metadata && Array.isArray(question.metadata.allowedFileTypes) ? question.metadata.allowedFileTypes.join(',') : undefined;
            const fileVal = value;
            const handleFile = (files: FileList | null) => {
                const f = files?.[0] || null;
                if (!f) return onChange(null);
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const dataUrl = ev.target?.result as string;
                    onChange({ filename: f.name, mimeType: f.type, dataUrl });
                };
                reader.readAsDataURL(f);
            };
            return (
                <div>
                    <MInput type="file" label={question.questionText} onChange={(files) => handleFile(files)} disabled={!!disabled} />
                    {fileVal && fileVal.dataUrl && fileVal.dataUrl !== '' && (
                        <div className="mt-2">
                            <div className="text-xs text-gray-500">Uploaded: {fileVal.filename}</div>
                            {fileVal.mimeType && fileVal.mimeType.startsWith('image/') && fileVal.dataUrl && (
                                <img src={fileVal.dataUrl} alt={fileVal.filename} className="mt-2 max-h-36 border rounded" />
                            )}
                        </div>
                    )}
                </div>
            );
        case AnswerType.COMPUTED:
            // Show computed/calculated value as read-only output.
            // If a function is present, try to invoke it safely to get the result; otherwise display the value as a string.
            let displayValue: any = value;
            if (typeof displayValue === 'function') {
                try {
                    const res = displayValue();
                    displayValue = (res === undefined || res === null) ? String(displayValue) : res;
                } catch (e) {
                    displayValue = String(displayValue);
                }
            }
            if (typeof displayValue === 'string' && /=>|function\s*\(/.test(displayValue)) {
                const after = displayValue.replace(/^[\s\S]*}\s*/, '').trim();
                if (after) {
                    if (/^-?\d+(?:\.\d+)?$/.test(after)) displayValue = Number(after);
                    else {
                        try { displayValue = JSON.parse(after); } catch (e) { displayValue = after; }
                    }
                } else {
                    displayValue = null;
                }
            }
            const isEmpty = displayValue === undefined || displayValue === null || displayValue === '';
            return (
                <div className="bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700">
                    <span className="font-semibold">{question.questionText}:</span>{' '}
                    <span>{isEmpty ? <span className="italic text-gray-400">(no value)</span> : String(displayValue)}</span>
                </div>
            );
        case AnswerType.PARAGRAPH:
            return (
                <div className="py-4 px-4 bg-blue-50 border border-blue-200 rounded-md prose prose-sm max-w-none">
                    <div
                        dangerouslySetInnerHTML={{ __html: question.metadata?.content || '' }}
                        className="text-gray-700 text-sm prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:font-bold prose-em:italic prose-li:text-gray-700"
                    />
                </div>
            );
        case AnswerType.LOCATION:
            return (
                <div>
                    <div className="flex gap-2 items-end">
                        <MInput
                            label={question.questionText}
                            type="text"
                            value={value || ''}
                            onChange={onChange}
                            placeholder="Click 'Pick on Map' to select location"
                            disabled={!!disabled}
                        />
                        <button
                            type="button"
                            onClick={handleLocationClick}
                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                            Pick on Map
                        </button>
                    </div>
                    {showLocationMap && (
                        <div className="mt-4 border border-gray-300 rounded overflow-hidden">
                            <LocationMapPicker
                                value={value}
                                onChange={(lat, lng) => {
                                    onChange(`${lat.toString()},${lng.toString()}`);
                                    setShowLocationMap(false);
                                }}
                                onClose={() => setShowLocationMap(false)}
                                facilities={facilities}
                                users={users}
                            />
                        </div>
                    )}
                </div>
            );
        default:
            return <p className="text-sm text-gray-500">Not supported</p>;
    }
};
import DataTable from '../components/ui/DataTable';

const EditableTable = ({ file, onUpdate }: { file: UploadedFile; onUpdate: (updatedFile: UploadedFile) => void }) => {
    // If this is a raw file (not parsed), just show file info
    if ((file as any).isRawFile) {
        return (
            <div>
                <h4 className="font-semibold text-lg mb-2">{file.fileName}</h4>
                <p className="text-sm text-gray-600">File uploaded as-is (not parsed). File will be available for download in the Uploaded Files section.</p>
            </div>
        );
    }

    if (!file.data || file.data.length === 0) {
        return <p className="text-gray-500">No data to display for {file.fileName}.</p>;
    }
    const set = new Set<string>();
    file.data.forEach(r => Object.keys(r).forEach(k => set.add(k)));
    const headers = Array.from(set);

    const columns = headers.map(h => ({ key: h, label: h, editable: true }));

    const handleCellEdit = (rowIndex: number, key: string, newValue: any) => {
        const newData = [...file.data];
        newData[rowIndex] = { ...newData[rowIndex], [key]: newValue };
        onUpdate({ ...file, data: newData });
    };

    return (
        <div>
            <h4 className="font-semibold text-lg mb-2">{file.fileName}</h4>
            <DataTable columns={columns} data={file.data} onCellEdit={handleCellEdit} />
        </div>
    );
};

interface FillFormPageProps {
    activityIdOverride?: string;
    standaloneMode?: boolean;
}

const FillFormPage: React.FC<FillFormPageProps> = ({ activityIdOverride, standaloneMode }) => {
    const { activityId: activityIdParam } = useParams<{ activityId: string }>();
    const history = useNavigate();
    const activityId = activityIdOverride || activityIdParam;
    const { getActivity, saveReport, currentUser, facilities, users, reports } = useMockData();
    const activity = getActivity(activityId || '');
    const formDef: FormDefinition | undefined = activity?.formDefinition;

    // Initialize all hooks BEFORE any conditional returns (required by React Rules of Hooks)
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [uploadToFolder, setUploadToFolder] = useState<boolean>(false);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [editingReport, setEditingReport] = useState<ActivityReport | undefined>(undefined);
    const [repeatRows, setRepeatRows] = useState<Record<string, any[]>>({});
    const [selectedFacilityId, setSelectedFacilityId] = useState<number | undefined>(currentUser?.facilityId || undefined);
    const [selectedUserId, setSelectedUserId] = useState<number | undefined>(currentUser?.id || undefined);
    const [pagePerms, setPagePerms] = useState<any[] | null>(null);

    const location = useLocation();
    const search = new URLSearchParams(location.search);
    const qReportId = search.get('reportId');

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    // Helper to derive a stable group key for a section.
    // Use explicit section.groupName when provided and non-empty; otherwise fall back to a stable id-based key.
    const getSectionGroupName = (s: any) => {
        try {
            const raw = s && s.groupName;
            if (raw !== undefined && raw !== null && String(raw).trim() !== '') return String(raw).trim();
        } catch (e) { /* ignore */ }
        return `__section_${String(s.id || s.name || Math.random()).replace(/\s+/g, '_')}`;
    };

    const updateRepeatRow = (groupName: string, rowIndex: number, questionId: string, value: any) => {
        setRepeatRows(prev => {
            const copy = { ...(prev || {}) };
            const rows = Array.isArray(copy[groupName]) ? [...copy[groupName]] : [];
            const row = { ...(rows[rowIndex] || {}) };
            row[questionId] = value;
            rows[rowIndex] = row;
            copy[groupName] = rows;
            return copy;
        });
    };

    const addRepeatRow = (groupName: string) => {
        setRepeatRows(prev => ({ ...(prev || {}), [groupName]: [...(prev[groupName] || []), {}] }));
    };

    const removeRepeatRow = (groupName: string, rowIndex: number) => {
        setRepeatRows(prev => {
            const copy = { ...(prev || {}) };
            const rows = Array.isArray(copy[groupName]) ? [...copy[groupName]] : [];
            if (rows.length <= 1) return copy; // keep at least one row
            rows.splice(rowIndex, 1);
            copy[groupName] = rows;
            return copy;
        });
    };

    // Helpers for computed fields
    const parseDate = (v: any): Date | null => {
        if (!v) return null;
        if (v instanceof Date) return v;
        const s = String(v);
        const d = new Date(s);
        if (isNaN(d.getTime())) return null;
        return d;
    };

    const age = (v: any): number | null => {
        const d = parseDate(v);
        if (!d) return null;
        const now = new Date();
        let yrs = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) yrs--;
        return yrs;
    };

    const diffDays = (a: any, b: any): number | null => {
        const da = parseDate(a);
        const db = parseDate(b);
        if (!da || !db) return null;
        const diff = Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const evaluateFormula = (formula: string, fieldMap: Record<string, any>) => {
        if (!formula || typeof formula !== 'string') return null;
        try {
            // First, resolve any cell references like report1_H_J1 from the fieldMap
            let processedFormula = formula;
            const cellRefPattern = /report\d+_[A-Z]{1,3}_[A-Z]+\d+/g;
            const cellMatches = formula.match(cellRefPattern) || [];

            for (const cellRef of cellMatches) {
                // Cell reference should be in fieldMap if it's available
                const cellValue = fieldMap[cellRef];
                // If found, replace with the value; if not found, try to use as-is
                if (cellValue !== undefined && cellValue !== null) {
                    // If numeric, use the number directly; otherwise wrap in quotes
                    const replacement = typeof cellValue === 'number' ? cellValue : JSON.stringify(cellValue);
                    processedFormula = processedFormula.replace(new RegExp('\\b' + cellRef + '\\b', 'g'), replacement);
                }
            }

            const varNames = Object.keys(fieldMap || {}).filter(n => !n.match(cellRefPattern));
            const args = varNames.map(n => {
                const v = fieldMap[n];
                // try to coerce numeric strings to numbers
                if (typeof v === 'string' && /^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
                return v;
            });
            // Provide helpers: age, parseDate, diffDays
            // Build function: function(...vars, age, parseDate, diffDays) { return <formula>; }
            // eslint-disable-next-line no-new-func
            const fn = new Function(...varNames, 'age', 'parseDate', 'diffDays', `try { return ${processedFormula}; } catch(e){ return null; }`);
            return fn(...args, age, parseDate, diffDays);
        } catch (err) {
            console.error('Error evaluating formula', formula, err);
            return null;
        }
    };

    // Redirect to login if not authenticated
    if (!currentUser && !standaloneMode) return <Navigate to="/login" replace />;

    // Recompute computed fields only when formDef changes or answers for non-computed fields change
    React.useEffect(() => {
        if (!formDef) return;
        // build fieldName -> value map from current answers (defensive guards in case formDef shape varies)
        const fieldMap: Record<string, any> = {};
        (formDef.pages || []).forEach(p => (p.sections || []).forEach(s => (s.questions || []).forEach(q => {
            if (q && q.fieldName) {
                fieldMap[q.fieldName] = answers[q.id];
            }
        })));

        // compute values for computed questions
        let updated: Record<string, any> | null = null;
        (formDef.pages || []).forEach(p => (p.sections || []).forEach(s => (s.questions || []).forEach(q => {
            if (!q) return;
            if (q.answerType === AnswerType.COMPUTED) {
                const formula = q.metadata && q.metadata.computedFormula;
                if (formula) {
                    const result = evaluateFormula(String(formula), fieldMap);
                    // set into updated map by question id if changed
                    if (result !== answers[q.id]) {
                        if (!updated) updated = { ...answers };
                        updated[q.id] = result;
                        // also update fieldMap so dependent computed fields can use it
                        if (q.fieldName) fieldMap[q.fieldName] = result;
                    }
                }
            }
        })));

        if (updated) {
            setAnswers(updated);
        }
        // Only run when formDef changes or non-computed answers change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formDef, JSON.stringify(Object.fromEntries(Object.entries(answers).filter(([k]) => {
        // Only include non-computed question answers in dependency
        if (!formDef) return true;
        for (const p of formDef.pages) for (const s of p.sections) for (const q of s.questions) if (q.id === k && q.answerType === AnswerType.COMPUTED) return false;
        return true;
    })))]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validate required fields
        const missing: string[] = [];
        if (formDef) {
            for (const p of formDef.pages) {
                for (const s of p.sections) {
                    for (const q of s.questions) {
                        if (q.required) {
                            const val = answers[q.id];
                            if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) {
                                missing.push(q.questionText || q.id);
                            }
                        }
                    }
                }
            }
        }
        if (missing.length > 0) {
            alert('Please answer required questions before proceeding:\n' + missing.join('\n'));
            return;
        }
        setFormSubmitted(true);
        window.scrollTo(0, 0);
    };

    // Fetch page permissions for current user's role (if available)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!currentUser || !currentUser.role) {
                    console.log('[PERM-LOAD] No current user or role');
                    return;
                }
                const roleName = String(currentUser.role || '').trim();
                if (!roleName) {
                    console.log('[PERM-LOAD] Role name is empty');
                    return;
                }
                console.log('[PERM-LOAD] Loading permissions for role:', roleName);
                const resp = await fetch(`/api/page_permissions?role=${encodeURIComponent(roleName)}`);
                if (!resp.ok) {
                    console.warn(`[PERM-LOAD] Failed to load (status ${resp.status})`);
                    return;
                }
                const j = await resp.json();
                console.log('[PERM-LOAD] ✓ Loaded permissions:', j);
                if (!cancelled) setPagePerms(j);
            } catch (e) {
                console.error('[PERM-LOAD] Error:', e);
            }
        })();
        return () => { cancelled = true; };
    }, [currentUser && currentUser.role]);

    const normalizePageKey = (k: string) => {
        if (!k) return k;
        // No normalization needed - we store literal page keys
        return k;
    };

    const hasPermissionFlag = (flag: 'can_view' | 'can_create' | 'can_edit' | 'can_delete', pageKey: string, sectionKey?: string) => {
        try {
            // Admins and super admins always see everything in the UI
            const role = currentUser && String(currentUser.role || '').toLowerCase();
            if (role === 'admin' || role === 'super-admin' || role === 'super_admin') return true;

            // If no permissions are configured, allow all access (default behavior)
            if (!pagePerms || pagePerms.length === 0) {
                console.log('[PERM] No PAGE_PERMISSIONS configured for this role, allowing all access');
                return true;
            }

            // Normalize the input section key to null if undefined
            const checkSectionKey = sectionKey ? String(sectionKey).trim() : null;
            const checkPageKey = pageKey ? String(pageKey).trim() : '';

            console.log(`[PERM] Checking ${flag} for pageKey="${checkPageKey}", sectionKey="${checkSectionKey}"`);

            // Find matching permission record
            for (const p of pagePerms) {
                const dbPageKey = String(p.page_key || '').trim();
                const dbSectionKey = p.section_key ? String(p.section_key).trim() : null;

                const pageKeyMatch = (dbPageKey === checkPageKey);
                const sectionKeyMatch = (dbSectionKey === checkSectionKey);

                if (pageKeyMatch && sectionKeyMatch) {
                    // Found a matching permission record - use its flag value
                    const hasFlag = !!p[flag];
                    console.log(`[PERM]   ✓ Found record: ${flag}=${hasFlag}`);
                    return hasFlag;
                }
            }

            // No matching record found - default to ALLOW
            // (only deny if a record exists with can_view=false)
            console.log(`[PERM]   ✗ No record found - defaulting to ALLOW`);
            return true;
        } catch (e) {
            console.error('[PERM] Exception:', e);
            return true;
        }
    };

    const handleFinalize = () => {
        // Enforce required linking field based on activity.responseType
        const respType = (activity.responseType || '').toString().toLowerCase();
        if (respType === 'facility' && !selectedFacilityId) {
            alert('This activity requires a Facility to be selected before finalizing.');
            return;
        }
        if (respType === 'user' && !selectedUserId) {
            alert('This activity requires a User to be selected before finalizing.');
            return;
        }

        (async () => {
            try {
                // Create the report first without embedding base64 file data so server returns an id
                const payloadBase: any = {
                    activityId: activityId,
                    userId: selectedUserId || currentUser?.id,
                    facilityId: selectedFacilityId || currentUser?.facilityId,
                    status: 'Pending',
                    answers: {}
                };
                // copy answers but strip out any dataUrl content so we can upload them separately
                const strippedAnswers: Record<string, any> = {};

                // Log the answers object for debugging
                console.log('[SUBMIT] Answers object keys:', Object.keys(answers));
                console.log('[SUBMIT] Full answers object:', JSON.stringify(answers, null, 2));

                // sanitize computed fields so we don't save function source code into DB
                const sanitizeComputedValue = (v: any) => {
                    if (v === undefined || v === null) return v;
                    if (typeof v === 'number' || typeof v === 'boolean') return v;
                    if (typeof v === 'function') {
                        try {
                            const res = v();
                            return res === undefined || res === null ? null : res;
                        } catch (e) { return null; }
                    }
                    if (typeof v === 'string' && /=>|function\s*\(/.test(v)) {
                        // extract trailing primitive after last closing brace
                        const after = v.replace(/^[\s\S]*}\s*/, '').trim();
                        if (after) {
                            if (/^-?\d+(?:\.\d+)?$/.test(after)) return Number(after);
                            try { return JSON.parse(after); } catch (e) { return after; }
                        }
                        return null;
                    }
                    return v;
                };
                const fileAnswerMap: Array<any> = [];
                for (const [qid, val] of Object.entries(answers)) {
                    console.log('[SUBMIT] Processing answer - qid:', qid, 'val:', val);
                    // narrow to any so we can safely access file-like properties
                    const vObj = val as any;
                    // if this question is computed, sanitize value
                    // find question metadata from formDef
                    try {
                        if (formDef) {
                            for (const p of formDef.pages) for (const s of p.sections) for (const q of s.questions) {
                                if (String(q.id) === String(qid) && q.answerType === AnswerType.COMPUTED) {
                                    // replace val with sanitized primitive
                                    // eslint-disable-next-line no-param-reassign
                                    // @ts-ignore
                                    // keep vObj as sanitized
                                    const sv = sanitizeComputedValue(vObj);
                                    // use sv as vObj for subsequent handling
                                    // but preserve object identity if file
                                    // assign back to variable used below
                                    // eslint-disable-next-line prefer-const
                                    // (we'll overwrite vObj variable)
                                }
                            }
                        }
                    } catch (e) { /* ignore */ }
                    if (vObj && typeof vObj === 'object' && (vObj.dataUrl || vObj.data)) {
                        // collect for upload after report is created
                        const filename = vObj.filename || vObj.name || `file_${Date.now()}`;
                        const mimeType = vObj.mimeType || vObj.type || '';
                        const dataUrl = vObj.dataUrl || vObj.data || '';
                        fileAnswerMap.push({ qid, filename, mimeType, dataUrl });
                        // leave a placeholder in answers
                        strippedAnswers[qid] = { filename };
                    } else {
                        // sanitize computed string values too
                        strippedAnswers[qid] = sanitizeComputedValue(val);
                    }
                }
                // Process repeatable section rows and include them under their groupName in answers
                for (const [gname, rows] of Object.entries(repeatRows || {})) {
                    if (!Array.isArray(rows)) continue;
                    const outRows: any[] = [];
                    rows.forEach((r, ri) => {
                        const outRow: Record<string, any> = {};
                        Object.entries(r || {}).forEach(([qid, val]) => {
                            const vObj = val as any;
                            if (vObj && typeof vObj === 'object' && (vObj.dataUrl || vObj.data)) {
                                const filename = vObj.filename || vObj.name || `file_${Date.now()}`;
                                const mimeType = vObj.mimeType || vObj.type || '';
                                const dataUrl = vObj.dataUrl || vObj.data || '';
                                // create a unique qid key for uploaded files so they can be updated later
                                fileAnswerMap.push({ groupName: gname, rowIndex: ri, qid, filename, mimeType, dataUrl });
                                outRow[qid] = { filename };
                            } else {
                                outRow[qid] = sanitizeComputedValue(val);
                            }
                        });
                        outRows.push(outRow);
                    });
                    strippedAnswers[gname] = outRows;
                }
                payloadBase.answers = strippedAnswers;

                // Include uploaded Excel/CSV files in the payload
                payloadBase.uploadedFiles = uploadedFiles.map(f => ({
                    filename: f.fileName || f.name || `file_${f.id}`,
                    data: f.data || [],
                    name: f.fileName || f.name || `file_${f.id}`
                }));

                // If editing an existing report, include the report ID so server performs an update instead of creating a duplicate
                if (editingReport && editingReport.id) {
                    payloadBase.id = editingReport.id;
                }

                // create or update report on server
                const createRes = await fetch('/api/reports', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadBase) });
                if (!createRes.ok) {
                    alert('Failed to ' + (editingReport ? 'update' : 'create') + ' report');
                    return;
                }
                const created = await createRes.json();
                const reportId = created.id || created.activity_reports_id || null;

                // upload any file answers to /api/review_uploads so they are written to disk and associated with the report
                const updatedAnswers = { ...strippedAnswers };
                for (const fa of fileAnswerMap) {
                    try {
                        const upRes = await fetch('/api/review_uploads', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId, filename: fa.filename, contentBase64: fa.dataUrl, mimeType: fa.mimeType }) });
                        if (upRes.ok) {
                            const uj = await upRes.json();
                            // If this file belongs to a repeatable row, place the returned url into the nested array
                            if (fa.groupName !== undefined && typeof fa.rowIndex === 'number') {
                                updatedAnswers[fa.groupName] = Array.isArray(updatedAnswers[fa.groupName]) ? updatedAnswers[fa.groupName] : [];
                                updatedAnswers[fa.groupName][fa.rowIndex] = updatedAnswers[fa.groupName][fa.rowIndex] || {};
                                updatedAnswers[fa.groupName][fa.rowIndex][fa.qid] = { url: uj.url, filename: fa.filename };
                            } else {
                                // replace placeholder with returned url for single answers
                                updatedAnswers[fa.qid] = { url: uj.url, filename: fa.filename };
                            }
                        } else {
                            if (fa.groupName !== undefined && typeof fa.rowIndex === 'number') {
                                updatedAnswers[fa.groupName] = Array.isArray(updatedAnswers[fa.groupName]) ? updatedAnswers[fa.groupName] : [];
                                updatedAnswers[fa.groupName][fa.rowIndex] = updatedAnswers[fa.groupName][fa.rowIndex] || {};
                                updatedAnswers[fa.groupName][fa.rowIndex][fa.qid] = { filename: fa.filename };
                            } else {
                                // leave placeholder filename if upload failed
                                updatedAnswers[fa.qid] = { filename: fa.filename };
                            }
                        }
                    } catch (e) {
                        console.error('File upload failed', e);
                        if (fa.groupName !== undefined && typeof fa.rowIndex === 'number') {
                            updatedAnswers[fa.groupName] = Array.isArray(updatedAnswers[fa.groupName]) ? updatedAnswers[fa.groupName] : [];
                            updatedAnswers[fa.groupName][fa.rowIndex] = updatedAnswers[fa.groupName][fa.rowIndex] || {};
                            updatedAnswers[fa.groupName][fa.rowIndex][fa.qid] = { filename: fa.filename };
                        } else {
                            updatedAnswers[fa.qid] = { filename: fa.filename };
                        }
                    }
                }

                // If we changed any answers to include URLs, send an update to the report
                try {
                    await fetch(`/api/reports/${reportId}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: updatedAnswers }) });
                } catch (e) { console.error('Failed to update report answers with uploaded file URLs', e); }

                alert('Data successfully submitted!');
                history('/reports');
            } catch (err) {
                console.error('Finalize error', err);
                alert('Failed to submit data');
            }
        })();
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            // also read a dataURL of the original file so we can upload raw file if requested
            const readerDataUrl = new FileReader();

            if (uploadToFolder) {
                // If uploading to folder (not parsing), just read as data URL
                readerDataUrl.onload = (ev2) => {
                    const dataUrl = ev2.target?.result as string;
                    setUploadedFiles(prev => [...prev, {
                        id: `file-${Date.now()}-${file.name}`,
                        fileName: file.name,
                        data: [], // no parsed data for raw files
                        rawDataUrl: dataUrl,
                        mimeType: file.type || undefined,
                        isRawFile: true // flag to indicate this is a raw file, not parsed
                    }]);
                };
                try { readerDataUrl.readAsDataURL(file); } catch (e) { /* ignore */ }
            } else {
                // Parse Excel files into tables
                reader.onload = async (evt) => {
                    try {
                        const buffer = evt.target?.result;
                        const workbook = new ExcelJS.Workbook();
                        await workbook.xlsx.load(buffer as ArrayBuffer);
                        const worksheet = workbook.worksheets[0];
                        const data: Record<string, any>[] = [];
                        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                            if (rowNumber === 1) return; // skip header
                            const rowData: Record<string, any> = {};
                            worksheet.getRow(1).eachCell((cell, colNumber) => {
                                rowData[cell.value as string] = row.getCell(colNumber).value;
                            });
                            data.push(rowData);
                        });
                        // read dataURL of original file in parallel so we can optionally upload raw file later
                        readerDataUrl.onload = (ev2) => {
                            const dataUrl = ev2.target?.result as string;
                            setUploadedFiles(prev => [...prev, {
                                id: `file-${Date.now()}-${file.name}`,
                                fileName: file.name,
                                data: data,
                                rawDataUrl: dataUrl,
                                mimeType: file.type || undefined
                            }]);
                        };
                        try { readerDataUrl.readAsDataURL(file); } catch (e) { /* ignore */ }
                    } catch (err) {
                        console.error("Error parsing file", err);
                        alert(`Could not parse ${file.name}. Please ensure it is a valid Excel file.`);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        });
    };

    const handleFileUpdate = (updatedFile: UploadedFile) => {
        setUploadedFiles(files => files.map(f => f.id === updatedFile.id ? updatedFile : f));
    };

    // If reportId supplied in query params, load existing report for editing
    React.useEffect(() => {
        if (!qReportId) return;
        if (!reports || reports.length === 0) return;
        const rpt = reports.find(r => String(r.id) === String(qReportId));
        if (!rpt) return;
        setEditingReport(rpt);
        // answers may be stored either as an object map or an array of { question_id, answer_value }
        const rawAnswers: any = rpt.answers || rpt.answer || {};
        if (Array.isArray(rawAnswers)) {
            const mapped: Record<string, any> = {};
            rawAnswers.forEach((a: any) => {
                const qid = a.question_id || a.questionId || a.questionId;
                const val = a.answer_value !== undefined ? a.answer_value : a.answer || a.value;
                if (qid) mapped[qid] = val;
            });
            setAnswers(mapped);
        } else {
            setAnswers(rawAnswers || {});
        }
        setUploadedFiles(rpt.uploadedFiles || rpt.uploaded_files || []);
        setSelectedFacilityId((rpt as any).facilityId || undefined);
        setSelectedUserId((rpt as any).userId || undefined);
        // initialize repeatRows from existing answers if any
        try {
            if (rpt && rpt.answers) {
                const a = rpt.answers as any;
                const rr: Record<string, any[]> = {};
                Object.keys(a).forEach(k => {
                    if (Array.isArray(a[k])) rr[k] = a[k];
                });
                setRepeatRows(rr);
            }
        } catch (e) { /* ignore */ }
    }, [qReportId, reports]);

    // Ensure there is at least one empty row for each repeatable section when formDef loads
    React.useEffect(() => {
        if (!formDef) return;
        setRepeatRows(prev => {
            const copy = { ...(prev || {}) };
            let changed = false;
            formDef.pages.forEach(p => p.sections.forEach(s => {
                if (s.isRepeatable) {
                    const g = getSectionGroupName(s);
                    if (!Array.isArray(copy[g]) || copy[g].length === 0) {
                        copy[g] = [{}];
                        changed = true;
                    }
                }
            }));
            return copy;
        });
    }, [formDef]);

    if (!activity) return <div>Activity not found.</div>;
    // Only allow filling if activity is Published
    if (!standaloneMode && String(activity.status || '').toLowerCase() !== 'published') {
        return <div className="p-6">This activity is not published. Form filling is disabled.</div>;
    }
    if (!formDef || !Array.isArray(formDef.pages) || formDef.pages.length === 0) {
        return <div className="p-6">This activity does not have a form built for it yet. Please contact the administrator.</div>;
    }

    // If editing an existing report that is Completed, do not allow edits for non-admins
    const isCompleted = editingReport && (String(editingReport.status || '').toLowerCase() === 'completed');
    const isAdmin = currentUser && (String(currentUser.role || '').toLowerCase() === 'admin' || String(currentUser.role || '').toLowerCase() === 'super-admin' || String(currentUser.role || '').toLowerCase() === 'super_admin');
    if (isCompleted && !isAdmin) {
        return (
            <Card>
                <h2 className="text-lg font-semibold">This response is completed</h2>
                <p className="text-sm text-gray-600 mt-2">This report has been marked as completed and cannot be edited.</p>
            </Card>
        );
    }

    // Filter pages and sections by permission at the top level
    const getPageKey = (pageId: string) => `/activities/fill/${activityId || ''}:page:${pageId}`;
    const visiblePages = formDef.pages.filter(page => {
        const pageKey = getPageKey(page.id);
        console.log(`[VISIBILITY] Page "${page.name}" (id=${page.id}), pageKey="${pageKey}", pagePerms=${pagePerms ? pagePerms.length : 0} records`);
        const viewAllowed = hasPermissionFlag('can_view', pageKey, null);
        console.log(`[VISIBILITY]   → can_view=${viewAllowed}`);
        return viewAllowed;
    });

    // If user has no visible pages, show access message
    if (visiblePages.length === 0) {
        return (
            <Card className="m-6 bg-yellow-50 border border-yellow-200">
                <div className="p-6 text-center">
                    <h2 className="text-lg font-semibold text-yellow-800 mb-2">No Accessible Pages</h2>
                    <p className="text-yellow-700 mb-4">You do not have permission to view any pages in this form.</p>
                    <Button onClick={() => history('/activities')} variant="secondary">Back to Activities</Button>
                </div>
            </Card>
        );
    }

    // Ensure activePageIndex is valid for visible pages
    const safeActivePageIndex = activePageIndex < visiblePages.length ? activePageIndex : 0;
    const currentPage = visiblePages[safeActivePageIndex] || visiblePages[0];

    return (
        <div className="space-y-6">
            {!standaloneMode && (
                <div className="flex items-center space-x-4">
                    <button onClick={() => history('/activities')} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Data Collection: {activity.title}</h1>
                </div>
            )}
            {standaloneMode && (
                <div className="flex items-center justify-center">
                    <h1 className="text-2xl font-bold text-gray-800">{activity.title}</h1>
                </div>
            )}

            {!formSubmitted ? (
                <Card>
                    <form onSubmit={handleSubmit}>
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                                {visiblePages.map((page, index) => (
                                    <button type="button" key={page.id} onClick={() => setActivePageIndex(index)} className={`${index === safeActivePageIndex ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                                        {page.name}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="mt-6 space-y-8">
                            {currentPage.sections.filter(section => {
                                const pageKey = getPageKey(currentPage.id);
                                const sectionAllowed = hasPermissionFlag('can_view', pageKey, section.id);
                                return sectionAllowed;
                            }).map(section => (
                                <div key={section.id} className="bg-gray-50 p-4 rounded-md">
                                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 border-gray-200">{section.name}</h3>
                                    <div className="mt-4 grid grid-cols-12 gap-6">
                                        {(() => {
                                            // build fieldName -> value map for visibility/computed evaluation
                                            const fieldMapLocal: Record<string, any> = {};
                                            (formDef.pages || []).forEach(p => (p.sections || []).forEach(s => (s.questions || []).forEach(qq => {
                                                if (qq && qq.fieldName) fieldMapLocal[qq.fieldName] = answers[qq.id];
                                            })));

                                            if (!section.isRepeatable) {
                                                return section.questions.map(q => {
                                                    // evaluate visibility condition if present
                                                    let visible = true;
                                                    try {
                                                        if (q.metadata && q.metadata.showIf) {
                                                            const res = evaluateFormula(String(q.metadata.showIf), fieldMapLocal);
                                                            visible = !!res;
                                                        }
                                                    } catch (e) {
                                                        console.error('Error evaluating showIf for question', q.id, e);
                                                        visible = true;
                                                    }
                                                    if (!visible) return null;

                                                    // proceed to render question
                                                    return (
                                                        (() => {
                                                            let colClass = 'col-span-12';
                                                            if (q.columnSize === 12) colClass = 'col-span-12';
                                                            else if (q.columnSize === 6) colClass = 'md:col-span-6 col-span-12';
                                                            else if (q.columnSize === 4) colClass = 'md:col-span-4 col-span-12';
                                                            else if (q.columnSize === 3) colClass = 'md:col-span-3 col-span-12';
                                                            else colClass = 'col-span-12';
                                                            // determine whether current role can create/edit in this section
                                                            const pageKey = getPageKey(currentPage.id);
                                                            const canCreateSection = hasPermissionFlag('can_create', pageKey, section.id);
                                                            const canEditSection = hasPermissionFlag('can_edit', pageKey, section.id);
                                                            const canInteract = editingReport ? canEditSection : canCreateSection;

                                                            return (
                                                                <div key={q.id} className={colClass}>
                                                                    {/* Render the question input; label is provided by the input component itself to avoid duplication */}
                                                                    {q.questionHelper && q.answerType !== AnswerType.PARAGRAPH && <p className="text-xs text-gray-500 mb-1">{q.questionHelper}</p>}
                                                                    <RenderQuestion question={q} value={answers[q.id]} onChange={(val) => handleAnswerChange(q.id, val)} facilities={facilities} users={users} disabled={!canInteract} allAnswers={answers} />
                                                                    {/* Show reviewer comment field below if enabled (but not for paragraph elements) */}
                                                                    {q.answerType !== AnswerType.PARAGRAPH && q.metadata && q.metadata.displayReviewersComment && (
                                                                        <div className="mt-2">
                                                                            <label className="block text-xs text-gray-600 mb-1">{q.metadata.reviewerCommentLabel || "Reviewer's Comment"}</label>
                                                                            <MInput
                                                                                type="textarea"
                                                                                value={answers[`${q.id}_reviewers_comment`] || ''}
                                                                                onChange={val => handleAnswerChange(`${q.id}_reviewers_comment`, val)}
                                                                                rows={2}
                                                                                placeholder={q.metadata.reviewerCommentLabel || "Reviewer's Comment"}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()
                                                    );
                                                });
                                            }

                                            // Repeatable section rendering — compute stable group key matching init logic
                                            const groupName = getSectionGroupName(section);
                                            const rows = Array.isArray(repeatRows[groupName]) ? repeatRows[groupName] : [{}];
                                            // determine section-level permissions for repeatable rows
                                            const pageKey = getPageKey(currentPage.id);
                                            const canCreateSection = hasPermissionFlag('can_create', pageKey, section.id);
                                            const canEditSection = hasPermissionFlag('can_edit', pageKey, section.id);
                                            const canInteract = editingReport ? canEditSection : canCreateSection;

                                            return rows.map((row, rowIndex) => (
                                                <div key={`repeat-${groupName}-${rowIndex}`} className="col-span-12 border rounded p-3 mb-3 bg-white">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="text-sm font-medium">{section.name} — Entry {rowIndex + 1}</div>
                                                        <div className="flex items-center gap-2">
                                                            <button type="button" onClick={() => removeRepeatRow(groupName, rowIndex)} className="text-sm text-red-600 hover:text-red-800">Remove</button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-12 gap-4">
                                                        {section.questions.map(q => {
                                                            // Create row-specific fieldMap for visibility evaluation in grouped questions
                                                            const rowFieldMap: Record<string, any> = { ...fieldMapLocal };
                                                            Object.keys(row).forEach(key => {
                                                                rowFieldMap[key] = row[key];
                                                            });

                                                            // visibility for repeated rows uses row-specific fieldMap
                                                            let visible = true;
                                                            try {
                                                                if (q.metadata && q.metadata.showIf) {
                                                                    const res = evaluateFormula(String(q.metadata.showIf), rowFieldMap);
                                                                    visible = !!res;
                                                                }
                                                            } catch (e) {
                                                                visible = true;
                                                            }
                                                            if (!visible) return null;
                                                            let colClass = 'col-span-12';
                                                            if (q.columnSize === 12) colClass = 'col-span-12';
                                                            else if (q.columnSize === 6) colClass = 'md:col-span-6 col-span-12';
                                                            else if (q.columnSize === 4) colClass = 'md:col-span-4 col-span-12';
                                                            else if (q.columnSize === 3) colClass = 'md:col-span-3 col-span-12';
                                                            return (
                                                                <div key={`${q.id}_${rowIndex}`} className={colClass}>
                                                                    {q.questionHelper && q.answerType !== AnswerType.PARAGRAPH && <p className="text-xs text-gray-500 mb-1">{q.questionHelper}</p>}
                                                                    <RenderQuestion question={q} value={row[q.id]} onChange={(val) => updateRepeatRow(groupName, rowIndex, q.id, val)} facilities={facilities} users={users} disabled={!canInteract} allAnswers={row} />
                                                                    {q.answerType !== AnswerType.PARAGRAPH && q.metadata && q.metadata.displayReviewersComment && (
                                                                        <div className="mt-2">
                                                                            <label className="block text-xs text-gray-600 mb-1">{q.metadata.reviewerCommentLabel || "Reviewer's Comment"}</label>
                                                                            <MInput
                                                                                type="textarea"
                                                                                value={row[`${q.id}_reviewers_comment`] || ''}
                                                                                onChange={val => updateRepeatRow(groupName, rowIndex, `${q.id}_reviewers_comment`, val)}
                                                                                rows={2}
                                                                                placeholder={q.metadata.reviewerCommentLabel || "Reviewer's Comment"}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="mt-3 text-right">
                                                        <button type="button" onClick={() => addRepeatRow(groupName)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300">Add More</button>
                                                    </div>
                                                </div>
                                            ));
                                        })()}

                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-5 border-t border-gray-200">
                            <div className="flex justify-end space-x-3">
                                {activePageIndex > 0 && (
                                    <Button variant="secondary" onClick={e => { e.preventDefault(); setActivePageIndex(p => p - 1); }}>Previous Page</Button>
                                )}
                                {activePageIndex < formDef.pages.length - 1 ? (
                                    <Button onClick={e => { e.preventDefault(); setActivePageIndex(p => Math.min(p + 1, formDef.pages.length - 1)); }}>Next Page</Button>
                                ) : (
                                    <Button type="submit">Next: Upload Files</Button>
                                )}
                            </div>
                        </div>
                    </form>
                </Card>
            ) : (
                <Card title="Step 2: Upload Supporting Files & Review" action={<Button onClick={handleFinalize}>Finalize Submission</Button>}>
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-md">
                            <h3 className="text-sm font-medium text-blue-800">Form Data Saved</h3>
                            <p className="text-sm text-blue-700 mt-1">Your responses have been captured. You can now upload Excel or CSV files related to this activity. You can edit the data in the table below before final submission.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                                            <span>{uploadToFolder ? 'Upload Files' : 'Upload CSV or Excel'}</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept={uploadToFolder ? '*' : '.csv, .xlsx, .xls'} onChange={handleFileUpload} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500">{uploadToFolder ? 'Supports all file formats' : 'Supports .xlsx, .xls, .csv'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="inline-flex items-center">
                                <input type="checkbox" className="mr-2" checked={uploadToFolder} onChange={e => setUploadToFolder(e.target.checked)} />
                                <span className="text-sm text-gray-700">Upload files to server folder (do not parse into tables)</span>
                            </label>
                            <p className="text-xs text-gray-400">When checked, the selected Excel/CSV files will be uploaded as-is to the server and stored under the activity uploads folder.</p>
                        </div>

                        <div className="space-y-4">

                            <div>
                                {uploadedFiles.map(file => (
                                    <Card key={file.id} className="border border-gray-200 mb-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="mb-2">
                                                    <label className="block text-xs text-gray-600">File Title</label>
                                                    <input className="p-2 border rounded w-full" value={file.fileName || ''} onChange={e => setUploadedFiles(prev => prev.map(f => f.id === file.id ? { ...f, fileName: e.target.value } : f))} placeholder="Enter title for this file" />
                                                </div>
                                                <EditableTable file={file} onUpdate={handleFileUpdate} />
                                            </div>
                                            <div className="ml-4">
                                                {isAdmin && <button onClick={() => { if (confirm('Delete this uploaded file?')) setUploadedFiles(prev => prev.filter(f => f.id !== file.id)); }} className="text-red-600 hover:text-red-900 text-sm">Delete File</button>}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Link Entity</label>
                                <p className="text-xs text-gray-500 mb-2">Select the facility or user this response should be linked to (required for some activities).</p>
                                {String(activity.responseType || '').toLowerCase() === 'facility' ? (
                                    <select value={selectedFacilityId || ''} onChange={e => setSelectedFacilityId(e.target.value ? Number(e.target.value) : undefined)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                        <option value="">Select facility...</option>
                                        {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                ) : String(activity.responseType || '').toLowerCase() === 'user' ? (
                                    <select value={selectedUserId || ''} onChange={e => setSelectedUserId(e.target.value ? Number(e.target.value) : undefined)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                        <option value="">Select user...</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
                                    </select>
                                ) : (
                                    <div className="space-y-2">
                                        <select value={selectedFacilityId || ''} onChange={e => setSelectedFacilityId(e.target.value ? Number(e.target.value) : undefined)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                            <option value="">(Optional) Select facility...</option>
                                            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                        </select>
                                        <select value={selectedUserId || ''} onChange={e => setSelectedUserId(e.target.value ? Number(e.target.value) : undefined)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                            <option value="">(Optional) Select user...</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between border-t pt-4">
                            <Button variant="secondary" onClick={() => setFormSubmitted(false)}>Back to Form</Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default FillFormPage;