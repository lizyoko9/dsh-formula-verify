"""pytest card for one paper formula. Replace the symbols and expressions."""

import sympy as sp

x = sp.symbols("x", real=True, positive=True)
lhs = sp.sqrt(x**2)
rhs = x


def test_symbolic_identity():
    assert sp.simplify(lhs - rhs) == 0


def test_numeric_samples():
    for value in (0.7, 1.3, 2.1, 3.4, 5.2):
        left = float(lhs.subs(x, value))
        right = float(rhs.subs(x, value))
        assert abs(left - right) <= 1e-9 * max(1.0, abs(left), abs(right))


def test_edge_cases():
    assert sp.limit(lhs - rhs, x, sp.oo) == 0
