'use client';

import React, { useState, useEffect } from 'react';
import { Search, Database, UserX, ArrowRight, Cloud, WifiOff } from 'lucide-react';
import { legacyRollEngine, SearchMatchResult } from '@/lib/db/sqlite-indexeddb-engine';
import { searchLineage, LineageMatchItem } from '@/lib/api/sir-assist-client';
import { MatchScoreCard } from '../molecules/MatchScoreCard';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { useVerificationStore } from '@/stores/verificationStore';

interface LegacyMatchExplorerProps {
  onMatchConfirmed: (record: SearchMatchResult | null) => void;
}

/**
 * Map a backend LineageMatchItem → the SearchMatchResult shape that
 * MatchScoreCard expects (same as the offline IndexedDB engine returns).
 */
function apiMatchToLocal(item: LineageMatchItem, index: number): SearchMatchResult {
  return {
    id: `api-${item.legacy_record_id}`,
    fullName: item.elector_name,
    epicNo: `N/A`,
    relativeName: item.father_or_husband_name,
    relationType: 'FATHER' as const,
    age: 0,
    gender: 'O',
    partNo: item.polling_station_id ?? '',
    sectionNo: '',
    serialNo: 0,
    address: '',
    soundexName: '',
    metaphoneName: '',
    soundexRelative: '',
    matchScore: Math.round(item.confidence_score),
    nameDistance: Math.round((1 - item.match_basis.name_similarity) * 100),
    relativeDistance: item.match_basis.father_name_soundex_match ? 0 : 50,
    matchType: item.match_basis.father_name_soundex_match ? 'HIGH_PHONETIC' : 'FUZZY_NAME',
  };
}

