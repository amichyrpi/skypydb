"""
Dashboard launcher for Skypydb.
"""

import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Optional
import uvicorn
from rich import print
from skypydb.api.server import app


# start the dashboard backend server
def start_api_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    db_path: Optional[str] = None,
    vector_db_path: Optional[str] = None,
) -> None:
    """
    Start the FastAPI server.
    
    Args:
        host: Host to bind the server to
        port: Port to run the server on
        db_path: Path to the main database file
        vector_db_path: Path to the vector database file
    """

    # Set environment variables for database paths
    if db_path:
        os.environ["SKYPYDB_PATH"] = db_path
    if vector_db_path:
        os.environ["SKYPYDB_VECTOR_PATH"] = vector_db_path

    print(f"[green]Starting API server at http://{host}:{port}[/green]")

    # Run the uvicorn server
    uvicorn.run(app, host=host, port=port, log_level="info")


# start the dashboard frontend server
def start_dashboard_frontend(
    dashboard_dir: Path,
    port: int = 3000,
) -> None:
    """
    Start the Next.js dashboard frontend.

    Args:
        dashboard_dir: Path to the dashboard directory
        port: Port to run the dashboard on
    """

    print(f"[green]Starting dashboard frontend at http://localhost:{port}[/green]")
    print(f"[dim]Dashboard directory: {dashboard_dir}[/dim]\n")

    # Set environment variables for the dashboard
    env = os.environ.copy()
    env["PORT"] = str(port)

    try:
        # Run npm run dev in the dashboard directory
        subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=dashboard_dir,
            env=env
        )
    except subprocess.CalledProcessError as exc:
        print(f"[red]Error: Dashboard failed to start: {exc}[/red]")
        sys.exit(1)


def start_dashboard(
    api_host: str = "0.0.0.0",
    api_port: int = 8000,
    dashboard_port: int = 3000,
    db_path: Optional[str] = None,
    vector_db_path: Optional[str] = None,
) -> None:
    """
    Start both the API server and dashboard frontend.
    
    This function starts the FastAPI backend server in a separate thread
    and runs the Next.js frontend in the main thread.
    
    Args:
        api_host: Host to bind the API server to
        api_port: Port to run the API server on
        dashboard_port: Port to run the dashboard frontend on
        db_path: Path to the main database file
        vector_db_path: Path to the vector database file
    """

    # Get the dashboard directory
    dashboard_dir = Path(__file__).parent.parent / "dashboard"

    # Check if dashboard exists
    if not dashboard_dir.exists():
        print(f"[red]Error: Dashboard not found at {dashboard_dir}[/red]")
        sys.exit(1)

    print("[bold cyan]Starting Skypydb Dashboard.[/bold cyan]\n")

    # Start the API server in a separate thread
    api_thread = threading.Thread(
        target=start_api_server,
        args=(api_host, api_port, db_path, vector_db_path),
        daemon=True
    )
    api_thread.start()

    # Wait a moment for the API server to start
    time.sleep(2)

    # Start the dashboard frontend in the main thread

    start_dashboard_frontend(dashboard_dir, dashboard_port)


if __name__ == "__main__":
    start_dashboard()
