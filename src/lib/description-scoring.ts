export interface ScoreBreakdown {
  length: number;       // 0-2
  specificity: number;  // 0-3
  dimensions: number;   // 0-2
  materials: number;    // 0-2
  scope: number;        // 0-1
}

export interface ScoreResult {
  score: number;  // 0-10
  label: string;
  breakdown: ScoreBreakdown;
}

const dimensionPatterns = /\d+\s*(sq\s*ft|sqft|square\s*feet|lnft|linear\s*feet|ft|feet|inches|in|yards|yd|meters|m|cm)\b/i;
const materialPatterns = /\b(wood|lumber|tile|ceramic|porcelain|granite|marble|quartz|laminate|vinyl|carpet|hardwood|concrete|drywall|plywood|shingles|metal|steel|aluminum|copper|pvc|pipe|wire|paint|stain|grout|mortar|insulation|fiberglass|foam)\b/i;
const scopeVerbPatterns = /\b(install|replace|repair|remove|demolish|build|construct|remodel|renovate|upgrade|refinish|resurface|paint|tile|plumb|wire|frame|insulate|seal|waterproof|grade|excavate|pour)\b/i;
const numberPattern = /\b\d+(\.\d+)?\b/;

export function scoreDescription(text: string): ScoreResult {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  const breakdown: ScoreBreakdown = {
    length: 0,
    specificity: 0,
    dimensions: 0,
    materials: 0,
    scope: 0,
  };

  // Length: 0-2 pts
  if (wordCount >= 10) breakdown.length = 1;
  if (wordCount >= 30) breakdown.length = 2;

  // Specificity (numbers/details): 0-3 pts
  const numbers = trimmed.match(/\b\d+(\.\d+)?\b/g);
  const numberCount = numbers?.length || 0;
  if (numberCount >= 1) breakdown.specificity = 1;
  if (numberCount >= 2) breakdown.specificity = 2;
  if (numberCount >= 3) breakdown.specificity = 3;

  // Dimensions: 0-2 pts
  if (dimensionPatterns.test(trimmed)) breakdown.dimensions = 1;
  const dimMatches = trimmed.match(new RegExp(dimensionPatterns.source, "gi"));
  if (dimMatches && dimMatches.length >= 2) breakdown.dimensions = 2;

  // Materials: 0-2 pts
  if (materialPatterns.test(trimmed)) breakdown.materials = 1;
  const matMatches = trimmed.match(new RegExp(materialPatterns.source, "gi"));
  if (matMatches && new Set(matMatches.map((m) => m.toLowerCase())).size >= 2) breakdown.materials = 2;

  // Scope verbs: 0-1 pt
  if (scopeVerbPatterns.test(trimmed)) breakdown.scope = 1;

  const score = breakdown.length + breakdown.specificity + breakdown.dimensions + breakdown.materials + breakdown.scope;

  let label: string;
  if (score <= 2) label = "Needs more detail";
  else if (score <= 4) label = "Basic";
  else if (score <= 6) label = "Good";
  else if (score <= 8) label = "Detailed";
  else label = "Excellent";

  return { score, label, breakdown };
}

export function getStaticTips(breakdown: ScoreBreakdown): string[] {
  const tips: string[] = [];
  if (breakdown.length < 2) tips.push("Add more detail — aim for at least 30 words describing the scope of work");
  if (breakdown.specificity < 2) tips.push("Include specific quantities (e.g. number of rooms, fixtures, or areas)");
  if (breakdown.dimensions < 1) tips.push("Include measurements or dimensions (e.g. '200 sqft kitchen', '12ft ceiling')");
  if (breakdown.materials < 1) tips.push("Mention specific materials (e.g. 'granite countertops', 'vinyl plank flooring')");
  if (breakdown.scope < 1) tips.push("Use action verbs to describe the work (e.g. 'install', 'replace', 'remodel')");
  return tips;
}
