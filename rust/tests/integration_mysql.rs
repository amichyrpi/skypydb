use std::collections::BTreeMap;
use std::env;

use serde_json::json;
use sqlx::MySqlPool;
use uuid::Uuid;

use skypydb_common::schema::types::{
    FieldDefinition, FieldType, SchemaDocument, SchemaMigrations, TableDefinition,
    TableIndexDefinition, TableMigrationRule,
};
use skypydb_mysql::run_bootstrap_migrations;
use skypydb_relational::domain::schema::planner::apply_schema;
use skypydb_relational::repositories::relational_repo::{
    MoveOptions, RelationalQueryOptions, RelationalRepository,
};
use skypydb_vector::repository::{NewVectorItem, VectorRepository};

fn optional(inner: FieldDefinition) -> FieldDefinition {
    FieldDefinition {
        field_type: FieldType::Optional,
        table: None,
        shape: BTreeMap::new(),
        inner: Some(Box::new(inner)),
    }
}

fn string_field() -> FieldDefinition {
    FieldDefinition {
        field_type: FieldType::String,
        table: None,
        shape: BTreeMap::new(),
        inner: None,
    }
}

fn number_field() -> FieldDefinition {
    FieldDefinition {
        field_type: FieldType::Number,
        table: None,
        shape: BTreeMap::new(),
        inner: None,
    }
}

fn bool_field() -> FieldDefinition {
    FieldDefinition {
        field_type: FieldType::Boolean,
        table: None,
        shape: BTreeMap::new(),
        inner: None,
    }
}

fn id_field(table: &str) -> FieldDefinition {
    FieldDefinition {
        field_type: FieldType::Id,
        table: Some(table.to_string()),
        shape: BTreeMap::new(),
        inner: None,
    }
}

fn object_field() -> FieldDefinition {
    let mut shape = BTreeMap::new();
    shape.insert("priority".to_string(), number_field());
    FieldDefinition {
        field_type: FieldType::Object,
        table: None,
        shape,
        inner: None,
    }
}

