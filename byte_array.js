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

const ByteArray = (() => {

// new ByteArray(size)
// new ByteArray(size, Array)
function ByteArray(...args) {
	if (args.length == 1) {
		const [size] = args;
		if (typeof size === 'number') {
			// len = ceil(arg0 / 4)
			this._buf = new Array((size + 3) >> 2);
			this._sz = size;
			this._buf.fill(0);
		} else
			throw new TypeError;
	} else if (args.length == 2) {
		const [size, buf] = args;
		if (typeof size === 'number' && buf.constructor === Array) {
			if (buf.length != (size + 3) >> 2)
				throw new RuntimeError('invalid parameter');
			this._buf = [...buf];
			this._sz = size;
		} else
			throw new TypeError;
	} else
		throw new RuntimeError('invalid parameters');
}
ByteArray.prototype = {};
ByteArray.prototype.constructor = ByteArray;

const B16_ALPHABET = '0123456789abcdef'.split('');
const B64_ALPHABET = (
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'abcdefghijklmnopqrstuvwxyz' +
    '0123456789+/').split('');

const B16_ALPHABET_REV = (() => {
	const diff = 'a'.charCodeAt(0) - 'A'.charCodeAt(0);
	const table = new Array('f'.charCodeAt(0) + 1);
	let i = 0;
	for (const ch of B16_ALPHABET) {
		const code = ch.charCodeAt(0);
		table[code] = i;
		table[code - diff] = i;
		i++;
	}
	return table;
})();
const B64_ALPHABET_REV = (() => {
	const table = new Array('z'.charCodeAt(0) + 1);
	let i = 0;
	for (const ch of B64_ALPHABET)
		table[ch.charCodeAt(0)] = i++;
	table['='.charCodeAt(0)] = -1;
	return table;
})();

ByteArray.prototype.size = function() {
	return this._sz;
}

/** Convert a buffer to a base64 string.
 *
 * buf.toBase64()
 * buf.toBase64(sz)
 * buf.toBase64(sz, off)
 *
 * \param sz	[optional] number of bytes to copy
 * \param off	[optional] start offset
 * \return	base64 string
 */
ByteArray.prototype.toBase64 = function(start, end) {
	const _buf = this._buf;
	const _sz = this._sz;

	switch (arguments.length) {
	case 0:
		start = 0;
		// fall
	case 1:
		end = _sz;
	}

	let accum = 0;
	let accumSz = 0;

	let res = '';
	while (start < end) {
		let x = _buf[start >>> 2];
		switch (start & 3) {
		case 0: x >>>= 24;            break;
		case 1: x  >>= 16; x &= 0xff; break;
		case 2: x  >>=  8; x &= 0xff; break;
		default:           x &= 0xff;
		}

		switch (accumSz) {
		case 0: x <<= 16; break;
		case 1: x <<= 8;
		}
		accum |= x;
		accumSz++;

		if (accumSz == 3) {
			let n0 = accum;
			const n3 = n0 & 0x3f; n0 >>= 6;
			const n2 = n0 & 0x3f; n0 >>= 6;
			const n1 = n0 & 0x3f; n0 >>= 6;
			res += B64_ALPHABET[n0] +
			    B64_ALPHABET[n1] +
			    B64_ALPHABET[n2] +
			    B64_ALPHABET[n3];
			accumSz = 0;
			accum = 0;
		}
		start++;
	}
	if (accumSz) {
		// 00aa0000 or 00aabb00
		let n0 = accum >> 6;
		const n2 = n0 & 0x3f; n0 >>= 6;
		const n1 = n0 & 0x3f; n0 >>= 6;
		res += B64_ALPHABET[n0] + B64_ALPHABET[n1];
		if (accumSz == 1)
			res += '==';
		else
			res += B64_ALPHABET[n2] + '=';
	}
	return res;
}

/** Convert a buffer to a hex string
 *
 * buf.toHex()
 * buf.toHex(start)
 * buf.toHex(start, end)
 *
 * \param start	[optional]
 * \param end	[optional]
 * \return	hex string
 */
ByteArray.prototype.toHex = function(start, end) {
	const _buf = this._buf;
	const _sz = this._sz;

	switch (arguments.length) {
	case 0:
		start = 0;
		// fallthrough
	case 1:
		end = _sz;
	}

	let res = '';
	while (start < end) {
		let x = _buf[start >> 2];
		switch (start & 3) {
		case 0: x >>>= 24;            break;
		case 1: x  >>= 16; x &= 0xff; break;
		case 2: x  >>=  8; x &= 0xff; break;
		default:           x &= 0xff;
		}

		res += B16_ALPHABET[x >> 4] + B16_ALPHABET[x & 0xf];
		start++;
	}
	return res;
}

ByteArray.prototype.toText = function() {
	try {
		return this.toUtf8();
	} catch (e) {
		if (e instanceof EncodingError)
			return this.toLatin();
		throw e;
	}
}

ByteArray.prototype.toLatin = function() {
	const _buf = this._buf;
	const _sz = this._sz;

	if (!_sz) return '';

	let res = '';
	for (let i = 0; i < _sz; i++) {
		let x = _buf[i >> 2];
		switch (i & 3) {
		case 0: x >>>= 24;            break;
		case 1: x  >>= 16; x &= 0xff; break;
		case 2: x  >>=  8; x &= 0xff; break;
		default:           x &= 0xff;
		}
		res += String.fromCharCode(x);
	}
	return res;
}

ByteArray.prototype.toUtf8 = function() {
	const _buf = this._buf;
	const _sz = this._sz;

	if (!_sz) return '';

	let accum = 0;
	let accumLeft = 0;

	let res = '';
	for (let i = 0; i < _sz; i++) {
		let x = _buf[i >> 2];
		switch (i & 3) {
		case 0: x >>>= 24;            break;
		case 1: x  >>= 16; x &= 0xff; break;
		case 2: x  >>=  8; x &= 0xff; break;
		default:           x &= 0xff;
		}

		if (accumLeft) {
			// in other words (x < 0x80 || x >= 0xc0)
			if ((x & 0xc0) != 0x80)
				throw new EncodingError('invalid UTF-8');
			x &= 0x3f;
			switch (accumLeft) {
			case 1:
				accum |= x;
				if (0xd800 <= accum && accum < 0xe000 ||
				    0x110000 <= accum)
					throw new EncodingError(
					    'invalid UTF-8');
				res += String.fromCharCode(accum);
				accum = 0;
				break;
			case 2:
				accum |= x << 6;
				break;
			case 3:
				accum |= x << 12;
				break;
			default:
				throw new AssertionError;
			}
			accumLeft--;
		} else {
			if (x < 0x80)
				res += String.fromCharCode(x);
			else if (x < 0xc0)
				throw new EncodingError('invalid UTF-8');
			else if (x < 0xe0) {
				accum = (x & 0x1f) << 6;
				accumLeft = 1;
			} else if (x < 0xf0) {
				accum = (x & 0xf) << 12;
				accumLeft = 2;
			} else if (x < 0xf8) {
				accum = (x & 0x7) << 18;
				accumLeft = 3;
			} else
				throw new EncodingError('invalid UTF-8');
		}
	}
	return res;
}

ByteArray.prototype.get = function(index) {
	if (index < 0 || index >= this._sz)
		throw new IndexError;
	const x = this._buf[index >> 2];
	switch (index & 3) {
	case 0:  return x >>> 24;
	case 1:  return (x >> 16) & 0xff;
	case 2:  return (x >> 8) & 0xff;
	default: return x & 0xff;
	}
}

ByteArray.prototype.get16 = function(index) {
	if (index < 0 || index >= (this._sz >> 1))
		throw new IndexError;
	const t = this._buf[index >> 1];
	return index & 1 ? t & 0xffff : t >>> 16;
}

ByteArray.prototype.get32 = function(index) {
	if (index < 0 || index >= (this._sz >> 2))
		throw new IndexError;
	return this._buf[index];
}

ByteArray.prototype.get64 = function(index) {
	index <<= 1;
	if (index < 0 || index+1 >= (this._sz >> 2))
		throw new IndexError;
	const _buf = this._buf;
	return new Long(_buf[index], _buf[index + 1]);
}

ByteArray.prototype.set = function(index, value) {
	if (index < 0 || index >= this._sz)
		throw new IndexError;
	const _buf = this._buf;
	let mask;
	value &= 0xff;
	switch (index & 3) {
	case 0:
		value <<= 24;
		mask = 0x00ffffff;
		break;
	case 1:
		value <<= 16;
		mask = 0xff00ffff;
		break;
	case 2:
		value <<= 8;
		mask = 0xffff00ff;
		break;
	case 3:
		mask = 0xffffff00;
	}
	const i32 = index >> 2;
	_buf[i32] = (_buf[i32] & mask) | value;
}

ByteArray.prototype.set16 = function(index, value) {
	if (index < 0 || index >= (this._sz >> 1))
		throw new IndexError;
	const _buf = this._buf;
	const i32 = index >> 1;
	if (index & 1)
		_buf[i32] = (_buf[i32] & 0xffff0000) | (value & 0xffff);
	else
		_buf[i32] = (_buf[i32] & 0xffff) | (value << 16);
}
ByteArray.prototype.set32 = function(index, value) {
	if (index < 0 || index >= (this._sz >> 2))
		throw new IndexError;
	this._buf[index] = value & 0xffffffff;
}

ByteArray.prototype.set64 = function(index, value) {
	index <<= 1;
	if (index < 0 || index >= (this._sz >>> 2))
		throw new IndexError;
	const _buf = this._buf;
	_buf[index] = value.hi();
	_buf[index+1] = value.lo();
}

function _swap16_lo(n) {
	return ((n << 8) & 0xff00) | (n >> 8);
}

function _swap16_hi(n) {
	return ((n << 8) & 0xff000000) | ((n >> 8) & 0xff0000);
}

function _swap32(n) {
	n = ((n >> 8) & 0x00ff00ff) | ((n << 8) & 0xff00ff00);
	return (n << 16) | (n >>> 16);
}

/** swap byte order in place
 *
 * if two arguments given, second interpreted as 'count'
 * \param buf	data buffer
 * \param off	(optional) index in buffer to start at
 * \param count	(optional) number of elements to swap
 */
ByteArray.prototype.swap16 = function(off, count) {
	if (off < 0) throw new IndexError;
	if (!count) return;
	off <<= 1;
	const end = off + count << 1;
	if (end > this._sz) throw new IndexError;

	const _buf = this._buf;

	let i = off >> 1;
	if (off & 2) {
		// swap lo half
		const x = _buf[i];
		_buf[i] = (x & 0xffff0000) | _swap16_lo(x & 0xffff);
		off += 2;
		i++;
	}
	while (off + 2 < end) {
		// swap lo half, hi half
		const x = _buf[i];
		_buf[i] = _swap16_hi(x & 0xffff000) | _swap16_lo(x & 0xffff);
		off += 4;
		i++;
	}
	if (off != end) {
		// swap hi half
		const x = _buf[i];
		_buf[i] = _swap16_hi(x & 0xffff0000) | (x & 0xffff);
		off += 2;
	}
}

ByteArray.prototype.swap32 = function(off, count) {
	if (off < 0) throw new IndexError;
	if (!count) return;
	off <<= 2;
	const end = off + count << 2;
	if (end > this._sz) throw new IndexError;

	const _buf = this._buf;

	let i = off >> 2;
	while (off < end) {
		_buf[i] = _swap32(_buf[i]);
		off += 4;
		i++;
	}
}

ByteArray.prototype.swap64 = function(off, count) {
	if (off < 0) throw new IndexError;
	if (!count) return;
	off <<= 3;
	const end = off + count << 3;
	if (end > this._sz) throw new IndexError;

	const _buf = this._buf;

	let i = off >> 3;
	while (off < end) {
		const t = _swap32(_buf[i]);
		_buf[i] = _swap32(_buf[i+1]);
		_buf[i+1] = t;
		off += 8;
		i += 2;
	}
}

ByteArray.prototype.fill = function(value) {
	// XXX this is probably wrong unless value is 0
	this._buf.fill(value);
}

/** convert a hex string to bytes
 * \param str	hex string
 * \return	the buffer
 */
ByteArray.fromHex = str => {
	if (str.length & 1) throw new RuntimeError('invalid parameter');

	// len: ceil(str.length / 8)
	const buf = new Array((str.length + 7) >> 3);
	const sz = str.length >> 1;

	let pos = 0;
	let accum = 0;
	let accumSz = 0;
	for (const ch of str.split('')) {
		const c = B16_ALPHABET_REV[ch.charCodeAt(0)];
		if (c == null) throw new RuntimeError('invalid parameter');
		switch (accumSz) {
		case 0: accum  = c << 28; break;
		case 1: accum |= c << 24; break;
		case 2: accum |= c << 20; break;
		case 3: accum |= c << 16; break;
		case 4: accum |= c << 12; break;
		case 5: accum |= c << 8; break;
		case 6: accum |= c << 4; break;
		case 7:
			buf[pos++] = accum | c;
		}
		accumSz++;
		accumSz &= 0x3;
	}
	if (accumSz)
		buf[pos++] = accum;
	return new ByteArray(sz, buf);
}

/** convert a base64 string to bytes
 * \param str	base64 string
 * \return	the buffer
 */
ByteArray.fromBase64 = str => {
	if (str.length & 3) throw new RuntimeError('invalid parameter');

	const buf = [];
	let sz = 0;

	// stores a sequence of up to four input values (24 bits)
	let accum = 0;
	let accumSz = 0;
	let pad = 0;
	for (const ch of str.split('')) {
		const c = B64_ALPHABET_REV[ch.charCodeAt(0)];
		if (c == null) throw new RuntimeError('invalid parameter');

		accum <<= 6;
		// disallow more than two pad chars or anything after a pad
		if (c == -1)
			if (++pad == 3) throw new RuntimeError('invalid parameter');
		else if (pad) {
			// non-trailing padding
			throw new RuntimeError('invalid parameter');
		} else
			accum |= c;

		if (++accumSz == 4) {
			switch (sz & 3) {
			case 0:
				buf.push(accum << 8);
				break;
			case 1:
				buf[buf.length-1] |= accum;
				break;
			case 2:
				buf[buf.length-1] |= accum >> 8;
				buf.push(accum << 24);
				break;
			default:
				buf[buf.length-1] |= accum >> 16;
				buf.push(accum << 16);
			}
			accum = 0;
			accumSz = 0;
			sz += 3;
		}
	}
	return new ByteArray(sz, buf);
}

ByteArray.fromLatin = str => {
	const buf = [];
	let sz = 0;

	// a buffer before appending to buf; fill high bytes first
	let accum = 0;
	let accumSz = 0;

	for (const ch of str.split('')) {
		const code = ch.charCodeAt(0);
		if (code >= 0x100)
			throw new RuntimeError('invalid Latin1');
		switch (accumSz) {
		case 0:
			accum = code << 24;
			accumSz = 1;
			break;
		case 1:
			accum |= code << 16;
			accumSz = 2;
			break;
		case 2:
			accum |= code << 8;
			accumSz = 3;
			break;
		default:
			buf.push(accum | code);
			accum = 0;
			accumSz = 0;
		}
		sz++;
	}
	if (accumSz)
		buf.push(accum);
	return new ByteArray(sz, buf);
}

/** convert a text string to bytes
 * \param str	text string
 * \return	the buffer
 */
ByteArray.fromText = str => {
	const buf = [];
	let sz = 0;

	// a buffer before appending to buf; fill high bytes first
	let accum = 0;
	let accumSz = 0;

	for (const ch of str.split('')) {
		const code = ch.charCodeAt(0);
		if (code < 0x80) {
			switch (accumSz) {
			case 0:
				accum = code << 24;
				accumSz = 1;
				break;
			case 1:
				accum |= code << 16;
				accumSz = 2;
				break;
			case 2:
				accum |= code << 8;
				accumSz = 3;
				break;
			default:
				buf.push(accum | code);
				accum = 0;
				accumSz = 0;
			}
			sz++;
		} else if (code < 0x800) {
			let c = code;
			const c1 = 0x80 | (c & 0x3f); c >>= 6;
			const c0 = 0xc0 | c;
			switch (accumSz) {
			case 0:
				accum = (c0 << 24) | (c1 << 16);
				accumSz = 2;
				break;
			case 1:
				accum |= (c0 << 16) | (c1 << 8);
				accumSz = 3;
				break;
			case 2:
				buf.push(accum | (c0 << 8) | c1);
				accum = 0;
				accumSz = 0;
				break;
			default:
				buf.push(accum | c0);
				accum = c1 << 24;
				accumSz = 1;
			}
			sz += 2;
		} else if (code < 0x10000) {
			if (0xd800 <= code && code < 0xe000 || 0x110000 <= code)
				throw new EncodingError('invalid UTF-8');
			let c = code;
			const c2 = 0x80 | (c & 0x3f); c >>= 6;
			const c1 = 0x80 | (c & 0x3f); c >>= 6;
			const c0 = 0xe0 | c;
			switch (accumSz) {
			case 0:
				accum = (c0 << 24) | (c1 << 16) | (c2 << 8);
				accumSz = 3;
				break;
			case 1:
				buf.push(accum | (c0 << 16) | (c1 << 8) | c2);
				accum = 0;
				accumSz = 0;
				break;
			case 2:
				buf.push(accum | (c0 << 8) | c1);
				accum = c2 << 24;
				accumSz = 1;
				break;
			default:
				buf.push(accum | c0);
				accum = (c1 << 24) | (c2 << 16);
				accumSz = 2;
			}
			sz += 3;
		} else if (code < 0x200000) {
			let c = code;
			const c3 = 0x80 | (c & 0x3f); c >>= 6;
			const c2 = 0x80 | (c & 0x3f); c >>= 6;
			const c1 = 0x80 | (c & 0x3f); c >>= 6;
			const c0 = 0xf0 | c;
			switch (accumSz) {
			case 0:
				buf.push((c0 << 24) | (c1 << 16) | (c2 << 8) | c3);
				break;
			case 1:
				buf.push(accum | (c0 << 16) | (c1 << 8) | c2);
				accum = c3 << 24;
				break;
			case 2:
				buf.push(accum | (c0 << 8) | c1);
				accum = (c2 << 24) | (c3 << 16);
				break;
			default:
				buf.push(accum | c0);
				accum = (c1 << 24) | (c2 << 16) | (c3 << 8);
			}
			sz += 4;
		} else
			throw new EncodingError('invalid UTF-8');
	}
	if (accumSz)
		buf.push(accum);
	return new ByteArray(sz, buf);
}

return ByteArray;
})();
