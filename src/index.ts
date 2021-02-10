
import { QueryRequest, QueryResponse, QueryOptions, QueryActions } from '@quantleaf/query-request';
import { StandardDomain, Schema as BaseSchema, Field as BaseField, KeyWithDescriptions, SimpleDescription, unwrapDescription } from '@quantleaf/query-schema';
import axios, { AxiosError } from 'axios';
import "reflect-metadata";
export class Field extends BaseField
{
    meta?:any;
}

export interface Schema extends BaseSchema {
    fields: Field[];
}

let currentApiKey = null;
let apiEndpoint = 'https://api.query.quantleaf.com'

const fieldMetaDataSymbol = '__query_metadata__';
const fieldMetaDataKey = (constructorName:string) =>
{
    return fieldMetaDataSymbol + constructorName;
}
/**
 * Used for testing purposes only. 
 * Override API Config.
 * @param config 
 */
export const _override = (config: { apiEndpoint:string}) =>
{   
    apiEndpoint = config.apiEndpoint;
}


const simpleTypeToStandardDomain = (type:string) =>
{
   switch (type) {
        case 'Number':
           return StandardDomain.NUMBER;
        case 'Date':
            return StandardDomain.DATE;
        case 'String':
            return StandardDomain.TEXT;
        default:
            throw new Error('Unsupported type: ' +  type);
   }
}
export function ClassInfo (description: (SimpleDescription|KeyWithDescriptions)) {
    return (ctor: Function) => {

        const metaDataKey = fieldMetaDataKey(ctor.name);
        let schema:Schema = Reflect.getOwnMetadata(metaDataKey, ctor.prototype);
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
        Reflect.defineMetadata(metaDataKey,schema,ctor.prototype);
    }
}

export const getSuperClasses = (targetClass) => {
    
    const ret = [];
    if(targetClass instanceof Function){
      let baseClass = targetClass;
      while (baseClass){
        const newBaseClass = Object.getPrototypeOf(baseClass);
        
        if(newBaseClass && newBaseClass !== Object && newBaseClass.name){
          baseClass = newBaseClass;
          ret.push(newBaseClass.name);
        }else{
          break;
        }
      }
    }
    return ret;
  }

  

export function FieldInfo (description: (SimpleDescription|Field)) {
    return (target: {} | any, name?: PropertyKey): any => {
        // If description is of type SimpleDescription, then transform to Description

        const key  = name.toString();
        let descriptionTransformed = description as Field;
        if (!(description as Field).description) // description is of SimpleDescription Type
        {
            const type = Reflect.getMetadata("design:type", target, key);
            if(!type)
            {
                throw new Error('Could not find the type of field with key: '+ key);
            }
            let transformed:Field = Field.from(key,description as SimpleDescription,simpleTypeToStandardDomain(type.name));
            descriptionTransformed = transformed;
        }
        else 
        {
            const f = description as Field;
            if(!f.domain)
            {
                const type = Reflect.getMetadata("design:type", target, key);
                if(!type)
                {
                    throw new Error('Could not find the type of field with key: '+ key);
                }
                f.domain = simpleTypeToStandardDomain(type.name)
            }
            if(!f.domain)
            {
                throw new Error('Missing type for field: ' + JSON.stringify(description));
            }
            let transformed:Field = Field.from(f.key ?  f.key : key ,f.description, f.domain);
            
            transformed.meta = f.meta; // We only use meta data for the SDK

            descriptionTransformed = transformed;
        }
        const metaDataKey = fieldMetaDataKey(target.constructor.name);
        let schema:Schema = Reflect.getMetadata(metaDataKey, target);
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
     
     
        Reflect.defineMetadata(metaDataKey,schema,target);
    };
}
const getMergedSchema = (object:any):Schema =>
{
    const allFields = [];
    getSuperClasses(object.constructor).forEach((clazz)=>
    {
        const fields = (Reflect.getMetadata(fieldMetaDataKey(clazz), object) as Schema)?.fields;
        if(fields)
            allFields.push(...fields);
    });
    const subClassSchema = (Reflect.getMetadata(fieldMetaDataKey(object.constructor.name), object) as Schema);
    const ret:Schema  = {
        fields: [...subClassSchema.fields, ...allFields],
        name: subClassSchema.name,
        id: subClassSchema.id
    }
    return ret;
    
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
    const schema:Schema = getMergedSchema(object);
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


export const config = (apiKey:string):void =>
{   
    currentApiKey = apiKey;
}

export const cacheKey = (clazz:any) => 
{
    return clazz.constructor?.name;
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
    actions: QueryActions,
    options?:QueryOptions,
    cacheSchemas:boolean = true
    ) : Promise<QueryResponse> =>
    {
        const schemas:Schema[] = [];
        // Get or build schemas,
        const keysConsumed = new Set();
        clazzes.forEach((clazz)=>
        {
            if(!clazz)
                return;
                const ck = cacheKey(clazz);
                if(keysConsumed.has(ck))
            {
                throw new Error('Duplicate class names for: '  + cacheKey + ', class names must be unique');
            }
            keysConsumed.add(ck);
            let schemaCache = translationCache.get(ck);
            if(!schemaCache)
            {
                schemaCache = generateSchema(clazz);
                if(cacheSchemas)
                    translationCache.set(ck,schemaCache);
            }
            for (let i = 0; i < schemaCache.fields.length; i++) {
                if(schemaCache.fields[i].meta)
                {
                    schemaCache.fields[i] = (({meta,...o}) => (o))(schemaCache.fields[i]); // strip meta data
                }   
            }
            schemas.push(schemaCache);
        });

        // Perform translatio using a web client
        const queryRequest:QueryRequest = {
            text: text,
            schemas: schemas,
            options: options,
            actions: actions
        }
      
        if(!currentApiKey)
            throw new Error('Missing API Key, provide one by invoking "config" once')

        const resp = await axios({
            method: 'post',
            url:  apiEndpoint + '/translate',
            headers: 
            {
                'X-API-KEY' :  currentApiKey
            },
            data: queryRequest
        }).catch((error:AxiosError)=>
        {
            console.error('Failed to perform Quantleaf Query translate request', error.response?.data);
            throw error;
        });
    return resp.data as QueryResponse
}

  