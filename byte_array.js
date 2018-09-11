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

function _splitBytes(val) {
	const b3 = val & 0xff; val >>>= 8;
	const b2 = val & 0xff; val >>>= 8;
	const b1 = val & 0xff; val >>>= 8;
	const b0 = val;
	return [b0, b1, b2, b3];
}

class ByteArray {
	// new ByteArray(size)
	// new ByteArray(int[], size)
	constructor(...args) {
		if (args.length == 1) {
			const [arg0] = args;
			if (typeof arg0 === 'number')
				this._buf = new ArrayBuffer(arg0);
			else if (arg0.constructor == ArrayBuffer)
				this._buf = arg0.slice();
			else
				throw new TypeError;
		} else if (args.length == 2) {
			const [buf, size] = args;
			if (typeof size === 'number' &&
			    buf.constructor === Array) {
				if (buf.length != (size + 3) >> 2)
					throw new RuntimeError(
					    'invalid size');

				const newbuf = this._buf =
				    new ArrayBuffer(size);
				const view = new DataView(newbuf);
				const words = size >> 2;
				for (let i = 0, j = 0; j != words;
				    i += 4, j++)
					view.setUint32(i, buf[j], false);
				if (words != buf.length) {
					const b = _splitBytes(
					    buf[buf.length - 1]);
					for (let i = words << 2, j = 0;
					    i != size; i++, j++)
						view.setUint8(i, b[j]);
				}
			} else
				throw new TypeError;
		} else
			throw new RuntimeError('invalid parameters');
		this._view = new DataView(this._buf);
	}

	size() {
		return this._buf.byteLength;
	}

	fill(val=0) {
		const _view = this._view;
		const size = _view.byteLength;
		const size4 = size & ~0x3;

		const fillByte = val & 0xff;
		let fillWord = fillByte | (fillByte << 8);
		fillWord |= fillWord << 16;

		for (let i = 0; i != size4; i += 4)
			_view.setUint32(i, fillWord);
		for (let i = size4; i != size; i++)
			_view.setUint8(i, fillByte);
	}

	get(index) {
		const _view = this._view;
		if (index < 0 || index >= _view.byteLength)
			throw new IndexError(index);
		return _view.getUint8(index);
	}

	get16(index, littleEndian=false) {
		const _view = this._view;
		if (index < 0 || index >= _view.byteLength >>> 1)
			throw new IndexError(index);
		return _view.getUint16(index << 1, littleEndian);
	}

	get32(index, littleEndian=false) {
		const _view = this._view;
		if (index < 0 || index >= _view.byteLength >>> 2)
			throw new IndexError(index);
		return _view.getUint32(index << 2, littleEndian);
	}

	get64(index, littleEndian=false) {
		const _view = this._view;
		if (index < 0 || index >= _view.byteLength >>> 3)
			throw new IndexError(index);
		index <<= 3;
		const hi = _view.getUint32(index, littleEndian);
		const lo = _view.getUint32(index + 4, littleEndian);
		return littleEndian ? new Long(lo, hi) : new Long(hi, lo);
	}

	set(index, val) {
		const _view = this._view;
		if (index < 0 || index >= _view.byteLength)
			throw new IndexError(index);
		_view.setUint8(index, val);
	}

	set16(index, val, littleEndian=false) {
		const _view = this._view;
		if (index < 0 || index >= _view.byteLength >>> 1)
			throw new IndexError(index);
		_view.setUint16(index << 1, val, littleEndian);
	}
	set32(index, val, littleEndian=false) {
		const _view = this._view;
		if (index < 0 || index >= _view.byteLength >>> 2)
			throw new IndexError(index);
		_view.setUint32(index << 2, val, littleEndian);
	}

	set64(index, val, littleEndian=false) {
		const _view = this._view;
		if (index < 0 || index >= _view.byteLength >>> 3)
			throw new IndexError(index);
		index <<= 3;
		if (littleEndian) {
			_view.setUint32(index, val.lo(), true);
			_view.setUint32(index + 4, val.hi(), true);
		} else {
			_view.setUint32(index, val.hi(), false);
			_view.setUint32(index + 4, val.lo(), false);
		}
	}

	/** swap byte order in place
	 *
	 * if two arguments given, second interpreted as 'count'
	 * \param buf	data buffer
	 * \param off	(optional) index in buffer to start at
	 * \param count	(optional) number of elements to swap
	 */
	swap16(off=0, count=-1) {
		const _view = this._view;
		let end;
		if (count == -1)
			end = (_view.byteLength >>> 1) - off;
		else
			end = off + count;
		if (off < 0 || end > _view.byteLength >>> 1)
			throw new IndexError;

		for (let i = off, j = off << 1; i != end; i++, j += 2)
			_view.setUint16(j, _view.getUint16(j, false), true);
	}

