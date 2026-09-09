'use client';

import React from 'react';
import { DynamicRuleSchema, DynamicRuleField } from '@/lib/rules/default-checklist-config';
import { Info, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { GovTooltip } from '../atoms/GovTooltip';

interface DynamicRuleEngineProps {
  schema: DynamicRuleSchema;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onBulkChange?: (values: Record<string, any>) => void;
}

export const DynamicRuleEngine: React.FC<DynamicRuleEngineProps> = ({
  schema,
  values,
  onChange,
}) => {
  const evaluateDependency = (field: DynamicRuleField): boolean => {
    if (!field.dependsOn) return true;

    const { field: targetField, operator, value: targetVal } = field.dependsOn;
    const parentValue = values[targetField];

    switch (operator) {
      case 'truthy':
        return Boolean(parentValue);
      case 'falsy':
        return !parentValue;
      case 'equals':
        return parentValue === targetVal;
      case 'not_equals':
        return parentValue !== targetVal;
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Schema Header Metadata */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gov-navy text-white flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-gov-navy dark:text-sky-300">
              {schema.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{schema.authority}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold">
            Schema v{schema.version}
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Statutory Rule Engine Active
          </span>
        </div>
      </div>

      {/* Checklist Sections */}
      {schema.sections.map((section, sIdx) => (
        <div
          key={section.sectionId}
          className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-govCard space-y-4"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-base font-extrabold text-gov-navy dark:text-sky-300">
              {section.sectionTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {section.description}
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {section.fields.map((field) => {
              const isVisible = evaluateDependency(field);
              if (!isVisible) return null;

              const currentValue = values[field.key];

              return (
                <div
                  key={field.key}
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center">
                      <span>{field.label}</span>
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.helpText && (
                        <GovTooltip
                          content={field.helpText}
                          title="Statutory Requirement"
                          securityNotice="Audited by Central Election Commission Rules."
                        />
                      )}
                    </label>

                    {field.dependsOn && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        Conditional Trigger
                      </span>
                    )}
                  </div>

                  {/* Field Control Renderers */}
                  <div className="pt-1">
                    {field.type === 'boolean' && (
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(currentValue)}
                          onChange={(e) => onChange(field.key, e.target.checked)}
                          className="w-5 h-5 rounded-lg border-slate-300 text-gov-navy focus:ring-gov-navy dark:bg-slate-800 cursor-pointer"
                        />
                        <span
                          className={`text-xs font-bold ${
                            currentValue
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {currentValue ? 'CONFIRMED / YES' : 'NOT VERIFIED / NO'}
                        </span>
                      </label>
                    )}

                    {field.type === 'select' && (
                      <select
                        value={currentValue || ''}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        className="w-full text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gov-navy dark:focus:ring-sky-400"
                      >
                        <option value="">-- Select Statutory Verdict --</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === 'radio' && (
                      <div className="space-y-2">
                        {field.options?.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              currentValue === opt.value
                                ? 'bg-gov-blueLight dark:bg-slate-800 border-gov-navy dark:border-sky-400 text-gov-navy dark:text-sky-300 font-bold shadow-sm'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name={field.key}
                              value={opt.value}
                              checked={currentValue === opt.value}
                              onChange={(e) => onChange(field.key, e.target.value)}
                              className="text-gov-navy dark:text-sky-400 focus:ring-gov-navy"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={currentValue || ''}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        placeholder="Enter observation notes..."
                        className="w-full text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gov-navy dark:focus:ring-sky-400"
                      />
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        rows={3}
                        value={currentValue || ''}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        placeholder="Enter formal statutory remarks..."
                        className="w-full text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 p-3 focus:outline-none focus:ring-2 focus:ring-gov-navy dark:focus:ring-sky-400"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
