import React, { useEffect, useRef } from 'react';

type Option = { value: string | number; label: string };

type Props = {
    id?: string;
    label?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'time' | 'textarea' | 'select' | 'file' | 'radio' | 'checkbox';
    value?: any;
    onChange?: (v: any) => void;
    options?: Option[];
    placeholder?: string;
    required?: boolean;
    rows?: number;
    name?: string;
    className?: string;
};

const MInput: React.FC<Props> = ({ id, label, type = 'text', value, onChange, options = [], placeholder, required, rows = 3, name, className }) => {
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Initialize selects and datepickers when options, value, or type change
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const M = require('materialize-css');
            if (rootRef.current) {
                // Initialize selects
                const selects = rootRef.current.querySelectorAll('select');
                selects.forEach((s) => {
                    // @ts-ignore
                    M.FormSelect.init(s);
                });
                // Initialize datepickers
                const datepickers = rootRef.current.querySelectorAll('input.datepicker');
                datepickers.forEach((d) => {
                    // @ts-ignore
                    M.Datepicker.init(d, {
                        format: 'yyyy-mm-dd',
                        autoClose: true,
                        showClearBtn: true,
                        defaultDate: value ? new Date(value) : undefined,
                        setDefaultDate: !!value,
                        onSelect: (date: Date) => {
                            if (onChange) onChange(date.toISOString().slice(0, 10));
                        },
                    });
                });
            }
            // update text fields so labels float
            if (M && typeof M.updateTextFields === 'function') M.updateTextFields();
        } catch (err) {
            // no-op
        }
    }, [options, value, type]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!onChange) return;
        if (type === 'file') {
            onChange((e as React.ChangeEvent<HTMLInputElement>).target.files);
        } else if (type === 'checkbox') {
            onChange((e as React.ChangeEvent<HTMLInputElement>).target.checked);
        } else {
            onChange(e.target.value);
        }
    };

    const inputId = id || name || `minput-${Math.random().toString(36).slice(2, 9)}`;

    if (type === 'textarea') {
        return (
            <div ref={rootRef} className={`input-field ${className || ''}`}>
                <textarea id={inputId} className="materialize-textarea" value={value ?? ''} onChange={handleChange} rows={rows} placeholder={placeholder} />
                {label && <label htmlFor={inputId}>{label}{required ? '*' : ''}</label>}
            </div>
        );
    }

    if (type === 'select') {
        return (
            <div ref={rootRef} className={`input-field ${className || ''}`}>
                <select id={inputId} value={value ?? ''} onChange={handleChange}>
                    <option value="" disabled>{placeholder ?? 'Choose an option'}</option>
                    {options.map((opt) => (
                        <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {label && <label htmlFor={inputId}>{label}{required ? '*' : ''}</label>}
            </div>
        );
    }

    if (type === 'file') {
        return (
            <div ref={rootRef} className={`file-field input-field ${className || ''}`}>
                <div className="btn">
                    <span>File</span>
                    <input id={inputId} type="file" onChange={handleChange} />
                </div>
                <div className="file-path-wrapper">
                    <input className="file-path validate" type="text" placeholder={placeholder} />
                </div>
                {label && <label htmlFor={inputId}>{label}{required ? '*' : ''}</label>}
            </div>
        );
    }

    if (type === 'radio' || type === 'checkbox') {
        return (
            <p>
                <label>
                    <input id={inputId} name={name} type={type} checked={!!value} onChange={handleChange} />
                    <span>{label}</span>
                </label>
            </p>
        );
    }

    // default input
    if (type === 'date') {
        return (
            <div ref={rootRef} className={`input-field ${className || ''}`}>
                <input id={inputId} type="text" value={value ?? ''} onChange={handleChange} placeholder={placeholder} className="datepicker validate" />
                {label && <label htmlFor={inputId}>{label}{required ? '*' : ''}</label>}
            </div>
        );
    }
    return (
        <div ref={rootRef} className={`input-field ${className || ''}`}>
            <input id={inputId} type={type} value={value ?? ''} onChange={handleChange} placeholder={placeholder} className="validate" />
            {label && <label htmlFor={inputId}>{label}{required ? '*' : ''}</label>}
        </div>
    );
};

export default MInput;
