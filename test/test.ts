import { LanguageCode } from '@quantleaf/code-language';
import { StandardDomainType, Schema} from '@quantleaf/query-schema';
import { expect } from 'chai';
import {ClassInfo, FieldInfo,generateSchema, translate, config } from '../src/index'
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
        expect(schema.fields[0].domain).equals(StandardDomainType.NUMBER);
        expect(schema.fields[0].key).equals('numberField');
        expect(schema.fields[0].description['SV']).deep.equals(['sv']);
        expect(schema.fields[0].description['EN']).deep.equals(['en']);
        expect(schema.fields[1].domain).equals(StandardDomainType.TEXT);
        expect(schema.fields[1].key).equals('stringField');
        expect(schema.fields[1].description['EN']).deep.equals(['en']);
        expect(schema.fields[1].description['SV']).undefined;
        expect(schema.fields[2].domain).equals(StandardDomainType.DATE);
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
        expect(schema.fields[0].domain).equals(StandardDomainType.NUMBER);
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
        expect(schema.fields[0].domain).equals(StandardDomainType.NUMBER);
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
        expect(schema.fields[0].domain).equals(StandardDomainType.NUMBER);
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


});

describe('API client', async function()
{
    it('Basic test', async function(){

        @ClassInfo({
            description: 'text'
        })
        class Clazz {
            @FieldInfo({
                key:'custom-number',
                description: 'some number'
            })
            numberField:number;
        }
        const resp = await translate('', [new Clazz()], { query: {}, suggest: { limit: 10}} );
        expect(resp.query.length).equals(0);
        expect(resp.suggest.length).greaterThan(0);
        expect(resp.unknown).to.not.exist;

    })
})