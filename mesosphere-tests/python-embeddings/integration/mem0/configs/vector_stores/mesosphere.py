from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MesosphereConfig(BaseModel):
    api_url: str = Field(..., description="Mesosphere API URL.")
    api_key: str = Field(..., description="Mesosphere API key.")
    collection_name: str = Field("mem0", description="Collection name.")

    @model_validator(mode="before")
    @classmethod
    def validate_extra_fields(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        allowed_fields = set(cls.model_fields.keys())
        input_fields = set(values.keys())
        extra_fields = input_fields - allowed_fields
        if extra_fields:
            raise ValueError(
                f"Extra fields not allowed: {', '.join(sorted(extra_fields))}. "
                f"Allowed fields: {', '.join(sorted(allowed_fields))}"
            )
        return values

    model_config = ConfigDict(arbitrary_types_allowed=True)
