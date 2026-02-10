"""
Database link metadata utilities for dashboard auto-discovery.
"""

import sqlite3
import struct
from pathlib import Path
from typing import Dict, List, Optional, Tuple

LINK_FOLDER_NAME = "link"
BIN_FILE_BY_TYPE = {"reactive": "reactivetype.bin", "vector": "vectortype.bin"}
MAGIC = b"SKYLINK2"


def _resolve_db_path(path: str) -> Path:
    db_path = Path(path)
    return db_path if db_path.is_absolute() else (Path.cwd() / db_path).resolve()


def _metadata_file_for_db(
    db_path: Path,
    db_type: str
) -> Path:
    link_dir = db_path.parent / LINK_FOLDER_NAME
    return link_dir / BIN_FILE_BY_TYPE[db_type]


def _encode_binary_payload(
    db_type: str,
    db_paths: List[str]
) -> bytes:
    type_code = 1 if db_type == "reactive" else 2
    payload = bytearray()
    payload.extend(MAGIC)
    payload.extend(struct.pack(">BI", type_code, len(db_paths)))
    for db_path in db_paths:
        path_bytes = db_path.encode("utf-8")
        payload.extend(struct.pack(">I", len(path_bytes)))
        payload.extend(path_bytes)
    return bytes(payload)


def _decode_binary_payload(raw: bytes) -> Optional[Tuple[str, List[str]]]:
    if len(raw) < len(MAGIC) + 5 or not raw.startswith(MAGIC):
        return None

    offset = len(MAGIC)
    type_code, count = struct.unpack(">BI", raw[offset:offset + 5])
    db_type = "reactive" if type_code == 1 else "vector" if type_code == 2 else None
    if db_type is None:
        return None

    paths: List[str] = []
    cursor = offset + 5
    for _ in range(count):
        if cursor + 4 > len(raw):
            return None
        path_len = struct.unpack(">I", raw[cursor:cursor + 4])[0]
        cursor += 4
        if cursor + path_len > len(raw):
            return None
        try:
            db_path = raw[cursor:cursor + path_len].decode("utf-8")
        except UnicodeDecodeError:
            return None
        if db_path:
            paths.append(db_path)
        cursor += path_len

    if cursor != len(raw):
        return None
    return db_type, paths


def detect_database_type(path: str) -> str:
    """
    Detect database type by inspecting SQLite schema.
    """

    db_path = _resolve_db_path(path)
    if not db_path.exists():
        return "reactive"

    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row["name"] for row in cursor.fetchall()]
        table_names = {name.lower() for name in tables}
        if "_vector_collections" in table_names:
            return "vector"

        vector_columns = {"embedding", "embedding_id", "vector", "vector_id"}

        for table_name in tables:
            cursor.execute(f"PRAGMA table_info([{table_name}])")
            columns = {row["name"].lower() for row in cursor.fetchall()}
            if columns.intersection(vector_columns):
                return "vector"
    except sqlite3.Error:
        return "reactive"
    finally:
        conn.close()
    return "reactive"


def ensure_db_link_metadata(
    path: str,
    db_type: Optional[str] = None
) -> Dict[str, str]:
    """
    Create/update a sidecar link folder and binary metadata file for a DB.
    """

    resolved_db_path = _resolve_db_path(path)
    resolved_type = db_type or detect_database_type(str(resolved_db_path))
    metadata_path = _metadata_file_for_db(resolved_db_path, resolved_type)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)

    existing_paths: List[str] = []
    if metadata_path.exists():
        try:
            raw = metadata_path.read_bytes()
            decoded = _decode_binary_payload(raw)
            if decoded is not None and decoded[0] == resolved_type:
                existing_paths = decoded[1]
        except OSError:
            existing_paths = []

    normalized = str(resolved_db_path)
    merged_paths = list(dict.fromkeys(existing_paths + [normalized]))

    payload = {
        "type": resolved_type,
        "path": normalized
    }
    metadata_path.write_bytes(
        _encode_binary_payload(
            resolved_type,
            merged_paths
        )
    )
    return payload

def discover_database_links(root: Optional[Path] = None) -> List[Dict[str, str]]:
    """
    Discover all DB link metadata binaries from a root folder recursively.
    """

    search_root = root or Path.cwd()
    discovered: List[Dict[str, str]] = []
    pattern = f"**/{LINK_FOLDER_NAME}/*.bin"
    for metadata_file in search_root.glob(pattern):
        if not metadata_file.is_file():
            continue
        parsed_entries = _read_link_metadata(metadata_file)
        discovered.extend(parsed_entries)
    return discovered

def _read_link_metadata(path: Path) -> List[Dict[str, str]]:
    try:
        raw = path.read_bytes()
    except OSError:
        return []

    decoded = _decode_binary_payload(raw)
    if decoded is None:
        return []

    db_type, db_paths = decoded
    entries: List[Dict[str, str]] = []
    for db_path in db_paths:
        entries.append(
            {
                "type": db_type,
                "path": db_path,
                "metadata_file": str(path)
            }
        )
    return entries
