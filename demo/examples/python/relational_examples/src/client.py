import skypydb

SCHEMA = {
    "tables": {
        "users": {
            "fields": {
                "name": {"type": "string"},
                "email": {"type": "string"},
            },
            "indexes": [{"name": "users_email_idx", "columns": ["email"]}],
        },
        "tasks": {
            "fields": {
                "title": {"type": "string"},
                "userId": {"type": "id", "table": "users"},
                "isCompleted": {"type": "boolean"},
            },
            "indexes": [
                {"name": "tasks_user_idx", "columns": ["userId"]},
                {"name": "tasks_status_idx", "columns": ["isCompleted"]},
            ],
        },
    }
}


def main() -> None:
    client = skypydb.httpClient(
        api_url="http://localhost:8000",
        api_key="local-dev-key",
    )

    users = client.relational("users")
    tasks = client.relational("tasks")

    client.schema.apply(SCHEMA)

    user_id = users.insert(
        {
            "name": "Theo",
            "email": "theo@example.com",
        }
    )

    tasks.insert(
        {
            "title": "Write relational feature",
            "userId": user_id,
            "isCompleted": False,
        }
    )
    tasks.insert(
        {
            "title": "Test query operators",
            "userId": user_id,
            "isCompleted": False,
        }
    )

    open_before = tasks.count(
        where={
            "$and": [
                {"userId": {"$eq": user_id}},
                {"isCompleted": {"$eq": False}},
            ]
        }
    )
    print("Open tasks before complete:", open_before)

    task_rows = tasks.query(
        where={"userId": {"$eq": user_id}},
        orderBy=[{"field": "_createdAt", "direction": "asc"}],
    )
    print("Tasks:", task_rows)

    if task_rows:
        first_task = task_rows[0]
        tasks.update(
            id=str(first_task["_id"]),
            value={
                "title": str(first_task["title"]),
                "userId": str(first_task["userId"]),
                "isCompleted": True,
            },
        )

    open_after = tasks.count(
        where={
            "$and": [
                {"userId": {"$eq": user_id}},
                {"isCompleted": {"$eq": False}},
            ]
        }
    )
    print("Open tasks after complete:", open_after)

    user_rows = users.query(orderBy=[{"field": "_createdAt", "direction": "asc"}])
    print("Users:", user_rows)

    client.close()


if __name__ == "__main__":
    main()
