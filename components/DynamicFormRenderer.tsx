import React, { useEffect, useState } from 'react';
import { FormSchema, FormField } from './FormBuilder';

interface DynamicFormRendererProps {
  formType: 'facility' | 'user';
  formData: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  onDependentFieldChange?: (fieldName: string, value: any) => void; // Called when a field changes that might affect other fields
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  formType,
  formData,
  onChange,
  onDependentFieldChange
}) => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [dependentFields, setDependentFields] = useState<Record<string, string[]>>({}); // field -> fields that depend on it

  useEffect(() => {
    loadFormSchema();
  }, [formType]);

  const loadFormSchema = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/form-schemas/${formType}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Normalize fields to ensure showInList property exists
        const normalizedData = {
          ...data,
          fields: (data.fields || []).map((f: any) => ({
            ...f,
            showInList: f.showInList ?? false
          }))
        };
        setSchema(normalizedData);
        
        // Build dependent fields map for dynamic loading
        const deps: Record<string, string[]> = {};
        if (normalizedData.fields) {
          normalizedData.fields.forEach((field: any) => {
            // Check if field has conditional loading logic
            if (field.metadata && field.metadata.dependsOn) {
              const dependsOn = field.metadata.dependsOn;
              if (!deps[dependsOn]) deps[dependsOn] = [];
              deps[dependsOn].push(field.name);
            }
          });
        }
        setDependentFields(deps);
      }
    } catch (error) {
      console.error('Failed to load form schema:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    onChange(fieldName, value);
    
    // Notify parent if this field has dependents
    if (dependentFields[fieldName]) {
      onDependentFieldChange?.(fieldName, value);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name];
    const baseClass = 'mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm';

    switch (field.type) {
      case 'text':
        return (
          <input
            key={field.id}
            type="text"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClass}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            key={field.id}
            type="number"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClass}
            required={field.required}
          />
        );

      case 'email':
        return (
          <input
            key={field.id}
            type="email"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClass}
            required={field.required}
          />
        );

      case 'phone':
        return (
          <input
            key={field.id}
            type="tel"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClass}
            required={field.required}
          />
        );

      case 'date':
        return (
          <input
            key={field.id}
            type="date"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClass}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            key={field.id}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClass}
            required={field.required}
            rows={3}
          />
        );

      case 'select':
      case 'dropdown':
        return (
          <select
            key={field.id}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClass}
            required={field.required}
          >
            <option value="">{field.placeholder || '-- Select --'}</option>
            {(field.options || []).map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label key={field.id} className="inline-flex items-center">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">{field.label}</span>
          </label>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-gray-600 text-sm">Loading form fields...</div>;
  }

  if (!schema || !schema.fields || schema.fields.length === 0) {
    return null; // Don't render if no custom fields defined
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="text-sm font-medium text-gray-700">Other Information</div>
      {schema.fields.map((field) => (
        <div key={field.id}>
          {field.type !== 'checkbox' && (
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {renderField(field)}
        </div>
      ))}
    </div>
  );
};

export default DynamicFormRenderer;
