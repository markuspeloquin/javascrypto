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

var Serpent = (function(){

var BLOCK = 16;		/** The block size in bytes */
var KEYMIN = 16;	/** The minimum key size */
var KEYMAX = 32;	/** The maximum key size */
var KEYSTEP = 8;	/** The separation between key sizes */

/** The Serpent cipher
 * \param key	The symetric key
 * \throws	Bad key size (16, 24, 32 bytes)
 */
function Serpent(key)
{
	this.constructor = Serpent;

	var i;

	// w starts at offset 8
	var w = new Array(8 + 4 * 33);
	var i;
	var key_buf = key._buf;
	var sz = key_buf.length * 4;

	if (sz != 16 && sz != 24 && sz != 32)
		throw 'Serpent: Bad key size';

	// internal representation is little-endian
	w[0] = 0;
	Buffer.basic_copy_be_le(w, 0, key_buf, 0, sz);
	if (sz < 32) {
		// fill the remainder with the binary pattern b10000..., but
		// reversed
		w[key_buf.length] = 1;
		for (i = key_buf.length + 1; i < 8; i++) w[i] = 0;
	}

	// get w_0 through w_131 (4*33 values)
	for (i = 0; i < 132; i++)
		w[i+8] = ROL(w[i] ^ w[i+3] ^ w[i+5] ^ w[i+7] ^ PHI ^ i, 11);

	this.subkeys = new Array(33);
	var s = this.subkeys;
	for (i = 0; i < 33; i++) s[i] = [0,0,0,0];

	// calculate round k_{4i..4i+3}=subkey[i] from w_{4i..4i+3}
	var j;
	var sl = [0,0,0,0]; // slice
	for (i = 8, j = 0; j < 33; i += 4, j++) {
		sl[0] = w[i];
		sl[1] = w[i+1];
		sl[2] = w[i+2];
		sl[3] = w[i+3];
		switch (j & 7) {
		case 0: _sbox_3(sl,s[j]); break;
		case 1: _sbox_2(sl,s[j]); break;
		case 2: _sbox_1(sl,s[j]); break;
		case 3: _sbox_0(sl,s[j]); break;
		case 4: _sbox_7(sl,s[j]); break;
		case 5: _sbox_6(sl,s[j]); break;
		case 6: _sbox_5(sl,s[j]); break;
		case 7: _sbox_4(sl,s[j]);
		}
	}
}

Serpent.BLOCK = BLOCK;
Serpent.KEYMIN = KEYMIN;
Serpent.KEYMAX = KEYMAX;
Serpent.KEYSTEP = KEYSTEP;
Serpent.prototype = new Cipher(BLOCK);

function encrypt(plaintext, ciphertext)
{
	var x = [0,0,0,0];
	var y = [0,0,0,0];
	var i;
	Buffer.basic_copy_be_le(x, 0, plaintext._buf, 0, BLOCK);
	for (i = 0; i < 31; i++) {
		_keying(x, this.subkeys[i]);
		switch (i & 7) {
		case 0: _sbox_0(x, y); break;
		case 1: _sbox_1(x, y); break;
		case 2: _sbox_2(x, y); break;
		case 3: _sbox_3(x, y); break;
		case 4: _sbox_4(x, y); break;
		case 5: _sbox_5(x, y); break;
		case 6: _sbox_6(x, y); break;
		case 7: _sbox_7(x, y);
		}
		_transform(y, x);
	}
	_keying(x, this.subkeys[31]);
	_sbox_7(x, y);
	_keying(y, this.subkeys[32]);
	ciphertext._buf[0] = 0;
	Buffer.basic_copy_le_be(ciphertext._buf, 0, y, 0, BLOCK);
}

function decrypt(ciphertext, plaintext)
{
	var x = [0,0,0,0];
	var y = [0,0,0,0];
	var i;
	Buffer.basic_copy_be_le(x, 0, ciphertext._buf, 0, BLOCK);
	_keying(x, this.subkeys[32]);
	_sbox_7_inv(x, y);
	_keying(y, this.subkeys[31]);
	for (i = 30; i > -1; i--) {
		_transform_inv(y, x);
		switch (i & 7) {
		case 0: _sbox_0_inv(x, y); break;
		case 1: _sbox_1_inv(x, y); break;
		case 2: _sbox_2_inv(x, y); break;
		case 3: _sbox_3_inv(x, y); break;
		case 4: _sbox_4_inv(x, y); break;
		case 5: _sbox_5_inv(x, y); break;
		case 6: _sbox_6_inv(x, y); break;
		case 7: _sbox_7_inv(x, y);
		}
		_keying(y, this.subkeys[i]);
	}
	plaintext._buf[0] = 0;
	Buffer.basic_copy_le_be(plaintext._buf, 0, y, 0, BLOCK);
}

var PHI = 0x9e3779b9;

function _ROL(x, n)
{ return (x << n) | (x >>> (32 - n)) }
function _ROR(x, n)
{ return (x >>> n) | (x << (32 - n)) }

function _transform(x, y)
{
	y[0] = _ROL(x[0], 13);
	y[2] = _ROL(x[2], 3);
	y[1] = x[1] ^ y[0] ^ y[2];
	y[3] = x[3] ^ y[2] ^ (y[0] << 3);
	y[1] = _ROL(y[1], 1);
	y[3] = _ROL(y[3], 7);
	y[0] ^= y[1] ^ y[3];
	y[2] ^= y[3] ^ (y[1] << 7);
	y[0] = _ROL(y[0], 5);
	y[2] = _ROL(y[2], 22);
}

function _transform_inv(x, y)
{
	y[2] = _ROR(x[2], 22);
	y[0] = _ROR(x[0], 5);
	y[2] ^= x[3] ^ (x[1] << 7);
	y[0] ^= x[1] ^ x[3];
	y[3] = _ROR(x[3], 7);
	y[1] = _ROR(x[1], 1);
	y[3] ^= y[2] ^ (y[0] << 3);
	y[1] ^= y[0] ^ y[2];
	y[2] = _ROR(y[2], 3);
	y[0] = _ROR(y[0], 13);
}

function _keying(x, subkey)
{
	x[0] ^= subkey[0];
	x[1] ^= subkey[1];
	x[2] ^= subkey[2];
	x[3] ^= subkey[3];
}

function _sbox_0(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x[0] | x[3];
	t1 = x[1] ^ t0;
	y[3] = x[2] ^ t1;
	t2 = x[0] ^ x[3];
	t3 = x[2] ^ t2;
	t4 = x[1] & t2;
	t5 = x[0] ^ t4;
	t6 = t3 & t5;
	y[2] = t1 ^ t6;
	t7 = t3 ^ t5;
	t8 = y[3] & t7;
	t9 = t3 ^ t8;
	y[1] = ~t9;
	y[0] = t7 ^ y[1];
}
function _sbox_0_inv(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x[0] | x[1];
	t1 = x[2] ^ t0;
	t2 = ~t1;
	y[2] = x[3] ^ t2;
	t3 = x[0] ^ x[1];
	t4 = y[2] ^ t3;
	t5 = x[3] | t3;
	t6 = x[0] ^ t5;
	t7 = t2 & t6;
	y[0] = t4 ^ t7;
	t8 = t1 ^ y[0];
	y[3] = t6 ^ t8;
	t9 = y[0] | y[3];
	y[1] = t2 ^ t9;
}
function _sbox_1(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = ~x[1];
	t1 = x[0] | t0;
	t2 = x[2] ^ t1;
	y[2] = x[3] ^ t2;
	t3 = x[0] ^ t0;
	t4 = y[2] ^ t3;
	t5 = x[3] | t3;
	t6 = x[1] ^ t5;
	t7 = t2 & t6;
	y[3] = t4 ^ t7;
	t8 = t2 ^ t6;
	y[1] = y[3] ^ t8;
	t9 = t4 & t8;
	y[0] = t2 ^ t9;
}
function _sbox_1_inv(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x[1] & x[3];
	t1 = x[0] ^ t0;
	t2 = x[3] ^ t1;
	y[3] = x[2] ^ t2;
	t3 = x[1] ^ t1;
	t4 = x[2] & t3;
	t5 = t1 ^ t4;
	t6 = y[3] | t5;
	y[1] = t3 ^ t6;
	t7 = ~y[1];
	t8 = y[3] | t7;
	y[0] = t5 ^ t8;
	t9 = t7 | y[0];
	y[2] = t2 ^ t9;
}
function _sbox_2(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8;
	t0 = x[0] & x[2];
	t1 = x[3] ^ t0;
	t2 = x[1] ^ t1;
	y[0] = x[2] ^ t2;
	t3 = t1 & t2;
	t4 = x[0] ^ t3;
	t5 = y[0] ^ t4;
	y[3] = ~t5;
	t6 = t1 & t4;
	t7 = x[2] ^ t6;
	t8 = t5 | t7;
	y[1] = t1 ^ t8;
	y[2] = t7 ^ y[1];
}
function _sbox_2_inv(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x[0] ^ x[3];
	t1 = x[2] ^ x[3];
	t2 = x[1] | t1;
	y[0] = t0 ^ t2;
	t3 = x[1] ^ t1;
	t4 = x[2] & t3;
	t5 = t2 ^ t4;
	t6 = t0 & t5;
	y[1] = t3 ^ t6;
	t7 = x[0] ^ y[1];
	t8 = ~t5;
	y[2] = t7 ^ t8;
	t9 = y[0] & y[2];
	y[3] = t8 ^ t9;
}
function _sbox_3(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x[0] ^ x[2];
	t1 = x[3] ^ t0;
	t2 = x[0] | t1;
	t3 = x[2] ^ t2;
	t4 = x[1] & t3;
	y[2] = t1 ^ t4;
	t5 = x[0] & x[3];
	t6 = t0 & t3;
	t7 = x[1] | t5;
	y[1] = t6 ^ t7;
	t8 = x[0] ^ x[1];
	t9 = t1 ^ t6;
	ta = t4 | t8;
	y[3] = t9 ^ ta;
	tb = x[3] | ta;
	tc = t2 & tb;
	y[0] = x[1] ^ tc;
}
function _sbox_3_inv(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb;
	t0 = x[1] ^ x[2];
	t1 = x[1] & t0;
	t2 = x[0] ^ t1;
	t3 = x[3] | t2;
	y[0] = t0 ^ t3;
	t4 = x[2] ^ x[3];
	t5 = t2 ^ t4;
	t6 = t0 | t3;
	y[2] = t5 ^ t6;
	t7 = x[0] & t2;
	t8 = y[0] | t5;
	y[1] = t7 ^ t8;
	t9 = x[1] ^ t8;
	ta = x[3] & y[0];
	tb = t2 | t9;
	y[3] = ta ^ tb;
}
function _sbox_4(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta;
	t0 = x[0] ^ x[3];
	t1 = x[3] & t0;
	t2 = x[2] ^ t1;
	t3 = x[1] | t2;
	y[3] = t0 ^ t3;
	t4 = x[1] & y[3];
	t5 = t2 ^ t4;
	y[0] = ~t5;
	t6 = x[1] ^ t0;
	t7 = x[3] ^ t2;
	t8 = t5 | t7;
	y[2] = t6 ^ t8;
	t9 = x[0] ^ t2;
	ta = t8 & y[2];
	y[1] = t9 ^ ta;
}
function _sbox_4_inv(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb;
	t0 = x[2] | x[3];
	t1 = x[1] ^ t0;
	t2 = x[0] & t1;
	t3 = x[2] ^ t2;
	y[1] = x[3] ^ t3;
	t4 = x[1] | x[3];
	t5 = x[0] & t4;
	t6 = t1 ^ t5;
	y[3] = x[3] ^ t6;
	t7 = ~x[0];
	t8 = y[1] | t7;
	y[0] = t6 ^ t8;
	t9 = x[2] ^ t4;
	ta = t3 | t7;
	tb = t9 & ta;
	y[2] = t8 ^ tb;
}
function _sbox_5(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta;
	t0 = x[0] ^ x[1];
	t1 = x[1] & t0;
	t2 = x[2] ^ t1;
	t3 = ~x[3];
	t4 = t0 | t3;
	y[0] = t2 ^ t4;
	t5 = t3 & y[0];
	y[1] = t0 ^ t5;
	t6 = x[0] ^ t2;
	t7 = t0 ^ t3;
	t8 = y[0] & t6;
	y[2] = t7 ^ t8;
	t9 = x[1] ^ t2;
	ta = t7 & y[2];
	y[3] = t9 ^ ta;
}
function _sbox_5_inv(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb;
	t0 = x[0] & x[3];
	t1 = x[2] ^ t0;
	t2 = x[1] & t1;
	t3 = x[3] ^ t2;
	y[0] = x[0] ^ t3;
	t4 = x[0] & y[0];
	t5 = ~x[1];
	t6 = t4 | t5;
	y[3] = t1 ^ t6;
	t7 = x[0] & y[3];
	t8 = x[1] ^ t7;
	y[1] = t3 ^ t8;
	t9 = x[1] ^ x[3];
	ta = t1 ^ t9;
	tb = y[0] | y[1];
	y[2] = ta ^ tb;
}
function _sbox_6(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9;
	t0 = x[0] & x[3];
	t1 = x[2] ^ t0;
	t2 = ~t1;
	y[1] = x[1] ^ t2;
	t3 = x[0] ^ x[3];
	t4 = x[1] ^ t3;
	t5 = y[1] | t3;
	t6 = x[3] ^ t5;
	t7 = t2 & t6;
	y[2] = t4 ^ t7;
	t8 = t2 ^ t6;
	y[0] = y[2] ^ t8;
	t9 = t4 & t8;
	y[3] = t1 ^ t9;
}
function _sbox_6_inv(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta;
	t0 = ~x[2];
	t1 = x[0] | t0;
	t2 = x[3] ^ t1;
	y[1] = x[1] ^ t2;
	t3 = x[0] ^ x[2];
	t4 = t2 ^ t3;
	t5 = t3 & t4;
	t6 = x[0] ^ t5;
	t7 = x[1] & t6;
	y[0] = t4 ^ t7;
	t8 = t6 ^ y[0];
	y[3] = x[1] ^ t8;
	t9 = y[0] & y[3];
	ta = t2 ^ t9;
	y[2] = ~ta;
}
function _sbox_7(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x[1] ^ x[2];
	t1 = x[2] & t0;
	t2 = x[3] ^ t1;
	t3 = x[0] ^ t2;
	t4 = x[0] & t3;
	y[3] = t0 ^ t4;
	t5 = x[1] ^ t3;
	t6 = t4 & y[3];
	y[1] = t5 ^ t6;
	t7 = y[3] & t5;
	t8 = x[3] & t2;
	y[2] = t7 ^ t8;
	t9 = x[1] ^ t7;
	ta = t2 | t9;
	tb = ~t3;
	tc = t0 | tb;
	y[0] = ta ^ tc;
}
function _sbox_7_inv(x, y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x[0] & x[1];
	t1 = x[0] | x[1];
	t2 = x[3] & t1;
	t3 = x[2] | t0;
	y[3] = t2 ^ t3;
	t4 = x[1] ^ t2;
	t5 = x[3] ^ y[3];
	t6 = ~t5;
	t7 = t4 | t6;
	y[1] = x[0] ^ t7;
	t8 = x[3] | y[1];
	t9 = x[2] ^ t8;
	y[0] = t4 ^ t9;
	ta = x[1] ^ t7;
	tb = t9 ^ ta;
	tc = x[0] | y[3];
	y[2] = tb ^ tc;
}

function _connect(dest, functions)
{
	for (var i = 0; i < functions.length; i++) {
		var f = functions[i];
		dest[f.name] = f;
	}
}
_connect(Serpent.prototype, [ encrypt, decrypt ]);

return Serpent;
})();
