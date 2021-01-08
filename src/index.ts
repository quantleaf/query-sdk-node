
import { LanguageCode } from '@quantleaf/code-language';
import { QueryRequest, QueryResponse } from '@quantleaf/query-request';
import { QueryResult } from '@quantleaf/query-result';
import { StandardDomainType,  Schema, Field, KeyWithDescriptions, SimpleDescription,unwrapDescription} from '@quantleaf/query-schema';
import axios, { AxiosError } from 'axios';
import "reflect-metadata";
import * as dotenv from  'dotenv';
dotenv.config();
const fieldMetaDataSymbol = '__query_metadata__';
const simpleTypeToStandardDomainType = (type:string) =>
{
   switch (type) {
        case 'Number':
           return StandardDomainType.NUMBER;
        case 'Date':
            return StandardDomainType.DATE;
        case 'String':
            return StandardDomainType.TEXT;
        default:
            throw new Error('Unsupported type: ' +  type);
   }
}
export function ClassInfo (description: (SimpleDescription|KeyWithDescriptions)) {
    return (ctor: Function) => {
        let schema:Schema = Reflect.getMetadata(fieldMetaDataSymbol, ctor.prototype);
        if(!schema)
        {
            schema = {
                name: {
                    key: null,
                    description: {}
                },
                fields: []
            };
        }
        if((description as KeyWithDescriptions).description)
        {
            schema.name = description as KeyWithDescriptions;
            schema.name.description = unwrapDescription(schema.name.description);
        }
        else 
        {
            schema.name.description = unwrapDescription(description as SimpleDescription);
        }
        if(!schema.name.key)
        {
            schema.name.key  = ctor.name;
        }
        Reflect.defineMetadata(fieldMetaDataSymbol,schema,ctor.prototype);
    }
}

export function FieldInfo (description: (SimpleDescription|Field)) {
    return (target: {} | any, name?: PropertyKey): any => {
        // If description is of type SimpleDescription, then transform to Description
        const key  = name.toString();
        let descriptionTransformed = description as Field;
        let type = null;
        if (!(description as Field).description) // description is of SimpleDescription Type
        {

            const type = Reflect.getMetadata("design:type", target, key);
            let transformed:Field = Field.from(key,description as SimpleDescription,simpleTypeToStandardDomainType(type.name));
            descriptionTransformed = transformed;
        }
        else 
        {
            const f = description as Field;
            if(!f.domain)
            {
                const type = Reflect.getMetadata("design:type", target, key);
                f.domain = simpleTypeToStandardDomainType(type.name)
            }
            if(!f.domain)
            {
                throw new Error('Missing type for field: ' + JSON.stringify(description));
            }
            let transformed:Field = Field.from(f.key ?  f.key : key ,f.description, f.domain);
            descriptionTransformed = transformed;
        }

        let schema:Schema = Reflect.getMetadata(fieldMetaDataSymbol, target);
        if(!schema)
        {
            schema = {
                name: {
                    description: {},
                    key: null
                },
                fields : []
            };
        }
        if(!descriptionTransformed.key)
            descriptionTransformed.key = key;

        schema.fields.push(descriptionTransformed);
     
     
        Reflect.defineMetadata(fieldMetaDataSymbol,schema,target);
    };
}
const validateSchema = (schema:Schema) => 
{
    const fieldKeys = new Set<string>();
    schema.fields.forEach((field) => {
        if(fieldKeys.has(field.key))
        {
            throw new Error('Duplicate field: ' + field.key);
        }
        fieldKeys.add(field.key);
    });
    
}
/**
 * @param object 
 */
export const generateSchema = (object:any):Schema =>  
{
    const schema:Schema =  Reflect.getMetadata(fieldMetaDataSymbol, object);
    if(!schema)
    {
        throw new Error('Failed to create schema');
    }
    if(!schema?.name.key)
    {
        throw new Error('Missing schema name, use @ClassInfo on the class');
    }
    if(isEmptyObject(schema?.name.description))
    {
        throw new Error('Missing desciption');
    }
    if(!(schema?.fields?.length > 0))
    {
        throw new Error('Missing fields, must provide atleast one definition using @FieldInfo');
    }
    validateSchema(schema);
    return schema;
}
  
const isEmptyObject = (obj) => obj ? Object.getOwnPropertyNames(obj).length === 0 :  true;

const translationCache:Map<string,Schema> = new Map();

export interface QueryOptions 
{
    fuzzy?:boolean,
    languageFilter?:LanguageCode[],
    concurrencySize?:number
}


/**
 * @param text, the text we want to translate into @QueryResult object
 * @param actions, the actions to perform, at least on of query or suggest has to be non null
 * @param query, if true, a query translation will be performed
 * @param suggest, if empty object, or object with suggetion 'limit' then suggestions will be calculated
 * @param clazzes, instances of classes annotated the descriptive schema annotations
 * @param options, additional options, read about these options at [API documentation](https://github.com/quantleaf/query/blob/main/API.md), Default: API defaults
 * @param cacheSchemas, If true generated schemas will be cached locally for performance benifits. Default: true
 
 */
export const translate = async (
    text:string, 
    clazzes:any[], 
    actions: {
        query?: {},
        suggest?: { limit?:number }
    },
    options:QueryOptions  = {},
    cacheSchemas:boolean = true
    ) : Promise<QueryResponse> =>
    {
        const schemas = [];
        // Get or build schemas,
        const keysConsumed = new Set();
        clazzes.forEach((clazz)=>
        {
            if(!clazz)
                return;
            const cacheKey = clazz.constructor?.name;
            if(keysConsumed.has(cacheKey))
            {
                throw new Error('Duplicate class names for: '  + cacheKey + ', class names must be unique');
            }
            keysConsumed.add(cacheKey);
            let schemaCache = translationCache.get(cacheKey);
            if(!schemaCache)
            {
                schemaCache = generateSchema(clazz);
                if(cacheSchemas)
                    translationCache.set(cacheKey,schemaCache);
            }
            schemas.push(schemaCache);
        });

        // Perform translatio using a web client
        const queryRequest:QueryRequest = {
            text: text,
            fuzzy:options.fuzzy,
            languageFilter: options.languageFilter,
            concurrencySize: options.concurrencySize,
            schemas: schemas,
            query: actions.query,
            suggest: actions.suggest
        }
      
        const apiKey = process.env.API_KEY;
        if(!apiKey)
            throw new Error('Missing API Key, include one by creating and .env file with content "API_KEY=YOUR API KEY"')

        const resp = await axios({
            method: 'post',
            url:  'https://api.query.quantleaf.com/translate',
            headers: 
            {
                'X-API-KEY' :  apiKey
            },
            data: queryRequest
        }).catch((error:AxiosError)=>
        {
            console.error('Failed to perform Quantleaf Query translate request', error.response?.data);
            throw error;
        });
    return resp.data as QueryResponse
}

  