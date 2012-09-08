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

/** Create a 64-bit integer
 * 
 * Two arguments: (a << 32 | b)
 * One argument: a
 * No arguments: 0
 */
Long = function(a,b)
{
	this.constructor = Long;
	switch (arguments.length) {
	case 0:
		// Long(void)
		this.n = [0,0,0,0];
		break;
	case 1:
		if (a.constructor == Long) {
			// Long(Long n)
			this.n = a.n.slice();
		} else {
			// Long(int n)
			this.n = [0,0, (a>>>16) & 0xffff, a & 0xffff];
		}
		break;
	default:
		// Long(int hi, int lo)
		this.n = [(a>>>16) & 0xffff, a & 0xffff,
		    (b>>>16) & 0xffff, b & 0xffff];
	}
}
Long.prototype = {};
Long.prototype.toString = function()
{
	var res = '';
	for (var i = 0; i < 4; i++) {
		var s = this.n[i].toString(16);
		while (s.length < 4) s = '0' + s;
		res += s;
	}
	return res;
}
// n=0: least-significant
Long.prototype.get8 = function(n)
{
	return (this.n[(n>>>1) ^ 3] >> ((n & 1) << 3)) & 0xff;
}
Long.prototype.get16 = function(n)
{
	return this.n[n ^ 3];
}
/** Return sum of two Long
 * \param carry[optional] 0 or 1*/
Long.add = function(a,b,carry)
{
	carry = carry || 0;
	var n = new Long;
	for (var i = 3; i > -1; i--) {
		n.n[i] = a.n[i] + b.n[i] + carry;
		if (i) carry = n.n[i] >>> 16;
		n.n[i] &= 0xffff;
	}
	return n;
}
/** Return difference of two Long */
Long.subtract = function(a,b)
{
	return Long.add(a, Long.not(b), 1);
}
/** Return XOR of two Long */
Long.xor = function(a,b)
{
	var t = new Long;
	for (var i = 0; i < 4; i++)
		t.n[i] = a.n[i] ^ b.n[i];
	return t;
}
Long.xor_list = function(lst)
{
	switch (lst.length) {
	case 0: return new Long;
	case 1: return new Long(lst[0]);
	}
	var res = lst[0];
	for (var i = 1; i < lst.length; i++)
		res = Long.xor(res, lst[i]);
	return res;
}
/** Return AND of two Long */
Long.and = function(a,b)
{
	var t = new Long;
	for (var i = 0; i < 4; i++)
		t.n[i] = a.n[i] & b.n[i];
	return t;
}
/** Return OR of two long */
Long.or = function(a,b)
{
	var t = new Long;
	for (var i = 0; i < 4; i++)
		t.n[i] = a.n[i] | b.n[i];
	return t;
}
/** Return NOT of a Long */
Long.not = function(a)
{
	var t = new Long;
	for (var i = 0; i < 4; i++)
		t.n[i] = ~a.n[i] & 0xffff;
	return t;
}
/** Return LSHIFT of a Long (b is integer) */
Long.lshift = function(a,b)
{
	if (b > 16)
		return Long.lshift(Long.lshift(a,16),b-16);
	var t = new Long;
	var carry = 0;
	for (var i = 3; i > -1; i--) {
		t.n[i] = (a.n[i] << b) | carry;
		carry = (t.n[i] >> 16) & 0xffff;
		t.n[i] &= 0xffff;
	}
	return t;
}
/** Return RSHIFT of a Long (b is integer) */
Long.rshift = function(a,b)
{
	if (b > 16)
		return Long.rshift(Long.rshift(a,16),b-16);
	var t = new Long;
	var carry = 0;
	for (var i = 0; i < 4; i++) {
		t.n[i] = (a.n[i] << (16-b)) | (carry << 16);
		carry = t.n[i] & 0xffff;
		t.n[i] >>>= 16;
	}
	return t;
}
/** Return product of a Long (a) and an integer (b) */
Long.multiply = function(a,b)
{
	var t = new Long;
	while (b) {
		if (b&1) t = Long.add(t,a);
		a = Long.add(a,a);
		b >>>= 1;
	}
	return t;
}
