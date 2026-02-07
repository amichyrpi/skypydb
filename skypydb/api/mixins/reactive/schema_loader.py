"""
Schema loading utilities for the reactive client.
"""

import importlib.util
import os
from skypydb.schema import SysSchema


def load_schema() -> SysSchema:
    """
    Load schema from ./db/schema.py or package schema.py.
    """

    schema = None

    # first, try to load schema.py from the current working directory (./db/schema.py)
    cwd_schema_path = os.path.join(os.getcwd(), "db", "schema.py")
    if os.path.exists(cwd_schema_path):
        spec = importlib.util.spec_from_file_location("skypydb._user_schema", cwd_schema_path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            schema = getattr(module, "schema", None)
    # if not found in cwd, try to load from the installed package location
    if schema is None:
        package_root = os.path.dirname(os.path.dirname(__file__))
        schema_path = os.path.join(package_root, "schema.py")
        if os.path.exists(schema_path):
            spec = importlib.util.spec_from_file_location("skypydb._schema_file", schema_path)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                schema = getattr(module, "schema", None)
    if schema is None:
        raise ValueError(
            "No 'schema' object found in db/schema.py. "
            "Please create a schema.py file in ./db/schema.py with a schema definition "
            "using: schema = defineSchema({...})"
        )
    if not isinstance(schema, SysSchema):
        raise ValueError(
            f"Expected a Schema object, got {type(schema).__name__}"
        )
    return schema
