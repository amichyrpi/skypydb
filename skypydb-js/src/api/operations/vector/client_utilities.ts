import {
  heartbeat_client,
  reset_client,
} from "../../../utils/client_utilities";
import { DeleteCollectionMixin } from "./delete_collection";
import type { VectorDatabase } from "../../../database/vector_database";

export class ClientUtilitiesMixin extends DeleteCollectionMixin {
  async reset(): Promise<boolean> {
    return reset_client(this._db, this._collections);
  }

  async heartbeat(): Promise<number> {
    return heartbeat_client();
  }
}
