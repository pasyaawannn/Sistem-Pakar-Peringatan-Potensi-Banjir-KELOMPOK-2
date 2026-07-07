import { FactMap, LevelId, Rule, RuleTrace, InferenceResult } from './types';

export const LEVEL_INFO: Record<LevelId, { label: string; action: string; color: string; bg: string; text: string; border: string }> = {
  1: { label: 'RENDAH', action: 'Kondisi aman, tetap waspada', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  2: { label: 'SEDANG', action: 'Perlu kesiapsiagaan, pantau informasi cuaca', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  3: { label: 'TINGGI', action: 'Perlu kewaspadaan tinggi, siapkan rencana evakuasi', color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  4: { label: 'SANGAT TINGGI', action: 'Evakuasi segera, siagakan BPBD', color: 'bg-red-600', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
};

export const BASE_RULES: Rule[] = [
  { id: 'R1', type: 'base', conditions: (f) => f.CH === 'CH5', action: () => 4, description: 'IF CH=CH5 THEN SANGAT TINGGI' },
  { id: 'R2', type: 'base', conditions: (f) => f.CH === 'CH4' && f.DH === 'DH1' && f.KD === 'KD1', action: () => 3, description: 'IF CH=CH4 AND DH=DH1 AND KD=KD1 THEN TINGGI' },
  { id: 'R3', type: 'base', conditions: (f) => f.CH === 'CH4' && f.DH === 'DH1' && f.KD === 'KD2', action: () => 4, description: 'IF CH=CH4 AND DH=DH1 AND KD=KD2 THEN SANGAT TINGGI' },
  { id: 'R4', type: 'base', conditions: (f) => f.CH === 'CH4' && f.DH === 'DH2' && f.KD === 'KD1', action: () => 3, description: 'IF CH=CH4 AND DH=DH2 AND KD=KD1 THEN TINGGI' },
  { id: 'R5', type: 'base', conditions: (f) => f.CH === 'CH4' && f.DH === 'DH2' && f.KD === 'KD2', action: () => 4, description: 'IF CH=CH4 AND DH=DH2 AND KD=KD2 THEN SANGAT TINGGI' },
  { id: 'R6', type: 'base', conditions: (f) => f.CH === 'CH4' && f.DH === 'DH3' && f.KD === 'KD1', action: () => 4, description: 'IF CH=CH4 AND DH=DH3 AND KD=KD1 THEN SANGAT TINGGI' },
  { id: 'R7', type: 'base', conditions: (f) => f.CH === 'CH4' && f.DH === 'DH3' && f.KD === 'KD2', action: () => 4, description: 'IF CH=CH4 AND DH=DH3 AND KD=KD2 THEN SANGAT TINGGI' },
  
  { id: 'R8', type: 'base', conditions: (f) => f.CH === 'CH3' && f.DH === 'DH1' && f.KD === 'KD1', action: () => 2, description: 'IF CH=CH3 AND DH=DH1 AND KD=KD1 THEN SEDANG' },
  { id: 'R9', type: 'base', conditions: (f) => f.CH === 'CH3' && f.DH === 'DH1' && f.KD === 'KD2', action: () => 3, description: 'IF CH=CH3 AND DH=DH1 AND KD=KD2 THEN TINGGI' },
  { id: 'R10', type: 'base', conditions: (f) => f.CH === 'CH3' && f.DH === 'DH2' && f.KD === 'KD1', action: () => 2, description: 'IF CH=CH3 AND DH=DH2 AND KD=KD1 THEN SEDANG' },
  { id: 'R11', type: 'base', conditions: (f) => f.CH === 'CH3' && f.DH === 'DH2' && f.KD === 'KD2', action: () => 3, description: 'IF CH=CH3 AND DH=DH2 AND KD=KD2 THEN TINGGI' },
  { id: 'R12', type: 'base', conditions: (f) => f.CH === 'CH3' && f.DH === 'DH3' && f.KD === 'KD1', action: () => 3, description: 'IF CH=CH3 AND DH=DH3 AND KD=KD1 THEN TINGGI' },
  { id: 'R13', type: 'base', conditions: (f) => f.CH === 'CH3' && f.DH === 'DH3' && f.KD === 'KD2', action: () => 3, description: 'IF CH=CH3 AND DH=DH3 AND KD=KD2 THEN TINGGI' },

  { id: 'R14', type: 'base', conditions: (f) => f.CH === 'CH2' && f.DH === 'DH1' && f.KD === 'KD1', action: () => 1, description: 'IF CH=CH2 AND DH=DH1 AND KD=KD1 THEN RENDAH' },
  { id: 'R15', type: 'base', conditions: (f) => f.CH === 'CH2' && f.DH === 'DH1' && f.KD === 'KD2', action: () => 2, description: 'IF CH=CH2 AND DH=DH1 AND KD=KD2 THEN SEDANG' },
  { id: 'R16', type: 'base', conditions: (f) => f.CH === 'CH2' && f.DH === 'DH2' && f.KD === 'KD1', action: () => 2, description: 'IF CH=CH2 AND DH=DH2 AND KD=KD1 THEN SEDANG' },
  { id: 'R17', type: 'base', conditions: (f) => f.CH === 'CH2' && f.DH === 'DH2' && f.KD === 'KD2', action: () => 3, description: 'IF CH=CH2 AND DH=DH2 AND KD=KD2 THEN TINGGI' },
  { id: 'R18', type: 'base', conditions: (f) => f.CH === 'CH2' && f.DH === 'DH3' && f.KD === 'KD1', action: () => 2, description: 'IF CH=CH2 AND DH=DH3 AND KD=KD1 THEN SEDANG' },
  { id: 'R19', type: 'base', conditions: (f) => f.CH === 'CH2' && f.DH === 'DH3' && f.KD === 'KD2', action: () => 3, description: 'IF CH=CH2 AND DH=DH3 AND KD=KD2 THEN TINGGI' },

  { id: 'R20', type: 'base', conditions: (f) => f.CH === 'CH1' && f.DH === 'DH1' && f.KD === 'KD1', action: () => 1, description: 'IF CH=CH1 AND DH=DH1 AND KD=KD1 THEN RENDAH' },
  { id: 'R21', type: 'base', conditions: (f) => f.CH === 'CH1' && f.DH === 'DH1' && f.KD === 'KD2', action: () => 1, description: 'IF CH=CH1 AND DH=DH1 AND KD=KD2 THEN RENDAH' },
  { id: 'R22', type: 'base', conditions: (f) => f.CH === 'CH1' && f.DH === 'DH2' && f.KD === 'KD1', action: () => 1, description: 'IF CH=CH1 AND DH=DH2 AND KD=KD1 THEN RENDAH' },
  { id: 'R23', type: 'base', conditions: (f) => f.CH === 'CH1' && f.DH === 'DH2' && f.KD === 'KD2', action: () => 2, description: 'IF CH=CH1 AND DH=DH2 AND KD=KD2 THEN SEDANG' },
  { id: 'R24', type: 'base', conditions: (f) => f.CH === 'CH1' && f.DH === 'DH3' && f.KD === 'KD1', action: () => 1, description: 'IF CH=CH1 AND DH=DH3 AND KD=KD1 THEN RENDAH' },
  { id: 'R25', type: 'base', conditions: (f) => f.CH === 'CH1' && f.DH === 'DH3' && f.KD === 'KD2', action: () => 2, description: 'IF CH=CH1 AND DH=DH3 AND KD=KD2 THEN SEDANG' },
];

export const MODIFIER_RULES: Rule[] = [
  { id: 'R26', type: 'modifier', conditions: (f, p) => p === 1 && f.KS === 'KS3' && (f.RB === 'RB1' || f.RB === 'RB2'), action: () => 2, description: 'IF Potensi=RENDAH AND KS=KS3 AND (RB=RB1 OR RB=RB2) THEN naikkan ke SEDANG' },
  { id: 'R27', type: 'modifier', conditions: (f, p) => f.KS === 'KS3' && f.RB === 'RB3' && p !== null && p < 3, action: () => 3, description: 'IF KS=KS3 AND RB=RB3 AND Potensi < TINGGI THEN naikkan ke TINGGI' },
  { id: 'R28', type: 'modifier', conditions: (f, p) => p === 3 && f.PD === 'PD4', action: () => 4, description: 'IF Potensi=TINGGI AND PD=PD4 THEN naikkan ke SANGAT TINGGI' },
  { id: 'R29', type: 'modifier', conditions: (f, p) => f.KS === 'KS2' && f.RB === 'RB2' && (f.PD === 'PD2' || f.PD === 'PD3'), action: (p) => p ? Math.min(4, p + 1) as LevelId : 1, description: 'IF KS=KS2 AND RB=RB2 AND (PD=PD2 OR PD=PD3) THEN naikkan 1 level' },
  { id: 'R30', type: 'modifier', conditions: (f, p) => f.RB === 'RB3' && ['CH2', 'CH3', 'CH4', 'CH5'].includes(f.CH) && p !== null && p < 3, action: () => 3, description: 'IF RB=RB3 AND CH >= CH2 THEN Potensi minimal TINGGI' },
  { id: 'R31', type: 'modifier', conditions: (f, p) => f.DH === 'DH3' && f.KD === 'KD2', action: (p) => p ? Math.min(4, p + 1) as LevelId : 1, description: 'IF DH=DH3 AND KD=KD2 THEN naikkan 1 level' },
  { id: 'R32', type: 'modifier', conditions: (f, p) => p === 2 && f.KW === 'KW3', action: () => 3, description: 'IF Potensi=SEDANG AND KW=KW3 THEN naikkan ke TINGGI' },
  { id: 'R33', type: 'modifier', conditions: (f, p) => p === 3 && f.KW === 'KW3' && f.KS === 'KS3', action: () => 4, description: 'IF Potensi=TINGGI AND KW=KW3 AND KS=KS3 THEN naikkan ke SANGAT TINGGI' },
  { id: 'R34', type: 'modifier', conditions: (f, p) => f.KW === 'KW1' && f.KD === 'KD1', action: (p) => p ? Math.max(1, p - 1) as LevelId : 1, description: 'IF KW=KW1 AND KD=KD1 THEN turunkan 1 level (minimal RENDAH)' }
];

export function getPotensiDasar(CH: string, DH: string, KD: string): { potensi: LevelId, ruleId: string, description: string } {
  const dummyFacts: FactMap = { CH, DH, KD, KW: '', KS: '', RB: '', PD: '' };
  for (const rule of BASE_RULES) {
    if (rule.conditions(dummyFacts, null)) {
      return {
        potensi: rule.action(null),
        ruleId: rule.id,
        description: rule.description
      };
    }
  }
  return { potensi: 1, ruleId: 'R0', description: 'Default fallback (No rule matched)' };
}

export function applyModifikasi(potensiDasar: LevelId, facts: FactMap): { potensiAkhir: LevelId, trace: RuleTrace[] } {
  const trace: RuleTrace[] = [];
  let currentPotensi = potensiDasar;

  for (const rule of MODIFIER_RULES) {
    if (rule.conditions(facts, currentPotensi)) {
      const newPotensi = rule.action(currentPotensi);
      if (newPotensi !== currentPotensi) {
        trace.push({
          ruleId: rule.id,
          description: rule.description,
          previousLevel: currentPotensi,
          newLevel: newPotensi
        });
        currentPotensi = newPotensi;
      }
    }
  }

  return {
    potensiAkhir: currentPotensi,
    trace
  };
}

export function runForwardChaining(facts: FactMap): InferenceResult {
  const baseResult = getPotensiDasar(facts.CH, facts.DH, facts.KD);
  
  const trace: RuleTrace[] = [{
    ruleId: baseResult.ruleId,
    description: baseResult.description,
    previousLevel: null,
    newLevel: baseResult.potensi
  }];

  const modResult = applyModifikasi(baseResult.potensi, facts);
  
  return {
    finalLevel: modResult.potensiAkhir,
    trace: [...trace, ...modResult.trace]
  };
}
