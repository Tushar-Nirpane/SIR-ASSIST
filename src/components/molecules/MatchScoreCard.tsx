'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { SearchMatchResult } from '@/lib/db/sqlite-indexeddb-engine';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { InteractionCard } from '../motion/InteractionCard';

interface MatchScoreCardProps {
  match: SearchMatchResult;
  isSelected?: boolean;
  onSelect?: (match: SearchMatchResult) => void;
  queryName?: string;
}

export const MatchScoreCard: React.FC<MatchScoreCardProps> = ({
  match,
  isSelected = false,
  onSelect,
}) => {
  const getScoreBadge = (score: number) => {
    if (score >= 90) {
      return (
        <Badge variant="emerald" icon={<CheckCircle2 className="w-3 h-3" />}>
          {score}% EXACT / PHONETIC
        </Badge>
      );
    }
    if (score >= 70) {
      return (
        <Badge variant="gold" icon={<AlertTriangle className="w-3 h-3" />}>
          {score}% SOUNDEX MATCH
        </Badge>
      );
    }
    return (
      <Badge variant="crimson" icon={<XCircle className="w-3 h-3" />}>
        {score}% PARTIAL MATCH
      </Badge>
    );
  };

  return (
    <InteractionCard
      onClick={() => onSelect?.(match)}
      className={`p-4 sm:p-5 rounded-2xl cursor-pointer shadow-govCard ${
        isSelected
          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-400/20'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-gov-navy dark:hover:border-sky-400'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {match.fullName}
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-gov-navy dark:text-sky-300 font-mono font-bold border border-slate-200 dark:border-slate-700">
              {match.epicNo}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            <span className="text-slate-400 dark:text-slate-500 font-medium">Relative:</span>{' '}
            <strong className="text-slate-700 dark:text-slate-200">{match.relativeName}</strong> (
            {match.relationType}) •{' '}
            <span className="text-slate-400 dark:text-slate-500 font-medium">Age:</span> {match.age} •{' '}
            <span className="text-slate-400 dark:text-slate-500 font-medium">Gender:</span> {match.gender}
          </p>
        </div>

        <div className="self-start sm:self-auto">{getScoreBadge(match.matchScore)}</div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span>
            <strong className="text-gov-navy dark:text-sky-300 font-semibold">Part:</strong>{' '}
            {match.partNo} (Sec {match.sectionNo})
          </span>
          <span>
            <strong className="text-gov-navy dark:text-sky-300 font-semibold">Serial:</strong> #
            {match.serialNo}
          </span>
          <span className="hidden md:inline">
            <strong className="text-slate-400 font-semibold">Soundex:</strong>{' '}
            <code className="text-gov-navy dark:text-sky-300 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              {match.soundexName}
            </code>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSelected ? (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-100/70 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl">
              <UserCheck className="w-4 h-4" /> Linkage Confirmed
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(match);
              }}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Select
            </Button>
          )}
        </div>
      </div>
    </InteractionCard>
  );
};
