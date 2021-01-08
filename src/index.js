"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.translate = exports.generateSchema = exports.FieldInfo = exports.ClassInfo = void 0;
var query_schema_1 = require("@quantleaf/query-schema");
var axios_1 = require("axios");
require("reflect-metadata");
var dotenv = require("dotenv");
dotenv.config();
var fieldMetaDataSymbol = '__query_metadata__';
var simpleTypeToStandardDomainType = function (type) {
    switch (type) {
        case 'Number':
            return query_schema_1.StandardDomainType.NUMBER;
        case 'Date':
            return query_schema_1.StandardDomainType.DATE;
        case 'String':
            return query_schema_1.StandardDomainType.TEXT;
        default:
            throw new Error('Unsupported type: ' + type);
    }
};
function ClassInfo(description) {
    return function (ctor) {
        var schema = Reflect.getMetadata(fieldMetaDataSymbol, ctor.prototype);
        if (!schema) {
            schema = {
                name: {
                    key: null,
                    description: {}
                },
                fields: []
            };
        }
        if (description.description) {
            schema.name = description;
            schema.name.description = query_schema_1.unwrapDescription(schema.name.description);
        }
        else {
            schema.name.description = query_schema_1.unwrapDescription(description);
        }
        if (!schema.name.key) {
            schema.name.key = ctor.name;
        }
        Reflect.defineMetadata(fieldMetaDataSymbol, schema, ctor.prototype);
    };
}
exports.ClassInfo = ClassInfo;
function FieldInfo(description) {
    return function (target, name) {
        // If description is of type SimpleDescription, then transform to Description
        var key = name.toString();
        var descriptionTransformed = description;
        var type = null;
        if (!description.description) // description is of SimpleDescription Type
         {
            var type_1 = Reflect.getMetadata("design:type", target, key);
            var transformed = query_schema_1.Field.from(key, description, simpleTypeToStandardDomainType(type_1.name));
            descriptionTransformed = transformed;
        }
        else {
            var f = description;
            if (!f.domain) {
                var type_2 = Reflect.getMetadata("design:type", target, key);
                f.domain = simpleTypeToStandardDomainType(type_2.name);
            }
            if (!f.domain) {
                throw new Error('Missing type for field: ' + JSON.stringify(description));
            }
            var transformed = query_schema_1.Field.from(f.key ? f.key : key, f.description, f.domain);
            descriptionTransformed = transformed;
        }
        var schema = Reflect.getMetadata(fieldMetaDataSymbol, target);
        if (!schema) {
            schema = {
                name: {
                    description: {},
                    key: null
                },
                fields: []
            };
        }
        if (!descriptionTransformed.key)
            descriptionTransformed.key = key;
        schema.fields.push(descriptionTransformed);
        Reflect.defineMetadata(fieldMetaDataSymbol, schema, target);
    };
}
exports.FieldInfo = FieldInfo;
var validateSchema = function (schema) {
    var fieldKeys = new Set();
    schema.fields.forEach(function (field) {
        if (fieldKeys.has(field.key)) {
            throw new Error('Duplicate field: ' + field.key);
        }
        fieldKeys.add(field.key);
    });
};
/**
 * @param object
 */
exports.generateSchema = function (object) {
    var _a;
    var schema = Reflect.getMetadata(fieldMetaDataSymbol, object);
    if (!schema) {
        throw new Error('Failed to create schema');
    }
    if (!(schema === null || schema === void 0 ? void 0 : schema.name.key)) {
        throw new Error('Missing schema name, use @ClassInfo on the class');
    }
    if (isEmptyObject(schema === null || schema === void 0 ? void 0 : schema.name.description)) {
        throw new Error('Missing desciption');
    }
    if (!(((_a = schema === null || schema === void 0 ? void 0 : schema.fields) === null || _a === void 0 ? void 0 : _a.length) > 0)) {
        throw new Error('Missing fields, must provide atleast one definition using @FieldInfo');
    }
    validateSchema(schema);
    return schema;
};
var isEmptyObject = function (obj) { return obj ? Object.getOwnPropertyNames(obj).length === 0 : true; };
var translationCache = new Map();
/**
 * @param text, the text we want to translate into @QueryResult object
 * @param actions, the actions to perform, at least on of query or suggest has to be non null
 * @param query, if true, a query translation will be performed
 * @param suggest, if empty object, or object with suggetion 'limit' then suggestions will be calculated
 * @param clazzes, instances of classes annotated the descriptive schema annotations
 * @param options, additional options, read about these options at [API documentation](https://github.com/quantleaf/query/blob/main/API.md), Default: API defaults
 * @param cacheSchemas, If true generated schemas will be cached locally for performance benifits. Default: true
 
 */
exports.translate = function (text, clazzes, actions, options, cacheSchemas) {
    if (options === void 0) { options = {}; }
    if (cacheSchemas === void 0) { cacheSchemas = true; }
    return __awaiter(void 0, void 0, void 0, function () {
        var schemas, keysConsumed, queryRequest, apiKey, resp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    schemas = [];
                    keysConsumed = new Set();
                    clazzes.forEach(function (clazz) {
                        var _a;
                        if (!clazz)
                            return;
                        var cacheKey = (_a = clazz.constructor) === null || _a === void 0 ? void 0 : _a.name;
                        if (keysConsumed.has(cacheKey)) {
                            throw new Error('Duplicate class names for: ' + cacheKey + ', class names must be unique');
                        }
                        keysConsumed.add(cacheKey);
                        var schemaCache = translationCache.get(cacheKey);
                        if (!schemaCache) {
                            schemaCache = exports.generateSchema(clazz);
                            if (cacheSchemas)
                                translationCache.set(cacheKey, schemaCache);
                        }
                        schemas.push(schemaCache);
                    });
                    queryRequest = {
                        text: text,
                        fuzzy: options.fuzzy,
                        languageFilter: options.languageFilter,
                        concurrencySize: options.concurrencySize,
                        schemas: schemas,
                        query: actions.query,
                        suggest: actions.suggest
                    };
                    apiKey = process.env.API_KEY;
                    if (!apiKey)
                        throw new Error('Missing API Key, include one by creating and .env file with content "API_KEY=YOUR API KEY"');
                    return [4 /*yield*/, axios_1["default"]({
                            method: 'post',
                            url: 'https://api.query.quantleaf.com/translate',
                            headers: {
                                'X-API-KEY': apiKey
                            },
                            data: queryRequest
                        })["catch"](function (error) {
                            var _a;
                            console.error('Failed to perform Quantleaf Query translate request', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
                            throw error;
                        })];
                case 1:
                    resp = _a.sent();
                    return [2 /*return*/, resp.data];
            }
        });
    });
};
