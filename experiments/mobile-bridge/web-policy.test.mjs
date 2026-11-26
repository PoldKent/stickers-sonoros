import test from 'node:test';
import assert from 'node:assert/strict';
import {authorized,phoneNumber,trialPackage,readPackage} from './web-policy.mjs';
test('constant time token and fixed phone format',()=>{const s='a'.repeat(32);assert(authorized('Bearer '+s,s));assert(!authorized('Bearer '+s.slice(1),s));assert(!authorized('Bearer '+s,'short'));assert(phoneNumber('59112345678'));assert(!phoneNumber('+59112345678'));assert(!phoneNumber('123@g.us'));});
test('one small package only',async()=>{const p={audioSeconds:2,webpBuffer:Buffer.alloc(5),audioBuffer:Buffer.alloc(5)};assert.equal(trialPackage(p),p);assert.throws(()=>trialPackage({...p,audioSeconds:4}));assert.throws(()=>trialPackage({...p,webpBuffer:Buffer.alloc(500000)}));const stream=Object.assign([Buffer.from('abc')],{headers:{'content-length':'3'}});assert.equal((await readPackage(stream)).toString(),'abc');await assert.rejects(readPackage(Object.assign([Buffer.from('abcd')],{headers:{'content-length':'3'}})),/size/);});