	swap32(off=0, count=-1) {
		const _view = this._view;
		let end;
		if (count == -1)
			end = (_view.byteLength >>> 2) - off;
		else
			end = off + count;
		if (off < 0 || end > _view.byteLength >>> 2)
			throw new IndexError;

		for (let i = off, j = off << 2; i != end; i++, j += 4)
			_view.setUint32(j, _view.getUint32(j, false), true);
	}

	swap64(off=0, count=-1) {
		const _view = this._view;
		let end;
		if (count == -1)
			end = (_view.byteLength >>> 3) - off;
		else
			end = off + count;
		if (off < 0 || end > _view.byteLength >>> 3)
			throw new IndexError;

		for (let i = off, j = off << 3; i != end; i++, j += 8) {
			const hi = _view.getUint32(j,     false);
			const lo = _view.getUint32(j + 4, false);
			_view.setUint32(j,     lo, true);
			_view.setUint32(j + 4, hi, true);
		}
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
	toBase64(start=0, end=-1) {
		const _view = this._view;

		if (end == -1)
			end = _view.byteLength;
		else if (end < start)
			throw new RuntimeError('end < start');

		const [S_XXX, S_0XX, S_01X] = [0, 1, 2];

		let accum = 0;
		let state = S_XXX;
		let res = '';
		for (; start != end; start++) {
			let x = _view.getUint8(start);
			switch (state) {
			case S_XXX:
				res += B64_ALPHABET[x >>> 2]; // aaaaaa
				accum = (x & 0x3) << 4; // aa0000
				state = S_0XX;
				break;
			case S_0XX:
				res += B64_ALPHABET[accum | (x >>> 4)]; // aabbbb
				accum = (x & 0xf) << 2; // bbbb00
				state = S_01X;
				break;
			case S_01X:
				res += B64_ALPHABET[accum | (x >>> 6)]; // bbbbcc
				res += B64_ALPHABET[x & 0x3f]; // cccccc
				state = S_XXX;
			}
		}
		switch (state) {
		case S_0XX:
			res += '==';
			break;
		case S_01X:
			res += B64_ALPHABET[accum] + '='; // bbbb00
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
	toHex(start=0, end=-1) {
		const _view = this._view;

		if (end == -1)
			end = _view.byteLength;
		else if (end < start)
			throw new RuntimeError('end < start');

		let res = '';
		for (; start != end; start++) {
			let x = _view.getUint8(start);
			res += B16_ALPHABET[x >> 4] +
			    B16_ALPHABET[x & 0xf];
		}
		return res;
	}

	toText(enc=null) {
		const _view = this._view;

		if (enc == null) {
			try {
				return _toUtf8(_view);
			} catch (e) {
				if (!(e instanceof EncodingError))
					throw e;
				enc = 'latin1';
			}
		}
		switch (enc) {
		case 'l1':
		case 'latin1':
		case 'ISO-8859-1':
		case 'ISO_8859-1':
		case 'iso-8859-1':
		case 'iso_8859-1':
			return _toLatin(_view);
		case 'UTF-8':
		case 'utf-8':
			return _toUtf8(_view);
		case 'UTF-16BE':
		case 'utf-16be':
			return _toUtf16(_view, false);
		case 'UTF-16LE':
		case 'utf-16le':
			return _toUtf16(_view, true);
		default:
			throw new EncodingError('invalid encoding: ' + enc);
		}
	}

	/** convert a base64 string to bytes
	 * \param str	base64 string
	 * \return	the buffer
	 */
	static fromBase64(str) {
		if (str.length & 3) throw new RuntimeError('invalid parameter');
		// inclusive bounds
		const maxBytes = (str.length >>> 2) * 3;
		const minBytes = maxBytes - 2;

		// [ABC] is some b64 character, [E] is '=', [X] is dont-know
		const [S_XXXX, S_AXXX, S_ABXX, S_ABCX, S_ABEX, S_END] = [0, 1, 2, 3, 4, 5];

		const bytes = [];
		let accum = 0;
		let state = S_XXXX;
		for (const ch of str.split('')) {
			const c = B64_ALPHABET_REV[ch.charCodeAt(0)];
			if (c == null) throw new RuntimeError('invalid parameter');

			switch (state) {
			case S_XXXX:
				if (c == -1) {
					// ...[=***]...
					throw new RuntimeException('invalid parameter');
				}
				accum = c << 2; // aaaaaa00
				state = S_AXXX;
				break;
			case S_AXXX:
				if (c == -1) {
					// ...[a=**]...
					throw new RuntimeException('invalid parameter');
				}
				bytes.push(accum | (c >> 4)); // aaaaaabb
				accum = (c & 0xf) << 4; // bbbb0000
				state = S_ABXX;
				break;
			case S_ABXX:
				if (c == -1)
					state = S_ABEX;
				else {
					bytes.push(accum | (c >> 2)); // bbbbcccc
					accum = (c & 0x3) << 6; // cc000000
					state = S_ABCX;
				}
				break;
			case S_ABCX:
				if (c == -1)
					state = S_END;
				else {
					bytes.push(accum | c); // ccdddddd
					state = S_XXXX;
				}
				break;
			case S_ABEX:
				if (c != -1) {
					// ...[ab=c]...
					throw new RuntimeException('invalid parameter');
				}
				state = S_END;
				break;
			case S_END:
				// ...[ab*=][****]...
				throw new RuntimeException('invalid parameter');
			default:
				throw new AssertionError('bad state ' + state);
			}
		}
		if (bytes.length < minBytes || bytes.length > maxBytes)
			throw new AssertionError('bad length');

		// copy bytes into an ArrayBuffer
		const buf = new ArrayBuffer(bytes.length);
		const view = new DataView(buf);
		for (let i = 0; i != bytes.length; i++)
			view.setUint8(i, bytes[i]);

		return new ByteArray(buf);
	}

	/** convert a hex string to bytes
	 * \param str	hex string
	 * \return	the buffer
	 */
	static fromHex(str) {
		if (str.length & 1) throw new RuntimeError('invalid parameter');

		const buf = new ArrayBuffer(str.length >> 1);
		const view = new DataView(buf);

		let pos = 0;
		let accum = 0;
		let accumSz = 0;
		for (const ch of str.split('')) {
			const c = B16_ALPHABET_REV[ch.charCodeAt(0)];
			if (c == null) throw new RuntimeError('invalid parameter');
			switch (accumSz) {
			case 0:
				accum = c << 4;
				accumSz = 1;
				break;
			case 1:
				view.setUint8(pos++, accum | c);
				accumSz = 0;
			}
		}
		return new ByteArray(buf);
	}

	/** convert a text string to bytes
	 * \param str	text string
	 * \param enc	how to encode characters
	 * \return	the buffer
	 */
	static fromText(str, enc='utf-8') {
		switch (enc) {
		case 'l1':
		case 'latin1':
		case 'ISO-8859-1':
		case 'ISO_8859-1':
		case 'iso-8859-1':
		case 'iso_8859-1':
			return _fromLatin(str);
		case 'UTF-8':
		case 'utf-8':
			return _fromUtf8(str);
		case 'UTF-16BE':
		case 'utf-16be':
			return _fromUtf16(str, false);
		case 'UTF-16LE':
		case 'utf-16le':
			return _fromUtf16(str, true);
		default:
			throw new EncodingError('invalid encoding: ' + enc);
		}
	}

	static generateRandom(size) {
		if (window.crypto === undefined) {
			const arr = new Uint8Array(size);
			for (let i = 0; i < size; i++)
				arr[i] = (Math.random() * 0x100) ^ 0;
			return new ByteArray(arr.buffer);
		}

		let tmp;
		if (size & 1)
			tmp = new Uint8Array(size);
		else if (size & 3)
			tmp = new Uint16Array(size >>> 1);
		else
			tmp = new Uint32Array(size >>> 2);
		crypto.getRandomValues(tmp);
		return new ByteArray(tmp.buffer);
	}
}

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

function _swap16(n) {
	return ((n << 8) & 0xff00) | (n >> 8);
}

function Buffer() {
	this._buf = [];
	this._accum = 0;
	this._accumSz = 0;
}
Buffer.prototype = {};
Buffer.prototype.constructor = Buffer;

Buffer.prototype.push8 = function(val) {
	switch (this._accumSz) {
	case 0:
		this._accum = val << 24;
		this._accumSz = 1;
		break;
	case 1:
		this._accum |= val << 16;
		this._accumSz = 2;
		break;
	case 2:
		this._accum |= val << 8;
		this._accumSz = 3;
		break;
	default:
		this._buf.push(this._accum | val);
		this._accumSz = 0;
	}
}

Buffer.prototype.push16 = function(val) {
	switch (this._accumSz) {
	case 0:
		this._accum = val << 16;
		this._accumSz = 2;
		break;
	case 1:
		this._accum |= val << 8;
		this._accumSz = 3;
		break;
	case 2:
		this._buf.push(this._accum | val);
		this._accumSz = 0;
		break;
	default:
		this._buf.push(this._accum | (val >>> 8));
		this._accum = val << 24;
		this._accumSz = 1;
	}
}

Buffer.prototype.push24 = function(val) {
	switch (this._accumSz) {
	case 0:
		this._accum = val << 8;
		this._accumSz = 3;
		break;
	case 1:
		this._buf.push(this._accum | val);
		this._accumSz = 0;
		break;
	case 2:
		this._buf.push(this._accum | (val >>> 8));
		this._accum = val << 24;
		this._accumSz = 1;
		break;
	default:
		this._buf.push(this._accum | (val >>> 16));
		this._accum = val << 16;
		this._accumSz = 2;
	}
}

Buffer.prototype.push32 = function(val) {
	switch (this._accumSz) {
	case 0:
		this._buf.push(val);
		break;
	case 1:
		this._buf.push(this._accum | (val >>> 24));
		this._accum = val << 8;
		break;
	case 2:
		this._buf.push(this._accum | (val >>> 16));
		this._accum = val << 16;
		break;
	default:
		this._buf.push(this._accum | (val >>> 8));
		this._accum = val << 24;
	}
}

Buffer.prototype.finalize = function() {
	const out = this._buf;
	const _accum = this._accum;
	const _accumSz = this._accumSz;
	let len = out.length << 2;
	if (_accumSz) {
		out.push(_accum);
		len += _accumSz;
	}

	// reset
	this._buf = [];
	this._accumSz = 0;

	return new ByteArray(out, len);
}

const _fromLatin = str => {
	const buf = new Buffer;

	for (const ch of str.split('')) {
		const code = ch.charCodeAt(0);
		if (code & ~0xff)
			throw new RuntimeError('invalid Latin1');
		buf.push8(code);
	}
	return buf.finalize();
}

const _fromUtf8 = str => {
	const buf = new Buffer;

	for (const ch of str.split('')) {
		const code = ch.charCodeAt(0);
		if (code < 0x80)
			buf.push8(code);
		else if (code < 0x800) {
			let c = code;
			const c1 = c & 0x3f; c >>= 6;
			const c0 = c;
			buf.push16(0xc080 | (c0 << 8) | c1);
		} else if (code < 0x10000) {
			if (0xd800 <= code && code < 0xe000 || 0x110000 <= code)
				throw new EncodingError('invalid Unicode');
			let c = code;
			const c2 = c & 0x3f; c >>= 6;
			const c1 = c & 0x3f; c >>= 6;
			const c0 = c;
			buf.push24(0xe08080 | (c0 << 16) | (c1 << 8) | c2);
		} else if (code < 0x200000) {
			let c = code;
			const c3 = c & 0x3f; c >>= 6;
			const c2 = c & 0x3f; c >>= 6;
			const c1 = c & 0x3f; c >>= 6;
			const c0 = c;
			buf.push32(0xf0808080 | (c0 << 24) | (c1 << 16) | (c2 << 8) | c3);
		} else
			throw new EncodingError('invalid Unicode');
	}
	return buf.finalize();
}

const _fromUtf16 = (str, littleEndian) => {
	const buf = [];

	const swap = littleEndian ? _swap16 : (x => x);

	for (const ch of str.split('')) {
		const code = ch.charCodeAt(0);
		if (code < 0xd800)
			buf.push16(swap(code));
		else if (code < 0x10000) {
			if (code < 0xe000)
				throw new EncodingError('invalid Unicode');
			buf.push16(swap(code));
		} else if (code < 0x110000) {
			let c = code - 0x10000;
			const c1 = 0xdc00 + (c & 0x3ff); c >>= 10;
			const c0 = 0xd800 + c;
			buf.push16(swap(c0));
			buf.push16(swap(c1));
		} else
			throw new EncodingError('invalid Unicode');
	}
	return buf.finalize();
}

function _toLatin(view) {
	const sz = view.byteLength;

	let res = '';
	for (let i = 0; i != sz; i++)
		res += String.fromCharCode(view.getUint8(i));
	return res;
}

function _toUtf8(view) {
	const sz = view.byteLength;

	let accum = 0;
	let accumLeft = 0;

	let res = '';
	for (let i = 0; i != sz; i++) {
		let x = view.getUint8(i);

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

function _toUtf16(view, littleEndian) {
	const sz = view.byteLength;

	if (sz & 1) throw new EncodingError('invalid UTF-16');

	let accum = 0;
	let accumLeft = false;

	let res = '';
	for (let i = 0; i != sz; i += 2) {
		const x = view.getUint16(i, littleEndian);

		if (accumLeft) {
			if (x < 0xdc00)
				throw new EncodingError('invalid UTF-16');
			else if (x < 0xe000) {
				const code = 0x10000 + (accum | (x - 0xdc00));
				accumLeft = false;
				res += String.fromCharCode(code);
			} else
				throw new EncodingError('invalid UTF-16');
		} else {
			if (x < 0xd800)
				res += String.fromCharCode(x);
			else if (x < 0xdc00) {
				accum = (x - 0xd800) << 10;
				accumLeft = true;
			} else if (x < 0xe000)
				throw new EncodingError('invalid UTF-16');
			else
				res += String.fromCharCode(x);
		}
	}
	return res;
}

return ByteArray;
})();
