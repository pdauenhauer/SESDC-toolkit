"""The functions must act as the user in the verified ID token, never a user id from the request."""

import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from caller_auth import AuthError, caller_uid  # noqa: E402


def fake_verify(token):
    if token == "good-token":
        return {"uid": "alice"}
    raise ValueError("bad token")


def test_valid_token_returns_its_uid():
    assert caller_uid({"Authorization": "Bearer good-token"}, verify=fake_verify) == "alice"


def test_header_name_and_scheme_are_case_insensitive():
    assert caller_uid({"authorization": "bearer good-token"}, verify=fake_verify) == "alice"


@pytest.mark.parametrize("headers", [{}, {"Authorization": ""}, {"Authorization": "Bearer "}, {"Authorization": "Basic abc"}])
def test_missing_token_is_401(headers):
    with pytest.raises(AuthError) as e:
        caller_uid(headers, verify=fake_verify)
    assert e.value.status == 401


def test_invalid_token_is_401():
    with pytest.raises(AuthError) as e:
        caller_uid({"Authorization": "Bearer forged"}, verify=fake_verify)
    assert e.value.status == 401


def test_claiming_another_user_is_403():
    with pytest.raises(AuthError) as e:
        caller_uid({"Authorization": "Bearer good-token"}, claimed_uid="bob", verify=fake_verify)
    assert e.value.status == 403


def test_matching_claim_is_allowed():
    assert caller_uid({"Authorization": "Bearer good-token"}, claimed_uid="alice", verify=fake_verify) == "alice"
