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

const Long = (() => {

class Long {
	/** Create a 64-bit integer
	 *
	 * Two arguments: (a << 32 | b)
	 * One argument: a
	 * No arguments: 0
	 */
	constructor(...args) {
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

	lo() {
		const [_n0, _n1, _n2, _n3] = this._n;
		return (_n2 << 16) | _n3;
	}

	hi() {
		const [_n0, _n1, _n2, _n3] = this._n;
		return (_n0 << 16) | _n1;
	}

	// i=0: least-significant
	get8(i) {
		if (i & ~0x7) throw new IndexError("invalid index " + i);
		const j = (i >>> 1) ^ 3;
		return (this._n[j] >>> ((i & 1) << 3)) & 0xff;
	}

	get16(i) {
		if (i & 0x3) throw new IndexError("invalid index " + i);
		const j = i ^ 3;
		return this._n[j];
	}

	get32(i) {
		if (i & ~0x1) throw new IndexError("invalid index " + i);
		const [_n0, _n1, _n2, _n3] = this._n;
		return i ? ((_n0 << 16) | _n1) : ((_n2 << 16) | _n3);
	}

	get() {
		const [_n0, _n1, _n2, _n3] = this._n;
		return [
			(_n0 << 16) | _n1,
			(_n2 << 16) | _n3,
		];
	}

	set8(i, v) {
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

	set16(i, v) {
		if (i & ~0x3) throw new IndexError("invalid index " + i);
		const j = i ^ 3;
		this._n[j] = v & 0xffff;
	}

	set32(i, v) {
		if (i & ~0x1) throw new IndexError("invalid index " + i);
		const _n = this._n;
		const j = (i ^ 1) << 1;
		_n[j] = v >>> 16;
		_n[j + 1] = v & 0xffff;
	}

	set(...args) {
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

	toHex() {
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

	/** Serialize the number in base 10, signed. */
	toString() {
		let _n = this._n;
		let neg = false;
		if (_n[0] & 0x8000) {
			neg = true;
			_n = this.neg()._n;
		}
		let [n0, n1, n2, n3] = _n;

		const stack = [];
		const digits = '0123456789'.split('');
		// if all bits are random, 18.66 loops on average
		// if the VM is smart, there's four divisions per iteration
		while (n0 || n1 || n2 || n3) {
			n1 += (n0 % 10) << 16; n0 = n0 / 10 ^ 0;
			n2 += (n1 % 10) << 16; n1 = n1 / 10 ^ 0;
			n3 += (n2 % 10) << 16; n2 = n2 / 10 ^ 0;
			const r = n3 % 10;     n3 = n3 / 10 ^ 0;

			stack.push(digits[r]);
		}
		if (!stack.length) return '0';
		if (neg) stack.push('-');
		return stack.reverse().join('');
	}

	/** Return sum of two Long
	 * \param carry[optional] 0 or 1*/
	plus(b, carry) {
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
	minus(b) {
		return this.plus(b.not(), 1);
	}

	neg() {
		// 0 - this
		return new Long().plus(this.not(), 1);
	}

	swap() {
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
	xor(b) {
		const [a0, a1, a2, a3] = this._n;
		const [b0, b1, b2, b3] = b._n;
		const out = new Long;
		out._n = [a0 ^ b0, a1 ^ b1, a2 ^ b2, a3 ^ b3];
		return out;
	}

	static xorList(longs) {
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
	and(b) {
		const [a0, a1, a2, a3] = this._n;
		const [b0, b1, b2, b3] = b._n;
		const out = new Long;
		out._n = [a0 & b0, a1 & b1, a2 & b2, a3 & b3];
		return out;
	}

	/** Return OR of two long */
	or(b) {
		const [a0, a1, a2, a3] = this._n;
		const [b0, b1, b2, b3] = b._n;
		const out = new Long;
		out._n = [a0 | b0, a1 | b1, a2 | b2, a3 | b3];
		return out;
	}

	/** Return NOT of a Long */
	not() {
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
	lshift(b) {
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
	rshift(b) {
		return this.lshift(-b);
	}

	/** Return product of a Long/integer (b) */
	times(b) {
		if (typeof b === 'number') {
			if (-0x10000 < b && b < 0x10000)
				return _multInt16(this, b);
			else
				return _multLong(this, new Long(b));
		}
		return _multLong(this, b);
	}
}

function _multInt16(a, b) {
	const [a0, a1, a2, a3] = a._n;

	let neg = false;
	if (b < 0) {
		neg = true;
		b = -b;
	}

	const c3 = a3 * b;
	const c2 = a2 * b + (c3 >>> 16);
	const c1 = a1 * b + (c2 >>> 16);
	const c0 = a0 * b + (c1 >>> 16);

	const hi = (c0 << 16) | (c1 & 0xffff);
	const lo = (c2 << 16) | (c3 & 0xffff);

	const product = new Long(hi, lo);
	return neg ? product.neg() : product;
}

function _multLong(a, b) {
	const [a0, a1, a2, a3] = a._n;
	const [b0, b1, b2, b3] = b._n;

	let [s0, s1, s2, s3] = [0, 0, 0, 0];

	s3 = a3 * b3;
	s2 = a2 * b3 + (s3 >>> 16);
	s1 = a1 * b3 + (s2 >>> 16);
	s0 = a0 * b3 + (s1 >>> 16);
	s1 &= 0xffff; s2 &= 0xffff; s3 &= 0xffff;

	s2 += a3 * b2;
	s1 += a2 * b2 + (s2 >>> 16);
	s0 += a1 * b2 + (s1 >>> 16);
	s1 &= 0xffff; s2 &= 0xffff;

	s1 += a3 * b1;
	s0 += a2 * b1 + (s1 >>> 16);
	s1 &= 0xffff;

	s0 += a3 * b0;

	const hi = (s0 << 16) | s1;
	const lo = (s2 << 16) | s3;

	return new Long(hi, lo);
}

return Long;
})();