export const LegacyMatchExplorer: React.FC<LegacyMatchExplorerProps> = ({ onMatchConfirmed }) => {
  const { manualSearchQuery, setManualSearchQuery, selectedLegacyRecord, setSelectedLegacyRecord } =
    useVerificationStore();

  const [matches, setMatches] = useState<SearchMatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalRecordsInDb, setTotalRecordsInDb] = useState(0);
  const [dataSource, setDataSource] = useState<'backend' | 'offline'>('backend');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [partFilter] = useState('');

  useEffect(() => {
    const initDb = async () => {
      // Always initialise the offline engine so it's ready as a fallback
      const count = await legacyRollEngine.initialize();
      setTotalRecordsInDb(count);
      runSearch();
    };
    initDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async () => {
    if (!manualSearchQuery.name && !manualSearchQuery.epic && !manualSearchQuery.relative) {
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // ── Primary: FastAPI backend ──────────────────────────────────────
      const apiResponse = await searchLineage({
        full_name: manualSearchQuery.name,
        father_or_husband_name: manualSearchQuery.relative || "",
        epic_number: manualSearchQuery.epic || undefined,
      });
      const apiMatches = apiResponse.matches.map(apiMatchToLocal);
      setMatches(apiMatches);
      setDataSource('backend');

      // Auto-select if top match >= 95
      if (!selectedLegacyRecord && apiMatches.length > 0 && apiMatches[0].matchScore >= 95) {
        setSelectedLegacyRecord(apiMatches[0]);
      }
    } catch {
      // ── Fallback: offline IndexedDB engine ────────────────────────────
      setDataSource('offline');
      setErrorMsg('Backend unreachable — searching local offline snapshot');
      try {
        const offlineResults = await legacyRollEngine.searchVoter({
          queryName: manualSearchQuery.name,
          queryEpic: manualSearchQuery.epic,
          queryRelative: manualSearchQuery.relative,
          partFilter,
          minScoreThreshold: 20,
        });
        setMatches(offlineResults);
        if (!selectedLegacyRecord && offlineResults.length > 0 && offlineResults[0].matchScore >= 95) {
          setSelectedLegacyRecord(offlineResults[0]);
        }
      } catch (offlineErr) {
        setErrorMsg('Search failed in both backend and offline store.');
        console.error(offlineErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRecord = (record: SearchMatchResult) => {
    setSelectedLegacyRecord(record);
  };

  const handleProceed = () => {
    onMatchConfirmed(selectedLegacyRecord);
  };

  const handleProceedWithoutMatch = () => {
    setSelectedLegacyRecord(null);
    onMatchConfirmed(null);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar & Query Controls */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gov-navy dark:text-sky-400" />
            <h3 className="text-sm font-extrabold text-gov-navy dark:text-sky-300">
              2002-04 Legacy Voter Roll
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'backend' ? (
              <Badge variant="blue">
                <Cloud className="w-3 h-3 mr-1 inline" />
                {totalRecordsInDb} Records via Backend
              </Badge>
            ) : (
              <Badge variant="gold">
                <WifiOff className="w-3 h-3 mr-1 inline" />
                Offline Snapshot
              </Badge>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2">
            ⚠ {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-gov-navy dark:text-sky-300 block mb-1">
              Search Name (Soundex / Fuzzy)
            </label>
            <div className="relative">
              <input
                type="text"
                value={manualSearchQuery.name}
                onChange={(e) => setManualSearchQuery({ name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="e.g. Ramesh Sharma"
                className="w-full text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 pl-8 pr-3 py-2.5 focus:ring-2 focus:ring-gov-navy dark:focus:ring-sky-500 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-gov-navy dark:text-sky-400 absolute left-2.5 top-3" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gov-navy dark:text-sky-300 block mb-1">
              Exact Legacy EPIC No.
            </label>
            <input
              type="text"
              value={manualSearchQuery.epic}
              onChange={(e) => setManualSearchQuery({ epic: e.target.value.toUpperCase() })}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="e.g. XYZ1029384"
              className="w-full text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2.5 focus:ring-2 focus:ring-gov-navy dark:focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gov-navy dark:text-sky-300 block mb-1">
              Relative / Parent Name
            </label>
            <input
              type="text"
              value={manualSearchQuery.relative}
              onChange={(e) => setManualSearchQuery({ relative: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="e.g. Dwarka Prasad"
              className="w-full text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2.5 focus:ring-2 focus:ring-gov-navy dark:focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {dataSource === 'backend'
              ? 'Powered by PostgreSQL + Jaro-Winkler + Soundex (FastAPI backend)'
              : 'Offline: Double Metaphone & Levenshtein distance matrix'}
          </span>
          <Button
            onClick={runSearch}
            isLoading={isLoading}
            variant="primary"
            size="sm"
            leftIcon={<Search className="w-3.5 h-3.5" />}
          >
            Search
          </Button>
        </div>
      </div>

      {/* Search Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-gov-navy dark:text-sky-300">
          <span>Ranked Phonetic Matches ({matches.length})</span>
          {selectedLegacyRecord && (
            <span className="text-amber-600 dark:text-amber-400">
              Selected: {selectedLegacyRecord.fullName} ({selectedLegacyRecord.epicNo})
            </span>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-govCard space-y-3">
            <UserX className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              No matching legacy records found in 2002-04 snapshot.
            </p>
            <Button onClick={handleProceedWithoutMatch} variant="outline" size="sm">
              Proceed as New / Unlinked Registration
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {matches.map((record) => (
              <MatchScoreCard
                key={record.id}
                match={record}
                isSelected={selectedLegacyRecord?.id === record.id}
                onSelect={handleSelectRecord}
                queryName={manualSearchQuery.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button onClick={handleProceedWithoutMatch} variant="ghost" size="md">
          Skip Linkage (No Match)
        </Button>

        <Button
          onClick={handleProceed}
          disabled={!selectedLegacyRecord}
          variant="cta"
          size="lg"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Confirm Linkage & Proceed to Checklist
        </Button>
      </div>
    </div>
  );
};
