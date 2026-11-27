import test from 'node:test';
import assert from 'node:assert/strict';
import {ownJid,limiter,sessionStore,WINDOW_MS} from './public-policy.mjs';
test('verified self recipient only',()=>{assert.equal(ownJid('59112345678:2@s.whatsapp.net','59112345678'),'59112345678@s.whatsapp.net');for(const id of ['59187654321@s.whatsapp.net','59112345678@lid','59112345678@g.us',undefined])assert.throws(()=>ownJid(id,'59112345678'),/identity/)});
test('session isolation and capacity',()=>{const s=sessionStore(),a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64),one={},two={};assert(s.add(a,one));assert(s.add(b,two));assert.equal(s.get(a),one);assert.equal(s.get(b),two);assert.equal(s.get(c),undefined);assert(!s.add(c,{}));s.remove(a,two);assert.equal(s.get(a),one);s.remove(a,one);assert.equal(s.get(a),undefined);assert(s.add(c,{}));});
test('rate limit per phone and global',()=>{const take=limiter();assert(take('59112345678',0));assert(!take('59112345678',1));for(let n=1;n<=5;n++)assert(take('5911234567'+n,2));assert(!take('59199999999',3));assert(take('59112345678',WINDOW_MS+2))});