#[tokio::test]
async fn relational_and_vector_integration_smoke() -> Result<(), Box<dyn std::error::Error>> {
    let mysql_url = match env::var("SKYPYDB_TEST_MYSQL_URL") {
        Ok(value) => value,
        Err(_) => {
            eprintln!("SKYPYDB_TEST_MYSQL_URL not set; skipping integration_mysql test");
            return Ok(());
        }
    };

    let pool = MySqlPool::connect(&mysql_url).await?;
    run_bootstrap_migrations(&pool).await?;

    let suffix = Uuid::new_v4().simple().to_string();
    let users_table = format!("users_{}", &suffix[..8]);
    let tasks_table = format!("tasks_{}", &suffix[..8]);
    let todo_table = format!("todo_{}", &suffix[..8]);
    let done_table = format!("done_{}", &suffix[..8]);

    let mut users_fields = BTreeMap::new();
    users_fields.insert("name".to_string(), string_field());
    users_fields.insert("email".to_string(), string_field());

    let mut tasks_fields = BTreeMap::new();
    tasks_fields.insert("title".to_string(), string_field());
    tasks_fields.insert("user_id".to_string(), id_field(&users_table));
    tasks_fields.insert("completed".to_string(), bool_field());
    tasks_fields.insert("details".to_string(), optional(object_field()));

    let mut todo_fields = BTreeMap::new();
    todo_fields.insert("title".to_string(), string_field());
    todo_fields.insert("is_done".to_string(), bool_field());

    let mut done_fields = BTreeMap::new();
    done_fields.insert("title".to_string(), string_field());
    done_fields.insert("is_done".to_string(), bool_field());
    done_fields.insert("done_at".to_string(), optional(string_field()));

    let mut tables = BTreeMap::new();
    tables.insert(
        users_table.clone(),
        TableDefinition {
            fields: users_fields,
            indexes: vec![TableIndexDefinition {
                name: format!("idx_{}_email", users_table),
                columns: vec!["email".to_string()],
            }],
        },
    );
    tables.insert(
        tasks_table.clone(),
        TableDefinition {
            fields: tasks_fields,
            indexes: Vec::new(),
        },
    );
    tables.insert(
        todo_table.clone(),
        TableDefinition {
            fields: todo_fields,
            indexes: Vec::new(),
        },
    );
    tables.insert(
        done_table.clone(),
        TableDefinition {
            fields: done_fields,
            indexes: Vec::new(),
        },
    );

    let mut migration_tables = BTreeMap::new();
    migration_tables.insert(
        done_table.clone(),
        TableMigrationRule {
            from: Some(todo_table.clone()),
            field_map: BTreeMap::new(),
            defaults: {
                let mut defaults = BTreeMap::new();
                defaults.insert("done_at".to_string(), json!("bootstrapped"));
                defaults
            },
        },
    );

    let schema = SchemaDocument {
        tables,
        migrations: SchemaMigrations {
            tables: migration_tables,
        },
    };
    let _ = apply_schema(&pool, &schema).await?;

    let relational = RelationalRepository::new(pool.clone(), 200);
    let user_id = relational
        .insert(
            &users_table,
            &json!({
                "name": "Ada",
                "email": "ada@example.com"
            }),
        )
        .await?;
    relational
        .insert(
            &tasks_table,
            &json!({
                "title": "Write docs",
                "user_id": user_id,
                "completed": false,
                "details": { "priority": 1 }
            }),
        )
        .await?;

    let task_count = relational.count(&tasks_table, None).await?;
    assert_eq!(task_count, 1);

    let updated = relational
        .update(
            &tasks_table,
            None,
            Some(&json!({"title": {"$eq": "Write docs"}})),
            &json!({
                "title": "Write API docs",
                "user_id": user_id,
                "completed": true,
                "details": { "priority": 2 },
                "extra_note": "stored in extras"
            }),
        )
        .await?;
    assert_eq!(updated, 1);

    let first_task = relational
        .first(
            &tasks_table,
            RelationalQueryOptions {
                where_clause: Some(json!({"completed": {"$eq": true}})),
                ..RelationalQueryOptions::default()
            },
        )
        .await?;
    assert!(first_task.is_some());

    let bad_delete = relational.delete(&users_table, Some(&user_id), None).await;
    assert!(bad_delete.is_err());

    let deleted_tasks = relational
        .delete(
            &tasks_table,
            None,
            Some(&json!({"completed": {"$eq": true}})),
        )
        .await?;
    assert_eq!(deleted_tasks, 1);

    let deleted_users = relational
        .delete(&users_table, Some(&user_id), None)
        .await?;
    assert_eq!(deleted_users, 1);

    let todo_id = relational
        .insert(
            &todo_table,
            &json!({
                "title": "Ship release",
                "is_done": true
            }),
        )
        .await?;
    let moved = relational
        .move_rows(
            &todo_table,
            &MoveOptions {
                to_table: done_table.clone(),
                id: Some(todo_id),
                where_clause: None,
                field_map: BTreeMap::new(),
                defaults: {
                    let mut defaults = BTreeMap::new();
                    defaults.insert("done_at".to_string(), json!("today"));
                    defaults
                },
            },
        )
        .await?;
    assert_eq!(moved, 1);

    let vector = VectorRepository::new(pool.clone(), 4096);
    let collection_name = format!("it_{}", &suffix[..10]);
    let _collection = vector.create_collection(&collection_name, None).await?;
    let _ids = vector
        .add_items(
            &collection_name,
            &[
                NewVectorItem {
                    id: None,
                    embedding: vec![1.0, 0.0, 0.0],
                    document: Some("alpha".to_string()),
                    metadata: Some(json!({"source": "test"})),
                },
                NewVectorItem {
                    id: None,
                    embedding: vec![0.0, 1.0, 0.0],
                    document: Some("beta".to_string()),
                    metadata: Some(json!({"source": "test"})),
                },
            ],
        )
        .await?;

    let query = vector
        .query(&collection_name, &[vec![1.0, 0.0, 0.0]], 1)
        .await?;
    assert_eq!(query.ids.len(), 1);
    assert_eq!(query.ids[0].len(), 1);

    Ok(())
}
