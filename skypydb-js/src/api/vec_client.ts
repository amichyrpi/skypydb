import fs from "node:fs";
import path from "node:path";
import { Collection } from "./collection";
import { ClientUtilitiesMixin } from "./mixins/vector";
import { VectorDatabase } from "../database/vector_db";
import { get_embedding_function } from "../embeddings/mixins/get_embeddings_function";
import type { Metadata, VecClientOptions } from "../types";

class VecClientBase extends ClientUtilitiesMixin {}

export class vecClient extends VecClientBase {
  readonly path: string;
  protected _db: VectorDatabase;
  protected _collections: Map<string, Collection>;

  constructor(options: VecClientOptions = {}) {
    super();
    const { embedding_provider = "ollama", embedding_model_config } = options;
    if (
      embedding_model_config !== undefined &&
      (typeof embedding_model_config !== "object" ||
        embedding_model_config === null ||
        Array.isArray(embedding_model_config))
    ) {
      throw new TypeError(
        "embedding_model_config must be a dictionary when provided.",
      );
    }

    const db_path = path.join("skypydb", "vector.db");
    fs.mkdirSync(path.dirname(db_path), { recursive: true });

    const provider = embedding_provider.toLowerCase().trim().replace(/_/g, "-");
    const model_config = { ...(embedding_model_config ?? {}) };

    this.path = db_path;
    const embedding_function = get_embedding_function(provider, model_config);
    this._db = new VectorDatabase(db_path, embedding_function);
    this._collections = new Map();
  }

  async create_collection(
    name: string,
    metadata?: Metadata,
    get_or_create = false,
  ): Promise<Collection> {
    return super.create_collection(name, metadata, get_or_create);
  }

  async get_collection(name: string): Promise<Collection> {
    return super.get_collection(name);
  }

  async get_or_create_collection(
    name: string,
    metadata?: Metadata,
  ): Promise<Collection> {
    return super.get_or_create_collection(name, metadata);
  }

  async list_collections(): Promise<Collection[]> {
    return super.list_collections();
  }

  async delete_collection(name: string): Promise<void> {
    return super.delete_collection(name);
  }

  async reset(): Promise<boolean> {
    return super.reset();
  }

  async heartbeat(): Promise<number> {
    return super.heartbeat();
  }

  async close(): Promise<void> {
    this._db.close();
    this._collections.clear();
  }
}
