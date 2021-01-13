# Quantleaf Query SDK Node
***Client has only been tested with Node v14.15.1 and Typescript 3.9.7***


## Setup

```bash
    npm install @quantleaf/query-sdk-node
```

In your *tsconfig.json* file put following properties
```javascript
    ...
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    ...
```
This library uses decorators to provide information about fields, hence these settings are necessary.

Obtain an API key at the [account page](https://account.quantleaf.com) (free if you create an account).



## Import 
```javascript 
import {ClassInfo, FieldInfo, translate, config} from '@quantleaf/query-sdk-node';

```
There are two decorators you have to use to describe the database schema, *ClassInfo* and *FieldInfo*

### Describing the class

Key from class name, one description in 'ANY' language
```javascript

@ClassInfo('My class') 
public class MyClass 
{
...

```


Describing the class with *ClassInfo*

Key from class name, multiple descriptions in 'ANY' language
```javascript

@ClassInfo(['My class','Min klass']) 
export class MyClass 
{
...

```

Describing the class with *ClassInfo*
When describing fields we have to provide at most 3 things. 

*key*, can be assumed from the class name.

*description*, the description of the class.


Key from class name, multiple descriptions in multiple languages
```javascript

@ClassInfo(
    {
        SV: ['Min klass']
        EN: ['Min klass']
    }
) 
export class MyClass 
{
...
```` 

Custom key and and multiple descriptions in multiple languages
```javascript

@ClassInfo(
    {
        key: 'Custom key',
        description: {
            SV: ['Min klass']
            EN: ['Min klass']
        }
    }
) 
export class MyClass 
{
...

```

### Describing fields
When describing fields we have to provide at most 3 things. 

*key*, can be assumed from the field name.

*domain*, can be assumed from the field type. If you want to use an *EnumDomain*, you have to provide this. More information about the domains are found in the [API documentation](https://github.com/quantleaf/query/blob/master/API.md).

*description*, the description of the field. Follows the same format as for the *description* from *ClassInfo* decorator.

Key from field name, type from field value type, single description in 'ANY' language
```javascript

@FieldInfo('price')
price:number

```
Key from field name, type from field value type, multiple descriptions in 'ANY' language
```javascript

@FieldInfo(['price','pris'])
price:number

```
Key from field name, type from field value type, multiple descriptions in multiple languages. 
```javascript

@FieldInfo({
    SV: 'pris',
    EN: ['price','cost']
})
price:number

```

Custom key and custom *EnumDomain* type with multiple descriptions in multiple languages. 

```javascript

@FieldInfo({
    description: 'price',
    key: 'custom-key',
    domain: {
        LONDON: 'London',
        COPENHAGEN : {
            SV: 'Köpenhamn',
            EN: 'Copenhagen'
        }
    }
})
city:string

```

## Request
### Authorization
Authorize yourself with the *config* function (once).
```javascript
config(API_KEY);
```

### Translation request

Assume that we have decorated a class named *Recipe*

```javascript
const response = translate(
    'Some query',
    [new Recipe()],
    {
    query: {},
    suggest: {}
});

```

*response* will be a promise. The response is explained in detail in the end of the [API documentation](https://github.com/quantleaf/query/blob/master/API.md).

The request above will both request a translated query and suggestions. 



## Questions, feature requests, problems? 
Create an [issue](https://github.com/quantleaf/query-sdk-node/issues)!



