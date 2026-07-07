export type LevelId = 1 | 2 | 3 | 4;

export interface FactMap {
  CH: string;
  DH: string;
  KD: string;
  KW: string;
  KS: string;
  RB: string;
  PD: string;
}

export interface Rule {
  id: string;
  type: 'base' | 'modifier';
  conditions: (facts: FactMap, currentPotensi: LevelId | null) => boolean;
  action: (currentPotensi: LevelId | null) => LevelId;
  description: string;
}

export interface RuleTrace {
  ruleId: string;
  description: string;
  previousLevel: LevelId | null;
  newLevel: LevelId;
}

export interface InferenceResult {
  finalLevel: LevelId;
  trace: RuleTrace[];
}
