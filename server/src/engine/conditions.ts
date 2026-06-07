// Mirrors the rule model defined in
// react-flow-wrapper/src/components/forms/ConditionNodeForm.tsx (CONFIG_KEY = "__conditionBranches")

export type RuleOperator =
  | 'equals' | 'not_equals'
  | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'in_set' | 'not_in_set'
  | 'is_empty' | 'is_not_empty'
  | 'regex';

export type LogicType = 'AND' | 'OR' | 'CUSTOM';

export interface ConditionRule {
  id: string;
  variable: string;
  operator: RuleOperator;
  value: string;
}

export interface ConditionBranch {
  id: string;
  targetId?: string;
  name: string;
  logicType: LogicType;
  customExpression: string;
  rules: ConditionRule[];
}

function toComparable(value: unknown): { asString: string; asNumber: number | null } {
  const asString = value === null || value === undefined ? '' : String(value);
  const asNumber = asString.trim() !== '' && !Number.isNaN(Number(asString)) ? Number(asString) : null;
  return { asString, asNumber };
}

function evaluateRule(rule: ConditionRule, variables: Record<string, unknown>): boolean {
  const left = toComparable(variables[rule.variable]);
  const rawRight = rule.value ?? '';
  const right = toComparable(rawRight);

  switch (rule.operator) {
    case 'equals':
      return left.asNumber !== null && right.asNumber !== null
        ? left.asNumber === right.asNumber
        : left.asString === right.asString;
    case 'not_equals':
      return left.asNumber !== null && right.asNumber !== null
        ? left.asNumber !== right.asNumber
        : left.asString !== right.asString;
    case 'greater_than':
      return left.asNumber !== null && right.asNumber !== null && left.asNumber > right.asNumber;
    case 'less_than':
      return left.asNumber !== null && right.asNumber !== null && left.asNumber < right.asNumber;
    case 'greater_equal':
      return left.asNumber !== null && right.asNumber !== null && left.asNumber >= right.asNumber;
    case 'less_equal':
      return left.asNumber !== null && right.asNumber !== null && left.asNumber <= right.asNumber;
    case 'contains':
      return left.asString.includes(right.asString);
    case 'not_contains':
      return !left.asString.includes(right.asString);
    case 'starts_with':
      return left.asString.startsWith(right.asString);
    case 'ends_with':
      return left.asString.endsWith(right.asString);
    case 'in_set':
      return rawRight.split(',').map((v) => v.trim()).includes(left.asString);
    case 'not_in_set':
      return !rawRight.split(',').map((v) => v.trim()).includes(left.asString);
    case 'is_empty':
      return left.asString.trim() === '';
    case 'is_not_empty':
      return left.asString.trim() !== '';
    case 'regex':
      try {
        return new RegExp(rawRight).test(left.asString);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

// CUSTOM expressions aren't parsed (no safe grammar defined yet on the builder side) — fall back to AND.
export function evaluateBranch(branch: ConditionBranch, variables: Record<string, unknown>): boolean {
  if (branch.rules.length === 0) return false;
  const results = branch.rules.map((rule) => evaluateRule(rule, variables));

  if (branch.logicType === 'OR') return results.some(Boolean);
  return results.every(Boolean);
}

export function parseConditionBranches(raw: string | undefined): ConditionBranch[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ConditionBranch[];
  } catch {
    return [];
  }
}

// Returns the targetId of the first branch whose rules all match, or null when none match.
export function resolveConditionTarget(
  raw: string | undefined,
  variables: Record<string, unknown>,
): string | null {
  const branches = parseConditionBranches(raw);
  for (const branch of branches) {
    if (branch.targetId && evaluateBranch(branch, variables)) {
      return branch.targetId;
    }
  }
  return null;
}
