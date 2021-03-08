import { LanguageCode } from '@quantleaf/code-language';
import { Schema} from '../src/index';
import { StandardDomain } from '@quantleaf/query-schema'; 
import { expect } from 'chai';
import {ClassInfo, FieldInfo,generateSchema, translate, config, _override } from '../src/index'
import * as dotenv from 'dotenv';


dotenv.config();
config(process.env.API_KEY);

describe('Query schema builder testing', function() {
    it('Test field and class info simple', function() 
    {
        @ClassInfo({ SV: ['sv'], EN: ['en'] })
        class Clazz {
            @FieldInfo({
                SV: ['sv'],
                EN: ['en']
            })
            numberField:number;

            @FieldInfo({
                EN: ['en']
            })
            stringField:string;

            @FieldInfo({
                SV: ['sv'],
            })
            dateField:Date;
        }

        const schema:Schema = generateSchema(new Clazz());
        expect(schema.name.key).equals('Clazz');
        expect(schema.name.description['SV']).deep.equals(['sv']);
        expect(schema.name.description['EN']).deep.equals(['en']);
        expect(Object.keys(schema.fields).length).equals(3);
        expect(schema.fields[0].domain).equals(StandardDomain.NUMBER);
        expect(schema.fields[0].key).equals('numberField');
        expect(schema.fields[0].description['SV']).deep.equals(['sv']);
        expect(schema.fields[0].description['EN']).deep.equals(['en']);
        expect(schema.fields[1].domain).equals(StandardDomain.TEXT);
        expect(schema.fields[1].key).equals('stringField');
        expect(schema.fields[1].description['EN']).deep.equals(['en']);
        expect(schema.fields[1].description['SV']).undefined;
        expect(schema.fields[2].domain).equals(StandardDomain.DATE);
        expect(schema.fields[2].key).equals('dateField');
        expect(schema.fields[2].description['SV']).deep.equals(['sv']);
        expect(schema.fields[2].description['EN']).undefined;
    });


    it('Test field and class info renaming keys', function() 
    {
        @ClassInfo({
            description: { SV: ['sv'], EN: ['en'] },
            key: 'custom-clazz'
        })
        class Clazz {
            @FieldInfo({
                key: 'custon-number',
                description: {
                    SV: 'sv',
                    EN: 'en'
                }
            })
            numberField:number;

        }
        const schema:Schema = generateSchema(new Clazz());
        expect(schema.name.key).equals('custom-clazz');
        expect(schema.name.description['SV']).deep.equals(['sv']);
        expect(schema.name.description['EN']).deep.equals(['en']);
        expect(Object.keys(schema.fields).length).equals(1);
        expect(schema.fields[0].domain).equals(StandardDomain.NUMBER);
        expect(schema.fields[0].key).equals('custon-number');
        expect(schema.fields[0].description['SV']).deep.equals(['sv']);
        expect(schema.fields[0].description['EN']).deep.equals(['en']);
    });

    it('Test any language codes', function() 
    {
        @ClassInfo({
            description: 'text'
        })
        class Clazz {
            @FieldInfo({
                key:'custom-number',
                description: 'text'
            })
            numberField:number;
        }

        const schema:Schema = generateSchema(new Clazz());
        expect(schema.name.key).equals('Clazz');
        expect(schema.name.description[LanguageCode.ANY]).deep.equals(['text']);
        expect(Object.keys(schema.fields).length).equals(1);
        expect(schema.fields[0].domain).equals(StandardDomain.NUMBER);
        expect(schema.fields[0].key).equals('custom-number');
        expect(schema.fields[0].description[LanguageCode.ANY]).deep.equals(['text']);

    });


    it('Test any language codes 2', function() 
    {
        @ClassInfo('text')
        class Clazz {
            @FieldInfo('text')
            numberField:number;
        }

        const schema:Schema = generateSchema(new Clazz());
        expect(schema.name.key).equals('Clazz');
        expect(schema.name.description[LanguageCode.ANY]).deep.equals(['text']);
        expect(Object.keys(schema.fields).length).equals(1);
        expect(schema.fields[0].domain).equals(StandardDomain.NUMBER);
        expect(schema.fields[0].key).equals('numberField');
        expect(schema.fields[0].description[LanguageCode.ANY]).deep.equals(['text']);
    });

    it('Test enum type', function() 
    {
        @ClassInfo('clazz')
        class Clazz {
            @FieldInfo({
                description: ['color', 'färg'],
                domain: {'red': ['röd','red']},
            })
            color:string;
        }
        const schema:Schema = generateSchema(new Clazz());

        expect(Object.keys(schema.fields).length).equals(1);
        expect(schema.fields[0].domain).deep.equals(
            {
                'red' : 
                {
                    [LanguageCode.ANY] : ['röd','red']
                }
            }
        );
        expect(schema.fields[0].key).equals('color');
        expect(schema.fields[0].description[LanguageCode.ANY]).deep.equals(['color','färg']);
    });

    // test missing things
    it('Test missing info', function() 
    {
        class Clazz {
            @FieldInfo({
                description: ['color', 'färg'],
                domain: {'red': ['röd','red']},
            })
            color:string;
        }
        expect(function(){generateSchema(new Clazz())}).to.throw('Missing schema name, use @ClassInfo on the class');

    });

    
    it('Test missing info 2', function() 
    {
        @ClassInfo('clazz')
        class Clazz {
            color:string;
        }
        expect(function(){generateSchema(new Clazz())}).to.throw('Missing fields, must provide atleast one definition using @FieldInfo');

    });

    it('Test inheritance', function() 
    {
        const fieldKeyA = 'a';
        const fieldKeyAA = 'aa';
        const fieldKeyAAA1 = 'aaa1';
        const fieldKeyAAA2 = 'aaa2';

        class ClazzA {

            @FieldInfo({
                key: fieldKeyA,
                description: ['a'],
                domain: StandardDomain.NUMBER
            })
            x:number;

        }
        @ClassInfo('clazzA')
        class ClazzAA extends ClazzA {
            @FieldInfo({
                key: fieldKeyAA,
                description: ['aa'],
                domain: StandardDomain.NUMBER
            })
            xx:number;
        }

        @ClassInfo('clazz1')
        class Clazz1 extends ClazzAA{
            @FieldInfo({
                key: fieldKeyAAA1,
                description: ['aaa1'],
                domain: StandardDomain.NUMBER
            })
            xxx1:number;
        }
        @ClassInfo('clazz2')
        class Clazz2 extends ClazzAA {
            @FieldInfo({
                key: fieldKeyAAA2,
                description: ['aaa2'],
                domain: StandardDomain.NUMBER
            })
            xxx2:number;
          

        }
        const schemaAA = generateSchema(new ClazzAA());
        expect(schemaAA.fields.length).equals(2);
        expect(schemaAA.fields.find(x=>x.key == fieldKeyA)).exist;
        expect(schemaAA.fields.find(x=>x.key == fieldKeyAA)).exist;
        expect(schemaAA.name.key).equals(new ClazzAA().constructor.name);

        const schema1 = generateSchema(new Clazz1());
        expect(schema1.fields.length).equals(3);
        expect(schema1.fields.find(x=>x.key == fieldKeyA)).exist;
        expect(schema1.fields.find(x=>x.key == fieldKeyAA)).exist;
        expect(schema1.fields.find(x=>x.key == fieldKeyAAA1)).exist;
        expect(schema1.name.key).equals(new Clazz1().constructor.name);

        const schema2 = generateSchema(new Clazz2());
        expect(schema2.fields.length).equals(3);
        expect(schema2.fields.find(x=>x.key == fieldKeyA)).exist;
        expect(schema2.fields.find(x=>x.key == fieldKeyAA)).exist;
        expect(schema2.fields.find(x=>x.key == fieldKeyAAA2)).exist;
        expect(schema2.name.key).equals(new Clazz2().constructor.name);

        expect(schema1.name.key).not.equals(schema2.name.key);

    });

    it('Cache key', function()
    {
        const rewire = require("rewire");
        const sdkModle = rewire("../src/index.ts");
        @ClassInfo('clazz1')
        class Clazz1 {
            @FieldInfo({
                description: ['n'],
                domain: StandardDomain.NUMBER
            })
            number:string;

        }
        const cacheKey = sdkModle.cacheKey(new Clazz1())
        expect(cacheKey).equals('Clazz1');

    })

    it('Field meta data', function()
    {
        @ClassInfo('c')
        class Clazz {
            @FieldInfo({
                description: ['n'],
                domain: StandardDomain.NUMBER,
                meta: 'abc'
            })
            number:string;

        }
        const schema:Schema = generateSchema(new Clazz());
        expect(schema.fields[0].meta).equals('abc');

    })

});

describe('API client', async function()
{
    it('Basic test', async function(){


    
        @ClassInfo('c')
        class Clazz {
            @FieldInfo({
                key:'n',
                description: 'n',
                meta: 'abc123'
            })
            numberField:number
        }
        const resp = await translate('n = 1', [new Clazz()], { query: {}, suggest: { limit: 10}},{concurrencySize: 1,fuzzy: true, negativeConditions: true,nestedConditions: true});
        expect(resp.query.length).equals(1);
        expect(resp.suggest.length).greaterThan(0);
        expect(resp.unknown).to.not.exist;

    })
})