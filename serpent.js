/* Copyright (c) 2009, Markus Peloquin <markus@cs.wisc.edu>
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. */

/** The Serpent cipher
 * \param key	The symetric key
 * \throws	Bad key size (16, 24, 32 bytes)
 */
Serpent = function(key)
{
	this.constructor = Serpent;

	var i;

	// w starts at offset 8
	var w = new Array(8 + 4 * 33);
	var i;
	var sz = key.length * 4;

	if (sz != 16 && sz != 24 && sz != 32)
		throw "Serpent: Bad key size";

	// internal representation is little-endian
	w[0] = 0;
	Buffer.copy_be_le(w, 0, key, 0, sz);
	if (sz < 32) {
		// fill the remainder with the binary pattern b10000..., but
		// reversed
		w[key.length] = 1;
		for (i = key.length + 1; i < 8; i++) w[i] = 0;
	}

	// get w_0 through w_131 (4*33 values)
	for (i = 0; i < 132; i++)
		w[i+8] = Serpent.ROL(w[i] ^ w[i+3] ^ w[i+5] ^ w[i+7] ^
		    Serpent.PHI ^ i, 11);

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
		case 0: Serpent.sbox_3(sl,s[j]); break;
		case 1: Serpent.sbox_2(sl,s[j]); break;
		case 2: Serpent.sbox_1(sl,s[j]); break;
		case 3: Serpent.sbox_0(sl,s[j]); break;
		case 4: Serpent.sbox_7(sl,s[j]); break;
		case 5: Serpent.sbox_6(sl,s[j]); break;
		case 6: Serpent.sbox_5(sl,s[j]); break;
		case 7: Serpent.sbox_4(sl,s[j]);
		}
	}
}
Serpent.BLOCK = 16;	/** The block size in bytes */
Serpent.KEYMIN = 16;	/** The minimum key size */
Serpent.KEYMAX = 32;	/** The maximum key size */
Serpent.KEYSTEP = 8;	/** The separation between key sizes */
Serpent.prototype = new Cipher(Serpent.BLOCK);
Serpent.prototype.encrypt = function(plaintext, ciphertext)
{
	var x = [0,0,0,0];
	var y = [0,0,0,0];
	var i;
	Buffer.copy_be_le(x, 0, plaintext, 0, Serpent.BLOCK);
	for (i = 0; i < 31; i++) {
		Serpent.keying(x,this.subkeys[i]);
		switch (i & 7) {
		case 0: Serpent.sbox_0(x,y); break;
		case 1: Serpent.sbox_1(x,y); break;
		case 2: Serpent.sbox_2(x,y); break;
		case 3: Serpent.sbox_3(x,y); break;
		case 4: Serpent.sbox_4(x,y); break;
		case 5: Serpent.sbox_5(x,y); break;
		case 6: Serpent.sbox_6(x,y); break;
		case 7: Serpent.sbox_7(x,y);
		}
		Serpent.transform(y,x);
	}
	Serpent.keying(x,this.subkeys[31]);
	Serpent.sbox_7(x,y);
	Serpent.keying(y,this.subkeys[32]);
	ciphertext[0] = 0;
	Buffer.copy_le_be(ciphertext, 0, y, 0, Serpent.BLOCK);
}
Serpent.prototype.decrypt = function(plaintext, ciphertext)
{
	var x = [0,0,0,0];
	var y = [0,0,0,0];
	var i;
	Buffer.copy_be_le(x, 0, plaintext, 0, Serpent.BLOCK);
	Serpent.keying(x,this.subkeys[32]);
	Serpent.sbox_7(x,y);
	Serpent.keying(y,this.subkeys[31]);
	for (i = 30; i > -1; i--) {
		Serpent.transform_inv(y,x);
		switch (i & 7) {
		case 0: Serpent.sbox_0_inv(x,y); break;
		case 1: Serpent.sbox_1_inv(x,y); break;
		case 2: Serpent.sbox_2_inv(x,y); break;
		case 3: Serpent.sbox_3_inv(x,y); break;
		case 4: Serpent.sbox_4_inv(x,y); break;
		case 5: Serpent.sbox_5_inv(x,y); break;
		case 6: Serpent.sbox_6_inv(x,y); break;
		case 7: Serpent.sbox_7_inv(x,y);
		}
		Serpent.keying(x,this.subkeys[i]);
	}
	plaintext[0] = 0;
	Buffer.copy_le_be(ciphertext, 0, y, 0, Serpent.BLOCK);
}
Serpent.PHI = 0x9e3779b9;
Serpent.ROL = function(x,n)
{ return (x << n) | (x >>> (32 - n)) }
Serpent.ROR = function(x,n)
{ return (x >>> n) | (x << (32 - n)) }
Serpent.transform = function(x,y)
{
	y[0] = Serpent.ROL(x[0], 13);
	y[2] = Serpent.ROL(x[2], 3);
	y[1] = x[1] ^ y[0] ^ y[2];
	y[3] = x[3] ^ y[2] ^ (y[0] << 3);
	y[1] = Serpent.ROL(y[1], 1);
	y[3] = Serpent.ROL(y[3], 7);
	y[0] ^= y[1] ^ y[3];
	y[2] ^= y[3] ^ (y[1] << 7);
	y[0] = Serpent.ROL(y[0], 5);
	y[2] = Serpent.ROL(y[2], 22);
}
Serpent.transform_inv = function(x,y)
{
	y[2] = Serpent.ROR(x[2], 22);
	y[0] = Serpent.ROR(x[0], 5);
	y[2] ^= x[3] ^ (x[1] << 7);
	y[0] ^= x[1] ^ x[3];
	y[3] = Serpent.ROR(x[3], 7);
	y[1] = Serpent.ROR(x[1], 1);
	y[3] ^= y[2] ^ (y[0] << 3);
	y[1] ^= y[0] ^ y[2];
	y[2] = Serpent.ROR(y[2], 3);
	y[0] = Serpent.ROR(y[0], 13);
}
Serpent.keying = function(x,subkey)
{
	x[0] ^= subkey[0];
	x[1] ^= subkey[1];
	x[2] ^= subkey[2];
	x[3] ^= subkey[3];
}
Serpent.sbox_0 = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td;
	t0 = x[1] ^ x[2];
	t1 = x[0] | x[3];
	y[3] = t0 ^ t1;
	t2 = x[0] ^ x[1];
	t3 = x[1] | x[2];
	t4 = t2 & t3;
	t5 = x[2] | y[3];
	t6 = x[3] & t5;
	y[2] = t4 ^ t6;
	t7 = x[0] ^ x[3];
	t8 = t3 ^ t7;
	t9 = t4 & y[2];
	ta = t8 ^ t9;
	y[0] = ~ta;
	tb = x[0] ^ t0;
	tc = y[0] ^ tb;
	td = x[1] | t7;
	y[1] = tc ^ td;
}
Serpent.sbox_0_inv = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td;
	t0 = x[2] ^ x[3];
	t1 = x[0] | x[1];
	t2 = t0 ^ t1;
	y[2] = ~t2;
	t3 = x[0] ^ x[1];
	t4 = x[2] ^ t3;
	t5 = x[0] & t0;
	t6 = x[2] | t2;
	t7 = t4 & t6;
	y[1] = t5 ^ t7;
	t8 = x[1] ^ t2;
	t9 = x[3] ^ y[2];
	ta = t0 ^ t7;
	tb = t8 | t9;
	y[3] = ta ^ tb;
	tc = t8 ^ y[3];
	td = x[3] & t3;
	y[0] = tc ^ td;
}
Serpent.sbox_1 = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td;
	t0 = x[2] ^ x[3];
	t1 = ~x[1];
	t2 = x[0] | t1;
	y[2] = t0 ^ t2;
	t3 = x[0] ^ x[1];
	t4 = x[2] ^ t3;
	t5 = x[3] & t0;
	t6 = x[1] | y[2];
	t7 = t4 | t5;
	y[0] = t6 ^ t7;
	t8 = x[0] ^ x[3];
	t9 = y[2] ^ t3;
	ta = x[1] | t8;
	tb = y[0] | t9;
	y[3] = ta ^ tb;
	tc = x[2] ^ tb;
	td = x[3] & t8;
	y[1] = tc ^ td;
}
Serpent.sbox_1_inv = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x[0] ^ x[1];
	t1 = x[2] ^ t0;
	t2 = x[1] | x[3];
	y[3] = t1 ^ t2;
	t3 = x[0] ^ x[3];
	t4 = x[2] | t3;
	t5 = x[1] ^ t4;
	t6 = t1 & t5;
	y[1] = t3 ^ t6;
	t7 = t2 ^ t5;
	t8 = t1 & y[1];
	t9 = t7 ^ t8;
	y[0] = ~t9;
	ta = x[0] ^ t4;
	tb = t8 ^ ta;
	tc = y[1] | y[0];
	y[2] = tb ^ tc;
}
Serpent.sbox_2 = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x[0] ^ x[1];
	t1 = x[3] ^ t0;
	t2 = x[0] | x[2];
	y[0] = t1 ^ t2;
	t3 = x[0] ^ x[2];
	t4 = x[2] ^ y[0];
	t5 = x[1] & t4;
	t6 = t3 ^ t5;
	y[3] = ~t6;
	t7 = x[1] ^ t4;
	t8 = t2 & t7;
	t9 = t0 | t6;
	y[1] = t8 ^ t9;
	ta = x[0] ^ t4;
	tb = x[2] ^ y[1];
	tc = t7 & ta;
	y[2] = tb ^ tc;
}
Serpent.sbox_2_inv = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td;
	t0 = x[0] ^ x[3];
	t1 = x[2] ^ x[3];
	t2 = x[1] | t1;
	y[0] = t0 ^ t2;
	t3 = x[0] ^ x[1];
	t4 = x[2] ^ t3;
	t5 = x[2] & t0;
	t6 = t4 | t5;
	y[1] = t2 & t6;
	t7 = x[0] ^ t2;
	t8 = t3 ^ t5;
	t9 = y[1] & t8;
	ta = t7 ^ t9;
	y[2] = ~ta;
	tb = x[0] ^ y[0];
	tc = y[1] ^ tb;
	td = y[0] | y[2];
	y[3] = tc ^ td;
}
Serpent.sbox_3 = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td;
	t0 = x[0] ^ x[1];
	t1 = x[2] ^ x[3];
	t2 = x[1] & t1;
	t3 = x[3] & t1;
	t4 = t0 | t3;
	y[0] = t2 ^ t4;
	t5 = x[0] ^ x[2];
	t6 = x[1] & t5;
	t7 = t1 ^ t6;
	t8 = x[0] | t2;
	y[2] = t7 ^ t8;
	t9 = x[1] ^ t5;
	ta = x[0] | t3;
	tb = t7 & ta;
	y[3] = t9 ^ tb;
	tc = x[1] ^ ta;
	td = y[3] | tc;
	y[1] = t7 ^ td;
}
Serpent.sbox_3_inv = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x[1] ^ x[2];
	t1 = x[1] & t0;
	t2 = x[0] ^ t1;
	t3 = x[3] | t2;
	y[0] = t0 ^ t3;
	t4 = x[1] ^ x[3];
	t5 = t2 ^ y[0];
	t6 = t3 & t5;
	y[2] = t4 ^ t6;
	t7 = x[3] ^ t3;
	t8 = x[2] | t2;
	t9 = t5 & t8;
	y[3] = t7 | t9;
	ta = x[1] ^ y[2];
	tb = t8 ^ t9;
	tc = y[0] | ta;
	y[1] = tb ^ tc;
}
Serpent.sbox_4 = function(x,y)
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
Serpent.sbox_4_inv = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x[2] ^ x[3];
	t1 = x[2] | x[3];
	t2 = x[1] ^ t1;
	t3 = x[0] & t2;
	y[1] = t0 ^ t3;
	t4 = x[0] ^ x[3];
	t5 = t1 ^ t3;
	t6 = t4 & t5;
	y[3] = t2 ^ t6;
	t7 = x[2] ^ y[3];
	t8 = ~x[0];
	t9 = t7 | t8;
	y[0] = t2 ^ t9;
	ta = x[2] & t5;
	tb = t8 ^ ta;
	tc = x[3] | t7;
	y[2] = tb ^ tc;
}
Serpent.sbox_5 = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc;
	t0 = x[0] ^ x[1];
	t1 = x[0] ^ x[2];
	t2 = x[0] ^ x[3];
	t3 = t0 | t2;
	t4 = t1 ^ t3;
	y[0] = ~t4;
	t5 = x[1] ^ t2;
	t6 = x[3] | y[0];
	y[1] = t5 ^ t6;
	t7 = x[3] ^ t6;
	t8 = x[1] | t4;
	t9 = t5 | t7;
	y[2] = t8 ^ t9;
	ta = x[0] ^ t4;
	tb = x[3] ^ y[2];
	tc = t5 | tb;
	y[3] = ta ^ tc;
}
Serpent.sbox_5_inv = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td;
	t0 = x[0] ^ x[3];
	t1 = x[0] & x[1];
	t2 = x[1] & x[2];
	t3 = t0 | t1;
	y[0] = t2 ^ t3;
	t4 = x[0] ^ x[2];
	t5 = x[0] & x[3];
	t6 = x[1] & t3;
	t7 = t4 | t5;
	y[2] = t6 ^ t7;
	t8 = x[1] ^ x[2];
	t9 = ~t8;
	ta = t1 | t9;
	y[3] = t5 ^ ta;
	tb = x[0] ^ x[1];
	tc = t3 ^ y[3];
	td = t9 | tb;
	y[1] = tc ^ td;
}
Serpent.sbox_6 = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td, te;
	t0 = x[1] ^ x[2];
	t1 = x[0] & x[3];
	t2 = t0 ^ t1;
	y[1] = ~t2;
	t3 = x[0] ^ x[2];
	t4 = x[3] ^ t3;
	t5 = x[2] & t0;
	t6 = x[0] | x[1];
	t7 = t4 | t5;
	y[3] = t6 ^ t7;
	t8 = x[0] ^ t6;
	t9 = t1 ^ y[1];
	ta = t4 | t8;
	tb = y[3] | t9;
	y[0] = ta ^ tb;
	tc = x[0] ^ x[3];
	td = t3 ^ y[0];
	te = t0 | tc;
	y[2] = td ^ te;
}
Serpent.sbox_6_inv = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td;
	t0 = x[1] ^ x[3];
	t1 = ~x[2];
	t2 = x[0] | t1;
	y[1] = t0 ^ t2;
	t3 = x[0] ^ x[1];
	t4 = x[2] ^ t3;
	t5 = x[1] & t4;
	t6 = t1 ^ t5;
	t7 = t0 | t6;
	y[2] = t4 ^ t7;
	t8 = x[0] ^ t7;
	t9 = t0 ^ t5;
	ta = t3 | t9;
	y[3] = t8 ^ ta;
	tb = x[2] ^ y[1];
	tc = y[2] & tb;
	td = t8 | tc;
	y[0] = t9 ^ td;
}
Serpent.sbox_7 = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td, te, tf;
	t0 = x[0] ^ x[1];
	t1 = x[2] ^ t0;
	t2 = x[0] & x[2];
	t3 = x[0] & x[3];
	t4 = t1 | t2;
	y[3] = t3 ^ t4;
	t5 = x[0] ^ x[2];
	t6 = x[3] ^ t1;
	t7 = t0 & t5;
	t8 = t3 | t6;
	y[1] = t7 ^ t8;
	t9 = x[0] ^ t6;
	ta = t0 & t1;
	tb = t8 & t9;
	y[2] = ta | tb;
	tc = x[1] ^ x[3];
	td = x[3] | y[3];
	te = ~td;
	tf = t7 | te;
	y[0] = tc ^ tf;
}
Serpent.sbox_7_inv = function(x,y)
{
	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, ta, tb, tc, td;
	t0 = x[0] & x[1];
	t1 = x[0] | x[1];
	t2 = x[3] & t1;
	t3 = x[2] | t0;
	y[3] = t2 ^ t3;
	t4 = x[1] ^ x[3];
	t5 = x[0] | x[3];
	t6 = x[2] & t5;
	t7 = t0 | t4;
	y[2] = t6 ^ t7;
	t8 = x[0] ^ t4;
	t9 = x[1] ^ t2;
	ta = t3 | t9;
	tb = t8 ^ ta;
	y[1] = ~tb;
	tc = x[2] ^ t9;
	td = x[3] | y[1];
	y[0] = tc ^ td;
}
