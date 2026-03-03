"""Unit tests for utils.safe_float and safe_int."""

import pytest

import utils


class TestSafeFloat:
    def test_none_returns_default(self):
        assert utils.safe_float(None) == 0.0
        assert utils.safe_float(None, 3.14) == 3.14

    def test_valid_numeric(self):
        assert utils.safe_float(1) == 1.0
        assert utils.safe_float(1.5) == 1.5
        assert utils.safe_float("2.5") == 2.5
        assert utils.safe_float("0") == 0.0

    def test_invalid_returns_default(self):
        assert utils.safe_float("not a number") == 0.0
        assert utils.safe_float([1, 2]) == 0.0
        assert utils.safe_float("", default=-1.0) == -1.0

    def test_custom_default(self):
        assert utils.safe_float(None, 99.0) == 99.0
        assert utils.safe_float("x", 99.0) == 99.0


class TestSafeInt:
    def test_none_returns_default(self):
        assert utils.safe_int(None) == 10
        assert utils.safe_int(None, 0) == 0

    def test_valid_numeric(self):
        assert utils.safe_int(1) == 1
        assert utils.safe_int(1.9) == 1
        assert utils.safe_int("42") == 42
        assert utils.safe_int("0") == 0

    def test_invalid_returns_default(self):
        assert utils.safe_int("not a number") == 10
        assert utils.safe_int("1.5") == 10  # int("1.5") raises ValueError
        assert utils.safe_int("", default=0) == 0

    def test_custom_default(self):
        assert utils.safe_int(None, 99) == 99
        assert utils.safe_int("x", 99) == 99
