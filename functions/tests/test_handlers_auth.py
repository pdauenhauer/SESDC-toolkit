"""The HTTP handlers only act for the user in the caller's verified ID token."""

import functools

import pytest
from flask import Flask, request

import handlers
from caller_auth import caller_uid


_app = Flask(__name__)


def _call(handler, method, *, query=None, body=None, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    with _app.test_request_context(
        "/", method=method, query_string=query, json=body, headers=headers
    ):
        return handler(request)


@pytest.fixture
def signed_in_as_alice(monkeypatch):
    fake = functools.partial(caller_uid, verify=lambda token: {"uid": "alice"})
    monkeypatch.setattr(handlers, "caller_uid", fake)


def test_get_without_token_is_401():
    res = _call(handlers.get_stored_simulation, "GET", query={"userId": "alice", "projectId": "p1"})
    assert res.status_code == 401


def test_post_without_token_is_401():
    res = _call(handlers.run_simulation_post, "POST", body={"userId": "alice", "projectId": "p1"})
    assert res.status_code == 401


def test_get_for_another_user_is_403(signed_in_as_alice):
    res = _call(
        handlers.get_stored_simulation, "GET", query={"userId": "bob", "projectId": "p1"}, token="t"
    )
    assert res.status_code == 403


def test_post_for_another_user_is_403(signed_in_as_alice):
    res = _call(
        handlers.run_simulation_post, "POST", body={"userId": "bob", "projectId": "p1"}, token="t"
    )
    assert res.status_code == 403


def test_get_reads_the_token_users_runs(signed_in_as_alice, monkeypatch):
    seen = {}

    class FakeRepo:
        def get_stored_csv_bundle(self, user_id, project_id, keys=None):
            seen["args"] = (user_id, project_id)
            return {}

    monkeypatch.setattr(handlers, "GcpSimulationRepository", FakeRepo)
    res = _call(handlers.get_stored_simulation, "GET", query={"projectId": "p1"}, token="t")
    assert res.status_code == 200
    assert seen["args"] == ("alice", "p1")
