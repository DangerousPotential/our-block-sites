import test from 'node:test';
import assert from 'node:assert/strict';
import {
  joinOrigins,
  roomJoinUrl,
  isLoopbackOrigin,
} from '../lib/game/join-link.ts';

test('local screens use the running server network URL while hosted pages keep their origin', () => {
  const network = ['http://192.168.4.37:3000/', 'http://192.168.4.37:3000'];
  assert.deepEqual(joinOrigins('http://localhost:3000', '', network), [
    'http://192.168.4.37:3000',
  ]);
  assert.deepEqual(joinOrigins('https://our-block.example', '', network), [
    'https://our-block.example',
  ]);
  assert.deepEqual(joinOrigins('http://192.168.4.99:3000', '', network), [
    'http://192.168.4.99:3000',
  ]);
  assert.equal(
    roomJoinUrl(network[0], 'ABCD'),
    'http://192.168.4.37:3000/?join=ABCD',
  );
});

test('explicit connection overrides win and multiple network interfaces stay selectable', () => {
  assert.deepEqual(
    joinOrigins('http://localhost:3000', 'https://party.example/'),
    ['https://party.example'],
  );
  assert.deepEqual(
    joinOrigins('http://localhost:3000', '', [
      'http://10.0.0.2:3001',
      'http://192.168.0.2:3001',
    ]),
    ['http://10.0.0.2:3001', 'http://192.168.0.2:3001'],
  );
});

test('unusable discovered addresses cannot become phone QR links', () => {
  const local = 'http://[::1]:3000';
  assert.equal(isLoopbackOrigin(local), true);
  assert.deepEqual(
    joinOrigins(local, '', [
      'http://localhost:3000',
      'file:///tmp',
      'javascript:alert(1)',
      'https://user:password@example.com',
      'broken',
    ]),
    [local],
  );
  assert.equal(
    roomJoinUrl('https://party.example', 'A&B'),
    'https://party.example/?join=A%26B',
  );
});
