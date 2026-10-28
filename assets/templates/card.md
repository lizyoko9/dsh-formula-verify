---
id: eq:replace-me
title: Replace with the claim
symbols:
  x: { domain: "real", unit: "-" }
assumptions:
  - "x > 0"
source: "paper §3, Eq. (13)"
---

$$
% paste the formula here
$$

**Derivation.** Replace with the steps and the justification for each step.

**Checks.**

- Symbolic: `simplify(lhs - rhs) == 0`
- Numeric: 5 deterministic points; relative error < 1e-9
- Edge cases: `x -> 0+`, `x -> oo`
- Units: check separately if the formula has physical units
- Not checked: state what remains unproven
