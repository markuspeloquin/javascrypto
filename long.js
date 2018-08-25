/* Copyright (c) 2016, Markus Peloquin <markus@cs.wisc.edu>
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

const Long = (function(){

/** Create a 64-bit integer
 *
 * Two arguments: (a << 32 | b)
 * One argument: a
 * No arguments: 0
 */
function Long(...args) {
	this._n = [0, 0, 0, 0];
	if (!args.length) {
		// Long(void)
	} else if (args.length == 1 || args.length == 2) {
		// Long(Long)
		// Long(n)
		// Long(hi, lo)
		this.set(...args);
	} else
		throw new TypeError("too many arguments");
}
Long.prototype = {};
Long.prototype.constructor = Long;

Long.prototype.lo = function() {
	const [_n0, _n1, _n2, _n3] = this._n;
	return (_n2 << 16) | _n3;
}

Long.prototype.hi = function() {
	const [_n0, _n1, _n2, _n3] = this._n;
	return (_n0 << 16) | _n1;
}

// i=0: least-significant
Long.prototype.get8 = function(i) {
	if (i & ~0x7) throw new IndexError("invalid index " + i);
	const j = (i >>> 1) ^ 3;
	return (this._n[j] >>> ((i & 1) << 3)) & 0xff;
}

Long.prototype.get16 = function(i) {
	if (i & 0x3) throw new IndexError("invalid index " + i);
	const j = i ^ 3;
	return this._n[j];
}

Long.prototype.get32 = function(i) {
	if (i & ~0x1) throw new IndexError("invalid index " + i);
	const [_n0, _n1, _n2, _n3] = this._n;
	return i ? ((_n0 << 16) | _n1) : ((_n2 << 16) | _n3);
}

Long.prototype.get = function() {
	const [_n0, _n1, _n2, _n3] = this._n;
	return [
		(_n0 << 16) | _n1,
		(_n2 << 16) | _n3,
	];
}

Long.prototype.set8 = function(i, v) {
	if (i & ~0x7) throw new IndexError("invalid index " + i);
	const _n = this._n;
	const j = (i >>> 1) ^ 3;
	let v0 = _n[j];
	if (i & 1)
		v0 = (v0 & 0xff) | ((v & 0xff) << 8);
	else
		v0 = (v0 & 0xff00) | (v & 0xff);
	_n[j] = v0;
}

Long.prototype.set16 = function(i, v) {
	if (i & ~0x3) throw new IndexError("invalid index " + i);
	const j = i ^ 3;
	this._n[j] = v & 0xffff;
}

Long.prototype.set32 = function(i, v) {
	if (i & ~0x1) throw new IndexError("invalid index " + i);
	const _n = this._n;
	const j = (i ^ 1) << 1;
	_n[j] = v >>> 16;
	_n[j + 1] = v & 0xffff;
}

Long.prototype.set = function(...args) {
	const _n = this._n;
	if (args.length == 1) {
		const [v] = args;
		if (v.constructor === Long) {
			_n[0] = v._n[0];
			_n[1] = v._n[1];
			_n[2] = v._n[2];
			_n[3] = v._n[3];
		} else {
			_n[0] = _n[1] = 0;
			_n[2] = v >>> 16;
			_n[3] = v & 0xffff;
		}
	} else if (args.length == 2) {
		const [hi, lo] = args;
		_n[0] = hi >>> 16;
		_n[1] = hi & 0xffff;
		_n[2] = lo >>> 16;
		_n[3] = lo & 0xffff;
	} else
		throw new TypeError("too many arguments");
}

Long.prototype.toString = function() {
	return this.toHex();
}

Long.prototype.toHex = function() {
	const [n0, n1, n2, n3] = this._n;

	const s0 = n0.toString(16);
	const s1 = n1.toString(16);
	const s2 = n2.toString(16);
	const s3 = n3.toString(16);

	const zeros = '000';
	return zeros.substring(s0.length - 1) + s0 +
	    zeros.substring(s1.length - 1) + s1 +
	    zeros.substring(s2.length - 1) + s2 +
	    zeros.substring(s3.length - 1) + s3;
}

/** Return sum of two Long
 * \param carry[optional] 0 or 1*/
Long.prototype.plus = function(b, carry) {
	const [a0, a1, a2, a3] = this._n;
	const [b0, b1, b2, b3] = b._n;
	carry = carry ? 1 : 0;

	let   s3 =  a3 + b3 + carry; carry = s3 >>> 16; s3 &= 0xffff;
	let   s2 =  a2 + b2 + carry; carry = s2 >>> 16; s2 &= 0xffff;
	let   s1 =  a1 + b1 + carry; carry = s1 >>> 16; s1 &= 0xffff;
	const s0 = (a0 + b0 + carry) & 0xffff;

	const sum = new Long;
	sum._n = [s0, s1, s2, s3];
	return sum;
}

