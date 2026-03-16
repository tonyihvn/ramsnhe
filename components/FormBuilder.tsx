import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import Modal from './ui/Modal';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'date' | 'dropdown';
  required: boolean;
  options?: string[]; // For select/dropdown fields
  placeholder?: string;
  order: number;
  metadata?: Record<string, any>; // For storing field-specific metadata (dependencies, conditions, etc)
  showInList?: boolean; // Display field as column in facilities/users list
}

export interface FormSchema {
  id: string;
  name: string;
  formType: 'facility' | 'user'; // facility or user
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

interface FormBuilderProps {
  formType: 'facility' | 'user';
  title: string;
  description?: string;
  onSave: (schema: FormSchema) => Promise<void>;
  initialSchema?: FormSchema;
}

const FormBuilder: React.FC<FormBuilderProps> = ({
  formType,
  title,
  description,
  onSave,
  initialSchema
}) => {
  // Normalize fields to ensure showInList property exists
  const normalizedFields = (initialSchema?.fields || []).map(f => ({
    ...f,
    showInList: f.showInList ?? false
  }));
  
  const [fields, setFields] = useState<FormField[]>(normalizedFields);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<FormField['type']>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldShowInList, setFieldShowInList] = useState(false);
  const [saving, setSaving] = useState(false);

  // Handle when initialSchema changes
  useEffect(() => {
    if (initialSchema?.fields) {
      const normalized = initialSchema.fields.map(f => ({
        ...f,
        showInList: f.showInList ?? false
      }));
      setFields(normalized);
    }
  }, [initialSchema?.id]);

  const resetForm = () => {
    setEditingField(null);
    setFieldName('');
    setFieldLabel('');
    setFieldType('text');
    setFieldRequired(false);
    setFieldOptions('');
    setFieldPlaceholder('');
    setFieldShowInList(false);
  };

  const openAddField = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditField = (field: FormField) => {
    setEditingField(field);
    setFieldName(field.name);
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldOptions(field.options?.join('\n') || '');
    setFieldPlaceholder(field.placeholder || '');
    setFieldShowInList(field.showInList || false);
    setShowModal(true);
  };

  const addOrUpdateField = () => {
    if (!fieldName || !fieldLabel) {
      alert('Field name and label are required');
      return;
    }

    const options = fieldOptions
      .split('\n')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    const newField: FormField = {
      id: editingField?.id || `field_${Date.now()}`,
      name: fieldName,
      label: fieldLabel,
      type: fieldType,
      required: fieldRequired,
      options: options.length > 0 ? options : undefined,
      placeholder: fieldPlaceholder,
      order: editingField?.order ?? fields.length,
      showInList: fieldShowInList
    };

    if (editingField) {
      setFields(fields.map(f => f.id === editingField.id ? newField : f));
    } else {
      setFields([...fields, newField]);
    }

    setShowModal(false);
    resetForm();
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const moveFieldUp = (index: number) => {
    if (index > 0) {
      const newFields = [...fields];
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
      setFields(newFields.map((f, i) => ({ ...f, order: i })));
    }
  };

  const moveFieldDown = (index: number) => {
    if (index < fields.length - 1) {
      const newFields = [...fields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      setFields(newFields.map((f, i) => ({ ...f, order: i })));
    }
  };

  const handleSave = async () => {
    if (fields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    try {
      setSaving(true);
      // Ensure all fields have showInList property
      const normalizedFields = fields.map(f => ({
        ...f,
        showInList: f.showInList ?? false
      }));
      
      const schema: FormSchema = {
        id: initialSchema?.id || `schema_${formType}_${Date.now()}`,
        name: `${formType === 'facility' ? 'Facility' : 'User'} Form`,
        formType,
        fields: normalizedFields,
        createdAt: initialSchema?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSave(schema);
      alert('Form schema saved successfully!');
    } catch (error) {
      alert('Failed to save form schema: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Form Fields ({fields.length})</h4>

        {fields.length === 0 ? (
          <p className="text-gray-600 text-sm mb-4">No fields added yet. Click "Add Field" to start.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {fields.map((field, index) => (
              <div key={field.id} className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{field.label}</div>
                  <div className="text-xs text-gray-500">
                    Field: {field.name} | Type: {field.type} | Required: {field.required ? 'Yes' : 'No'}{field.showInList ? ' | Shows in List' : ''}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveFieldUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    title="Move up"
                  >
                    <ArrowUpIcon className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => moveFieldDown(index)}
                    disabled={index === fields.length - 1}
                    className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                    title="Move down"
                  >
                    <ArrowDownIcon className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => openEditField(field)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeField(field.id)}
                    className="p-1 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={openAddField}
            leftIcon={<PlusIcon className="h-4 w-4" />}
            className="text-sm"
          >
            Add Field
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || fields.length === 0}
            className="text-sm bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? 'Saving...' : 'Save Form Schema'}
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingField ? 'Edit Field' : 'Add New Field'}
        footer={
          <>
            <Button onClick={addOrUpdateField}>
              {editingField ? 'Update' : 'Add'} Field
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Field Name (e.g., facility_name)</label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="facility_name"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Field Label (e.g., Facility Name)</label>
            <input
              type="text"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="Facility Name"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Field Type</label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FormField['type'])}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="textarea">Textarea</option>
              <option value="date">Date</option>
              <option value="select">Select Dropdown</option>
              <option value="checkbox">Checkbox</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Placeholder Text</label>
            <input
              type="text"
              value={fieldPlaceholder}
              onChange={(e) => setFieldPlaceholder(e.target.value)}
              placeholder="Enter placeholder..."
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
            />
          </div>

          {(fieldType === 'select' || fieldType === 'dropdown') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Options (one per line)</label>
              <textarea
                value={fieldOptions}
                onChange={(e) => setFieldOptions(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={fieldRequired}
              onChange={(e) => setFieldRequired(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="required" className="ml-2 block text-sm text-gray-700">
              Required Field
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showInList"
              checked={fieldShowInList}
              onChange={(e) => setFieldShowInList(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="showInList" className="ml-2 block text-sm text-gray-700">
              Show as Column in List
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FormBuilder;
