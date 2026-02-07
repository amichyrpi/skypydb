"""
Module containing the SysCreate class, which is used to create a table.
"""

from typing import Dict
from skypydb.errors import TableAlreadyExistsError
from skypydb.table.table import Table
from skypydb.api.mixins.reactive.schema_loader import load_schema

class SysCreate:
    def create_table(self) -> Dict[str, Table]:
        """
        Create all tables defined in db/schema.py.

        Returns:
            Dictionary mapping table names to Table instances

        Raises:
            TableAlreadyExistsError: If any table already exists
            ValueError: If schema file is missing or invalid

        Example:
            # Define your schema in db/schema.py, then:
            client = skypydb.Client()
            tables = client.create_table()

            # Access tables
            users_table = tables["users"]
            posts_table = tables["posts"]
        """

        schema = load_schema()

        # create all tables from schema
        created_tables: Dict[str, Table] = {}
        table_names = schema.get_all_table_names()
        existing = [name for name in table_names if self.db.table_exists(name)]
        if existing:
            raise TableAlreadyExistsError(
                f"Tables already exist in the database: {', '.join(existing)}"
            )
        for table_name in table_names:
            table_def = schema.get_table_definition(table_name)
            if table_def is None:
                continue
            # create table with schema definition
            self.db.create_table(table_name, table_def)
            created_tables[table_name] = Table(self.db, table_name)
        return created_tables