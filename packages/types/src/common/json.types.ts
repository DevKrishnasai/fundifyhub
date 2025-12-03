/**
 * Common JSON value types for type-safe JSON handling
 * @module common/json.types
 */

/** Primitive JSON values */
export type JsonPrimitive = string | number | boolean | null;

/** JSON array type */
export type JsonArray = JsonValue[];

/** JSON object type */
export type JsonObject = { [key: string]: JsonValue };

/** Union of all valid JSON values */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