/** Return difference of two Long */
Long.prototype.minus = function(b) {
	return this.plus(b.not(), 1);
}

Long.prototype.neg = function() {
	return new Long().plus(this.not(), 1);
}

Long.prototype.swap = function() {
	let [n0, n1, n2, n3] = this._n;
	n0 = ((n0 & 0xff) << 8) | (n0 >> 8);
	n1 = ((n1 & 0xff) << 8) | (n1 >> 8);
	n2 = ((n2 & 0xff) << 8) | (n2 >> 8);
	n3 = ((n3 & 0xff) << 8) | (n3 >> 8);
	const out = new Long;
	out._n = [n3, n2, n1, n0];
	return out;
}

/** Return XOR of two Long */
Long.prototype.xor = function(b) {
	const [a0, a1, a2, a3] = this._n;
	const [b0, b1, b2, b3] = b._n;
	const out = new Long;
	out._n = [a0 ^ b0, a1 ^ b1, a2 ^ b2, a3 ^ b3];
	return out;
}

Long.xorList = function(longs) {
	switch (longs.length) {
	case 0: return new Long;
	case 1: return new Long(longs[0]);
	}
	let [r0, r1, r2, r3] = [0, 0, 0, 0];
	for (const val of longs) {
		const [n0, n1, n2, n3] = val._n;
		r0 ^= n0;
		r1 ^= n1;
		r2 ^= n2;
		r3 ^= n3;
	}
	const out = new Long;
	out._n = [r0, r1, r2, r3];
	return out;
}

/** Return AND of two Long */
Long.prototype.and = function(b) {
	const [a0, a1, a2, a3] = this._n;
	const [b0, b1, b2, b3] = b._n;
	const out = new Long;
	out._n = [a0 & b0, a1 & b1, a2 & b2, a3 & b3];
	return out;
}

/** Return OR of two long */
Long.prototype.or = function(b) {
	const [a0, a1, a2, a3] = this._n;
	const [b0, b1, b2, b3] = b._n;
	const out = new Long;
	out._n = [a0 | b0, a1 | b1, a2 | b2, a3 | b3];
	return out;
}

/** Return NOT of a Long */
Long.prototype.not = function() {
	let [n0, n1, n2, n3] = this._n;
	n0 = ~n0 & 0xffff;
	n1 = ~n1 & 0xffff;
	n2 = ~n2 & 0xffff;
	n3 = ~n3 & 0xffff;
	const out = new Long;
	out._n = [n0, n1, n2, n3];
	return out;
}

/** Return LSHIFT of a Long (b is integer) */
Long.prototype.lshift = function(b) {
	// b = small + large * 16
	// if b = -37, then small = 11, large = -3; 11 - 3 * 16 = -37
	const small = b & 0xf;
	const large = b >> 4;

	let nZ = 0;
	let [n0, n1, n2, n3] = this._n;
	if (small) {
		// n0...n3 are all at most 0x7fff0000, which is still positive
		n0 <<= small;
		n1 <<= small;
		n2 <<= small;
		n3 <<= small;
		nZ = n0 >> 16;
		n0 |= n1 >> 16;
		n1 |= n2 >> 16;
		n2 |= n3 >> 16;
		n0 &= 0xffff;
		n1 &= 0xffff;
		n2 &= 0xffff;
		n3 &= 0xffff;
	}
	switch (large) {
	case -4:
		n3 = nZ;
		n2 = 0;
		n1 = 0;
		n0 = 0;
		break;
	case -3:
		n3 = n0;
		n2 = nZ;
		n1 = 0;
		n0 = 0;
		break;
	case -2:
		n3 = n1;
		n2 = n0;
		n1 = nZ;
		n0 = 0;
		break;
	case -1:
		n3 = n2;
		n2 = n1;
		n1 = n0;
		n0 = nZ;
		break;
	case 0:
		break;
	case 1:
		n0 = n1;
		n1 = n2;
		n2 = n3;
		n3 = 0;
		break;
	case 2:
		n0 = n2;
		n1 = n3;
		n2 = 0;
		n3 = 0;
		break;
	case 3:
		n0 = n3;
		n1 = 0;
		n2 = 0;
		n3 = 0;
		break;
	default:
		return new Long;
	}
	const res = new Long;
	res._n = [n0, n1, n2, n3];
	return res;
}

/** Return RSHIFT of a Long (b is integer) */
Long.prototype.rshift = function(b) {
	return this.lshift(-b);
}

/** Return product of a Long and an integer (b) */
Long.prototype.times = function(b) {
	// XXX Avoid this function if possible by using addition and shifts.
	let t = this;
	let sum = new Long;
	if (!b) return sum;
	const neg = b < 0;
	if (neg) b = -b;
	for (;;) {
		if (b & 1) sum = sum.plus(t);
		b >>>= 1;
		if (!b) break;
		t = t.plus(t);
	}
	return neg ? sum.neg() : sum;
}

return Long;
})();
