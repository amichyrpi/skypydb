"""SkypyDB Dashboard - Real-time database viewer."""

import reflex as rx

from ...api.dashboard_api import get_all_tables, get_table_data, get_table_schema


class State(rx.State):
    """Dashboard state."""
    
    tables: list[str] = []
    selected_table: str = ""
    table_data: list[dict] = []
    table_columns: list[str] = []
    
    def load_tables(self):
        """Load all tables."""
        try:
            self.tables = get_all_tables()
            if self.tables and not self.selected_table:
                self.selected_table = self.tables[0]
                self.load_table_data()
        except Exception as e:
            print(f"Error loading tables: {e}")
    
    def load_table_data(self):
        """Load data for selected table."""
        if not self.selected_table:
            return
        
        try:
            self.table_columns = get_table_schema(self.selected_table)
            self.table_data = get_table_data(self.selected_table)
        except Exception as e:
            print(f"Error loading table data: {e}")
            self.table_data = []
            self.table_columns = []
    
    def on_table_select(self, table_name: str):
        """Handle table selection."""
        self.selected_table = table_name
        self.load_table_data()
    
    def on_refresh(self):
        """Manual refresh."""
        self.load_tables()
        if self.selected_table:
            self.load_table_data()
    


def table_selector() -> rx.Component:
    """Table selector component."""
    return rx.vstack(
        rx.heading("Tables", size="6", margin_bottom="1rem"),
        rx.cond(
            State.tables.length() > 0,
            rx.vstack(
                rx.foreach(
                    State.tables,
                    lambda table: rx.button(
                        table,
                        on_click=lambda: State.on_table_select(table),
                        variant=rx.cond(
                            State.selected_table == table,
                            "solid",
                            "outline"
                        ),
                        width="100%",
                        margin_bottom="0.5rem",
                    ),
                ),
                width="100%",
            ),
            rx.text("No tables found", color="gray"),
        ),
        rx.button(
            "Refresh",
            on_click=State.on_refresh,
            margin_top="1rem",
            width="100%",
        ),
        width="250px",
        padding="1rem",
        border_right="1px solid",
        border_color="gray.200",
        align_items="start",
    )


def data_table() -> rx.Component:
    """Data table component."""
    return rx.vstack(
        rx.hstack(
            rx.heading(
                rx.cond(
                    State.selected_table,
                    State.selected_table,
                    "Select a table",
                ),
                size="6",
            ),
            rx.spacer(),
            rx.text(
                f"{State.table_data.length()} rows",
                color="gray",
                size="3",
            ),
            width="100%",
            margin_bottom="1rem",
        ),
        rx.cond(
            State.table_data.length() > 0,
            rx.box(
                rx.table.root(
                    rx.table.header(
                        rx.table.row(
                            rx.foreach(
                                State.table_columns,
                                lambda col: rx.table.column_header_cell(col),
                            ),
                        ),
                    ),
                    rx.table.body(
                        rx.foreach(
                            State.table_data,
                            lambda row: rx.table.row(
                                rx.foreach(
                                    State.table_columns,
                                    lambda col: rx.table.cell(
                                        rx.cond(
                                            col in row,
                                            rx.text(str(row[col])),
                                            rx.text("-", color="gray"),
                                        ),
                                    ),
                                ),
                            ),
                        ),
                    ),
                    width="100%",
                ),
                overflow_x="auto",
                width="100%",
            ),
            rx.text(
                "No data available",
                color="gray",
                margin_top="2rem",
            ),
        ),
        width="100%",
        padding="1rem",
        align_items="start",
    )


def index() -> rx.Component:
    """Main dashboard page."""
    return rx.container(
        rx.color_mode.button(position="top-right"),
        rx.vstack(
            rx.hstack(
                rx.heading("SkypyDB Dashboard", size="9"),
                rx.spacer(),
                rx.text(
                    "Click Refresh to update",
                    color="gray",
                    size="2",
                ),
                width="100%",
                margin_bottom="1rem",
            ),
            rx.text(
                "Real-time database viewer",
                color="gray",
                size="5",
                margin_bottom="2rem",
            ),
            rx.hstack(
                table_selector(),
                data_table(),
                width="100%",
                align_items="start",
                spacing="0",
            ),
            width="100%",
            min_height="85vh",
        ),
        width="100%",
        padding="2rem",
        on_mount=State.load_tables,
    )


app = rx.App()
app.add_page(index)
