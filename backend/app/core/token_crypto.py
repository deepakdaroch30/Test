from __future__ import annotations

import os

from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        key = "zV7j4A6Yp5wN8Q2mCkT3uHf1B9xLr0sDqWeRtYuIoPk="
        print("ENCRYPTION_KEY not set. Using temporary development fallback key.")
    return Fernet(key.encode("utf-8"))


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode("utf-8")).decode("utf-8")


def decrypt_token(token: str) -> str:
    return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
