import { get, set } from 'idb-keyval';
import { soundex, metaphone } from '../search/soundex';
import { calculateFullNameMatchScore, levenshteinDistance } from '../search/levenshtein';
import { INITIAL_LEGACY_SNAPSHOT_2002_04, LegacyVoterRecord } from './mock-legacy-data';

const LEGACY_STORAGE_KEY = 'sir_assist_legacy_voters_snapshot_v1';

export interface SearchMatchResult extends LegacyVoterRecord {
  matchScore: number;
  nameDistance: number;
  relativeDistance: number;
  matchType: 'EXACT_EPIC' | 'HIGH_PHONETIC' | 'FUZZY_NAME' | 'PARTIAL';
}

class LegacyRollEngine {
  private records: LegacyVoterRecord[] = [];
  private isInitialized = false;

  public async initialize(): Promise<number> {
    if (this.isInitialized && this.records.length > 0) {
      return this.records.length;
    }

    try {
      const stored = await get<LegacyVoterRecord[]>(LEGACY_STORAGE_KEY);
      if (stored && Array.isArray(stored) && stored.length > 0) {
        this.records = stored;
      } else {
        // Hydrate from base snapshot with phonetic indices computed
        const indexedRecords: LegacyVoterRecord[] = INITIAL_LEGACY_SNAPSHOT_2002_04.map((r) => ({
          ...r,
          soundexName: soundex(r.fullName),
          metaphoneName: metaphone(r.fullName),
          soundexRelative: soundex(r.relativeName),
        }));

        await set(LEGACY_STORAGE_KEY, indexedRecords);
        this.records = indexedRecords;
      }
      this.isInitialized = true;
      return this.records.length;
    } catch (e) {
      console.warn('IDB fallback to in-memory store', e);
      this.records = INITIAL_LEGACY_SNAPSHOT_2002_04.map((r) => ({
        ...r,
        soundexName: soundex(r.fullName),
        metaphoneName: metaphone(r.fullName),
        soundexRelative: soundex(r.relativeName),
      }));
      this.isInitialized = true;
      return this.records.length;
    }
  }

  public async getRecordCount(): Promise<number> {
    if (!this.isInitialized) await this.initialize();
    return this.records.length;
  }

  public async getAllRecords(): Promise<LegacyVoterRecord[]> {
    if (!this.isInitialized) await this.initialize();
    return [...this.records];
  }

  public async searchVoter(params: {
    queryName?: string;
    queryEpic?: string;
    queryRelative?: string;
    partFilter?: string;
    minScoreThreshold?: number;
  }): Promise<SearchMatchResult[]> {
    if (!this.isInitialized) await this.initialize();

    const {
      queryName = '',
      queryEpic = '',
      queryRelative = '',
      partFilter = '',
      minScoreThreshold = 40,
    } = params;

    const cleanEpic = queryEpic.trim().toUpperCase();
    const cleanName = queryName.trim();
    const cleanRelative = queryRelative.trim();
    const querySoundex = cleanName ? soundex(cleanName) : '';
    const queryMetaphone = cleanName ? metaphone(cleanName) : '';

    if (!cleanEpic && !cleanName && !cleanRelative && !partFilter) {
      return this.records.slice(0, 15).map((r) => ({
        ...r,
        matchScore: 100,
        nameDistance: 0,
        relativeDistance: 0,
        matchType: 'PARTIAL',
      }));
    }

    const results: SearchMatchResult[] = [];

    for (const record of this.records) {
      // 1. Part filter check
      if (partFilter && !record.partNo.toLowerCase().includes(partFilter.toLowerCase())) {
        continue;
      }

      // 2. Exact EPIC Check (Instant 100% Match)
      if (cleanEpic && record.epicNo.toUpperCase() === cleanEpic) {
        results.push({
          ...record,
          matchScore: 100,
          nameDistance: 0,
          relativeDistance: 0,
          matchType: 'EXACT_EPIC',
        });
        continue;
      }

      // 3. Name & Relative Phonetic/Fuzzy Matching
      let nameScore = 0;
      let nameDist = 999;
      let relScore = 0;
      let relDist = 999;

      if (cleanName) {
        nameDist = levenshteinDistance(cleanName, record.fullName);
        nameScore = calculateFullNameMatchScore(cleanName, record.fullName);

        // Soundex or Metaphone phonetic bonus
        if (record.soundexName === querySoundex || record.metaphoneName === queryMetaphone) {
          nameScore = Math.max(nameScore, 85);
        }
      }

      if (cleanRelative) {
        relDist = levenshteinDistance(cleanRelative, record.relativeName);
        relScore = calculateFullNameMatchScore(cleanRelative, record.relativeName);
        if (record.soundexRelative === soundex(cleanRelative)) {
          relScore = Math.max(relScore, 80);
        }
      }

      // Aggregate Weighted Match Score
      let aggregateScore = 0;
      if (cleanName && cleanRelative) {
        aggregateScore = Math.round(nameScore * 0.65 + relScore * 0.35);
      } else if (cleanName) {
        aggregateScore = nameScore;
      } else if (cleanRelative) {
        aggregateScore = relScore;
      } else {
        aggregateScore = 50; // Filtered only by part
      }

      if (aggregateScore >= minScoreThreshold) {
        let matchType: SearchMatchResult['matchType'] = 'FUZZY_NAME';
        if (aggregateScore >= 85) matchType = 'HIGH_PHONETIC';
        else if (aggregateScore < 60) matchType = 'PARTIAL';

        results.push({
          ...record,
          matchScore: aggregateScore,
          nameDistance: nameDist,
          relativeDistance: relDist,
          matchType,
        });
      }
    }

    // Sort descending by match score
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  public async insertRecords(newRecords: Omit<LegacyVoterRecord, 'soundexName' | 'metaphoneName' | 'soundexRelative'>[]): Promise<number> {
    if (!this.isInitialized) await this.initialize();

    const indexed: LegacyVoterRecord[] = newRecords.map((r) => ({
      ...r,
      soundexName: soundex(r.fullName),
      metaphoneName: metaphone(r.fullName),
      soundexRelative: soundex(r.relativeName),
    }));

    this.records = [...this.records, ...indexed];
    await set(LEGACY_STORAGE_KEY, this.records);
    return this.records.length;
  }
}

export const legacyRollEngine = new LegacyRollEngine();
