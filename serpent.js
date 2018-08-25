/* Copyright (c) 2009, Markus Peloquin <markus@cs.wisc.edu>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS' AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. */

 'use strict';

const Serpent = (function() {

const BLOCK = 16;		/** The block size in bytes */
const KEYMIN = 16;	/** The minimum key size */
const KEYMAX = 32;	/** The maximum key size */
const KEYSTEP = 8;	/** The separation between key sizes */

function swap32(x) {
	const x0 = ((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8);
	return (x0 >>> 16) | (x0 << 16);
}

function ROL(x, n) {
	return (x << n) | (x >>> (32 - n));
}
function ROR(x, n) {
	return (x >>> n) | (x << (32 - n));
}

/** The Serpent cipher
 * \param key	The symetric key
 * \throws	Bad key size (16, 24, 32 bytes)
 */
function Serpent(key) {
	Cipher.call(this, BLOCK);

	// w starts at offset 8
	const w = new Array(8 + 4 * 33);
	const keyBuf = key._buf;
	const sz = keyBuf.length << 2;

	if (sz != 16 && sz != 24 && sz != 32)
		throw 'Serpent: Bad key size';

	// internal representation is little-endian
	for (let i = 0; i < sz >>> 2; i++)
		w[i] = swap32(keyBuf[i]);
	if (sz < 32) {
		// fill the remainder with the binary pattern b10000..., but
		// reversed
		w[keyBuf.length] = 1;
		for (let i = keyBuf.length + 1; i < 8; i++)
			w[i] = 0;
	}

	// get w_0 through w_131 (4*33 values)
	for (let i = 0; i < 132; i++)
		w[i+8] = ROL(w[i] ^ w[i+3] ^ w[i+5] ^ w[i+7] ^ PHI ^ i, 11);

	const s = this._subkeys = new Array(33);
	for (let i = 0; i < 33; i++)
		s[i] = [0, 0, 0, 0];

	// calculate round k_{4i..4i+3}=subkey[i] from w_{4i..4i+3}
	const sl = [0,0,0,0]; // slice
	for (let i = 8, j = 0; j < 33; i += 4, j++) {
		sl[0] = w[i];
		sl[1] = w[i+1];
		sl[2] = w[i+2];
		sl[3] = w[i+3];
		switch (j & 7) {
		case 0: _sbox3(sl, s[j]); break;
		case 1: _sbox2(sl, s[j]); break;
		case 2: _sbox1(sl, s[j]); break;
		case 3: _sbox0(sl, s[j]); break;
		case 4: _sbox7(sl, s[j]); break;
		case 5: _sbox6(sl, s[j]); break;
		case 6: _sbox5(sl, s[j]); break;
		case 7: _sbox4(sl, s[j]);
		}
	}
}
Serpent.prototype = Object.create(Cipher.prototype);
Serpent.prototype.constructor = Serpent;

Serpent.BLOCK = BLOCK;
Serpent.KEYMIN = KEYMIN;
Serpent.KEYMAX = KEYMAX;
Serpent.KEYSTEP = KEYSTEP;

Serpent.prototype.encrypt = function(plaintext, ciphertext) {
	const _subkeys = this._subkeys;
	const x = [
		swap32(plaintext.get32(0)),
		swap32(plaintext.get32(1)),
		swap32(plaintext.get32(2)),
		swap32(plaintext.get32(3)),
	];
	const y = [0, 0, 0, 0];
	for (let i = 0; i < 31; i++) {
		_keying(x, _subkeys[i]);
		switch (i & 7) {
		case 0: _sbox0(x, y); break;
		case 1: _sbox1(x, y); break;
		case 2: _sbox2(x, y); break;
		case 3: _sbox3(x, y); break;
		case 4: _sbox4(x, y); break;
		case 5: _sbox5(x, y); break;
		case 6: _sbox6(x, y); break;
		case 7: _sbox7(x, y);
		}
		_transform(y, x);
	}
	_keying(x, _subkeys[31]);
	_sbox7(x, y);
	_keying(y, _subkeys[32]);
	ciphertext.set32(0, swap32(y[0]));
	ciphertext.set32(1, swap32(y[1]));
	ciphertext.set32(2, swap32(y[2]));
	ciphertext.set32(3, swap32(y[3]));
}

Serpent.prototype.decrypt = function(plaintext, ciphertext) {
	const _subkeys = this._subkeys;
	const x = [
		swap32(ciphertext.get32(0)),
		swap32(ciphertext.get32(1)),
		swap32(ciphertext.get32(2)),
		swap32(ciphertext.get32(3)),
	];
	const y = [0, 0, 0, 0];
	_keying(x, _subkeys[32]);
	_sbox7Inv(x, y);
	_keying(y, _subkeys[31]);
	for (let i = 30; i > -1; i--) {
		_transformInv(y, x);
		switch (i & 7) {
		case 0: _sbox0Inv(x, y); break;
		case 1: _sbox1Inv(x, y); break;
		case 2: _sbox2Inv(x, y); break;
		case 3: _sbox3Inv(x, y); break;
		case 4: _sbox4Inv(x, y); break;
		case 5: _sbox5Inv(x, y); break;
		case 6: _sbox6Inv(x, y); break;
		case 7: _sbox7Inv(x, y);
		}
		_keying(y, _subkeys[i]);
	}
	plaintext.set32(0, swap32(y[0]));
	plaintext.set32(1, swap32(y[1]));
	plaintext.set32(2, swap32(y[2]));
	plaintext.set32(3, swap32(y[3]));
}

var PHI = 0x9e3779b9;

function _transform(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	y0 = ROL(x0, 13);
	y2 = ROL(x2, 3);
	y1 = x1 ^ y0 ^ y2;
	y3 = x3 ^ y2 ^ (y0 << 3);
	y1 = ROL(y1, 1);
	y3 = ROL(y3, 7);
	y0 ^= y1 ^ y3;
	y2 ^= y3 ^ (y1 << 7);
	y0 = ROL(y0, 5);
	y2 = ROL(y2, 22);
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}

function _transformInv(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	y2 = ROR(x2, 22);
	y0 = ROR(x0, 5);
	y2 ^= x3 ^ (x1 << 7);
	y0 ^= x1 ^ x3;
	y3 = ROR(x3, 7);
	y1 = ROR(x1, 1);
	y3 ^= y2 ^ (y0 << 3);
	y1 ^= y0 ^ y2;
	y2 = ROR(y2, 3);
	y0 = ROR(y0, 13);
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}

function _keying(x, subkey) {
	x[0] ^= subkey[0];
	x[1] ^= subkey[1];
	x[2] ^= subkey[2];
	x[3] ^= subkey[3];
}

function _sbox0(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x0 | x3;
	t1 = x1 ^ t0;
	y3 = x2 ^ t1;
	t2 = x0 ^ x3;
	t3 = x2 ^ t2;
	t4 = x1 & t2;
	t5 = x0 ^ t4;
	t6 = t3 & t5;
	y2 = t1 ^ t6;
	t7 = t3 ^ t5;
	t8 = y3 & t7;
	t9 = t3 ^ t8;
	y1 = ~t9;
	y0 = t7 ^ y1;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox0Inv(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x0 | x1;
	t1 = x2 ^ t0;
	t2 = ~t1;
	y2 = x3 ^ t2;
	t3 = x0 ^ x1;
	t4 = y2 ^ t3;
	t5 = x3 | t3;
	t6 = x0 ^ t5;
	t7 = t2 & t6;
	y0 = t4 ^ t7;
	t8 = t1 ^ y0;
	y3 = t6 ^ t8;
	t9 = y0 | y3;
	y1 = t2 ^ t9;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox1(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = ~x1;
	t1 = x0 | t0;
	t2 = x2 ^ t1;
	y2 = x3 ^ t2;
	t3 = x0 ^ t0;
	t4 = y2 ^ t3;
	t5 = x3 | t3;
	t6 = x1 ^ t5;
	t7 = t2 & t6;
	y3 = t4 ^ t7;
	t8 = t2 ^ t6;
	y1 = y3 ^ t8;
	t9 = t4 & t8;
	y0 = t2 ^ t9;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox1Inv(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x1 & x3;
	t1 = x0 ^ t0;
	t2 = x3 ^ t1;
	y3 = x2 ^ t2;
	t3 = x1 ^ t1;
	t4 = x2 & t3;
	t5 = t1 ^ t4;
	t6 = y3 | t5;
	y1 = t3 ^ t6;
	t7 = ~y1;
	t8 = y3 | t7;
	y0 = t5 ^ t8;
	t9 = t7 | y0;
	y2 = t2 ^ t9;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox2(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8;
	t0 = x0 & x2;
	t1 = x3 ^ t0;
	t2 = x1 ^ t1;
	y0 = x2 ^ t2;
	t3 = t1 & t2;
	t4 = x0 ^ t3;
	t5 = y0 ^ t4;
	y3 = ~t5;
	t6 = t1 & t4;
	t7 = x2 ^ t6;
	t8 = t5 | t7;
	y1 = t1 ^ t8;
	y2 = t7 ^ y1;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox2Inv(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x0 ^ x3;
	t1 = x2 ^ x3;
	t2 = x1 | t1;
	y0 = t0 ^ t2;
	t3 = x1 ^ t1;
	t4 = x2 & t3;
	t5 = t2 ^ t4;
	t6 = t0 & t5;
	y1 = t3 ^ t6;
	t7 = x0 ^ y1;
	t8 = ~t5;
	y2 = t7 ^ t8;
	t9 = y0 & y2;
	y3 = t8 ^ t9;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox3(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x0 ^ x2;
	t1 = x3 ^ t0;
	t2 = x0 | t1;
	t3 = x2 ^ t2;
	t4 = x1 & t3;
	y2 = t1 ^ t4;
	t5 = x0 & x3;
	t6 = t0 & t3;
	t7 = x1 | t5;
	y1 = t6 ^ t7;
	t8 = x0 ^ x1;
	t9 = t1 ^ t6;
	ta = t4 | t8;
	y3 = t9 ^ ta;
	tb = x3 | ta;
	tc = t2 & tb;
	y0 = x1 ^ tc;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox3Inv(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb;
	t0 = x1 ^ x2;
	t1 = x1 & t0;
	t2 = x0 ^ t1;
	t3 = x3 | t2;
	y0 = t0 ^ t3;
	t4 = x2 ^ x3;
	t5 = t2 ^ t4;
	t6 = t0 | t3;
	y2 = t5 ^ t6;
	t7 = x0 & t2;
	t8 = y0 | t5;
	y1 = t7 ^ t8;
	t9 = x1 ^ t8;
	ta = x3 & y0;
	tb = t2 | t9;
	y3 = ta ^ tb;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox4(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta;
	t0 = x0 ^ x3;
	t1 = x3 & t0;
	t2 = x2 ^ t1;
	t3 = x1 | t2;
	y3 = t0 ^ t3;
	t4 = x1 & y3;
	t5 = t2 ^ t4;
	y0 = ~t5;
	t6 = x1 ^ t0;
	t7 = x3 ^ t2;
	t8 = t5 | t7;
	y2 = t6 ^ t8;
	t9 = x0 ^ t2;
	ta = t8 & y2;
	y1 = t9 ^ ta;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox4Inv(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb;
	t0 = x2 | x3;
	t1 = x1 ^ t0;
	t2 = x0 & t1;
	t3 = x2 ^ t2;
	y1 = x3 ^ t3;
	t4 = x1 | x3;
	t5 = x0 & t4;
	t6 = t1 ^ t5;
	y3 = x3 ^ t6;
	t7 = ~x0;
	t8 = y1 | t7;
	y0 = t6 ^ t8;
	t9 = x2 ^ t4;
	ta = t3 | t7;
	tb = t9 & ta;
	y2 = t8 ^ tb;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox5(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta;
	t0 = x0 ^ x1;
	t1 = x1 & t0;
	t2 = x2 ^ t1;
	t3 = ~x3;
	t4 = t0 | t3;
	y0 = t2 ^ t4;
	t5 = t3 & y0;
	y1 = t0 ^ t5;
	t6 = x0 ^ t2;
	t7 = t0 ^ t3;
	t8 = y0 & t6;
	y2 = t7 ^ t8;
	t9 = x1 ^ t2;
	ta = t7 & y2;
	y3 = t9 ^ ta;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox5Inv(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb;
	t0 = x0 & x3;
	t1 = x2 ^ t0;
	t2 = x1 & t1;
	t3 = x3 ^ t2;
	y0 = x0 ^ t3;
	t4 = x0 & y0;
	t5 = ~x1;
	t6 = t4 | t5;
	y3 = t1 ^ t6;
	t7 = x0 & y3;
	t8 = x1 ^ t7;
	y1 = t3 ^ t8;
	t9 = x1 ^ x3;
	ta = t1 ^ t9;
	tb = y0 | y1;
	y2 = ta ^ tb;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox6(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x0 & x3;
	t1 = x2 ^ t0;
	t2 = ~t1;
	y1 = x1 ^ t2;
	t3 = x0 ^ x3;
	t4 = x1 ^ t3;
	t5 = y1 | t3;
	t6 = x3 ^ t5;
	t7 = t2 & t6;
	y2 = t4 ^ t7;
	t8 = t2 ^ t6;
	y0 = y2 ^ t8;
	t9 = t4 & t8;
	y3 = t1 ^ t9;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox6Inv(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta;
	t0 = ~x2;
	t1 = x0 | t0;
	t2 = x3 ^ t1;
	y1 = x1 ^ t2;
	t3 = x0 ^ x2;
	t4 = t2 ^ t3;
	t5 = t3 & t4;
	t6 = x0 ^ t5;
	t7 = x1 & t6;
	y0 = t4 ^ t7;
	t8 = t6 ^ y0;
	y3 = x1 ^ t8;
	t9 = y0 & y3;
	ta = t2 ^ t9;
	y2 = ~ta;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox7(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x1 ^ x2;
	t1 = x2 & t0;
	t2 = x3 ^ t1;
	t3 = x0 ^ t2;
	t4 = x0 & t3;
	y3 = t0 ^ t4;
	t5 = x1 ^ t3;
	t6 = t4 & y3;
	y1 = t5 ^ t6;
	t7 = y3 & t5;
	t8 = x3 & t2;
	y2 = t7 ^ t8;
	t9 = x1 ^ t7;
	ta = t2 | t9;
	tb = ~t3;
	tc = t0 | tb;
	y0 = ta ^ tc;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}
function _sbox7Inv(x, y) {
	const [x0, x1, x2, x3] = x;
	let y0, y1, y2, y3;
	let t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x0 & x1;
	t1 = x0 | x1;
	t2 = x3 & t1;
	t3 = x2 | t0;
	y3 = t2 ^ t3;
	t4 = x1 ^ t2;
	t5 = x3 ^ y3;
	t6 = ~t5;
	t7 = t4 | t6;
	y1 = x0 ^ t7;
	t8 = x3 | y1;
	t9 = x2 ^ t8;
	y0 = t4 ^ t9;
	ta = x1 ^ t7;
	tb = t9 ^ ta;
	tc = x0 | y3;
	y2 = tb ^ tc;
	y[0] = y0; y[1] = y1; y[2] = y2; y[3] = y3;
}

return Serpent;
})();
