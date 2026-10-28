"""Identify the signed-in caller of an HTTP function from their Firebase ID token.

The frontend sends `Authorization: Bearer <idToken>` (from Firebase Auth's
`getIdToken()`). The functions use the uid from the verified token, never a
user id supplied in the request, so one user can't read or overwrite another
user's simulations.
"""


class AuthError(Exception):
    """The request has no valid ID token, or names a different user."""

    def __init__(self, message: str, status: int = 401):
        super().__init__(message)
        self.status = status


def _verify(id_token: str) -> dict:
    import firebase_admin
    from firebase_admin import auth

    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    return auth.verify_id_token(id_token)


def caller_uid(headers, claimed_uid=None, verify=_verify) -> str:
    """Return the verified uid of the caller.

    Raises AuthError(401) when the token is missing or invalid, and
    AuthError(403) when `claimed_uid` (a user id sent by older clients) is
    present but doesn't match the token.
    """
    header = (headers.get("Authorization") or headers.get("authorization") or "").strip()
    if not header.lower().startswith("bearer "):
        raise AuthError("Sign in required: missing ID token")
    token = header[7:].strip()
    if not token:
        raise AuthError("Sign in required: missing ID token")
    try:
        decoded = verify(token)
    except Exception as e:  # expired, revoked, malformed, wrong project...
        print("[caller_uid] Token rejected:", type(e).__name__, str(e)[:200])
        raise AuthError("Sign in required: invalid or expired ID token") from e
    uid = decoded.get("uid") or decoded.get("sub")
    if not uid:
        raise AuthError("Sign in required: token has no user")
    if claimed_uid and claimed_uid != uid:
        raise AuthError("Not allowed to access another user's simulations", status=403)
    return uid
