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

var Buffer = (function(){

var BUF32 = 0;
var BUF64 = 1;

function Buffer(impl)
{
	this.constructor = Buffer;
	this._buf = impl || [];
}
Buffer.prototype = {};

Buffer.BUF32 = BUF32;
Buffer.BUF64 = BUF64;

function /* int */ type()
{
	return basic_type(this._buf);
}

function /* static int */ basic_type(arr)
{
	// doesn't really matter in this case
	if (!arr.length) return BUF32;
	switch (arr[0].constructor) {
	case Number:	return BUF32;
	case Long:	return BUF64;
	}
	throw 'Buffer.type(): bad number type';
}

/** Convert a buffer to a base64 string.
 *
 * buf.as_base64()
 * buf.as_base64(sz)
 * buf.as_base64(off, sz)
 *
 * \param off	[optional] Start offset in bytes
 * \param sz	[optional] Number of bytes to copy
 * \return	Base64 string.
 */
function /* string */ as_base64(off, sz)
{
	var buf = this._buf;
	var type = buf.type();
	var shift = type == BUF32 ? 2 : 3;
	var get = type == BUF32 ? get32 : get64;
	switch (arguments.length) {
	case 0:
		off = 0;
		sz = buf.length << shift;
		break;
	case 1:
		sz = off;
		off = 0;
	}
	var res = [];
	var left = sz % 3;
	var blocks = (sz-left) / 3;
	var n;
	var i;
	var sp;
	for (var b = 0; b < blocks; b++) {
		n = (get.buf(off++) << 16) | (get.buf(off++) << 8) |
		    get.buf(off++);
		sp = [n>>18, (n>>12)&0x3f, (n>>6)&0x3f, n&0x3f];
		for (i = 0; i < 4; i++)
			res.push(b64_val_to_char(sp[i]));
	}
	switch (left) {
	case 2:
		n = (get.buf(off++) << 16) | (get.buf(off) << 8);
		sp = [n>>18, (n>>12)&0x3f, (n>>6)&0x3f];
		for (i = 0; i < 3; i++)
			res.push(b64_val_to_char(sp[i]));
		res.push('=');
		break;
	case 1:
		n = (get.buf(off) << 16);
		sp = [n>>18, (n>>12)&0x3f];
		for (i = 0; i < 2; i++)
			res.push(b64_val_to_char(sp[i]));
		res.push('==');
	}
	return res.join('');
}

/** Convert a buffer to a hex string
 *
 * buf.as_hex()
 * buf.as_hex(sz)
 * buf.as_hex(off, sz)
 *
 * \param off	(Optional) byte offset to begin at
 * \param sz	(Optional) number of bytes
 * \return	Hex string
 */
function /* string */ as_hex(off, sz)
{
	var buf = this._buf;
	var type = this.type();
	var shift = type == BUF32 ? 2 : 3;
	var get = type == BUF32 ? basic_get32 : basic_get64;
	switch (arguments.length) {
	case 0:
		off = 0;
		sz = buf.length << shift;
		break;
	case 1:
		sz = off;
		off = 0;
	}
	var res = [];
	for (var i = 0; i < sz; i++) {
		var n = get(buf, off++).toString(16);
		if (n.length == 1) res.push('0');
		res.push(n);
	}
	return res.join('');
}

function /* string */ as_text(off, sz)
{
	var buf = this._buf;
	var shift = this.type()==BUF32 ? 2 : 3;
	var maxlen = buf.length << shift;
	switch (arguments.length) {
	case 0:
		off = 0;
		sz = maxlen;
		break;
	case 1:
		sz = off;
		if (sz > maxlen) sz = maxlen;
		off = 0;
	}
	if (off >= sz) return '';
	var res = [];
	while (sz--)
		res.push(String.fromCharCode(basic_get32(buf, off++)));
	return res.join('');
}

function /* void */ copy(off, src, srcoff, sz)
{
	basic_copy(this._buf, off, src._buf, srcoff, sz);
}

function /* void */ copy_be_le(off, src, srcoff, sz)
{
	basic_copy_be_le(this._buf, off, src._buf, srcoff, sz);
}

function /* void */ copy_le_be(off, src, srcoff, sz)
{
	basic_copy_le_be(this._buf, off, src._buf, srcoff, sz);
}

/** Give be32[i] */
function /* byte */ get32(index)
{
	return basic_get32(this._buf, index);
}

/** give be32[i] */
function /* byte */ get64(index)
{
	return basic_get64(this._buf, index);
}

/** assign be32[i] := v */
function /* void */ set32(index, value)
{
	basic_set32(this._buf, index, value);
}

/** assign be64[i] := v */
function /* void */ set64(index, value)
{
	basic_set64(this._buf, index, value);
}

/** Give be32[i] */
function /* static byte */ basic_get32(buf, index)
{
	return (buf[index>>>2] >>> (((index ^ 3) & 3) << 3)) & 0xff;
}

/** give be32[i] */
function /* static byte */ basic_get64(buf, index)
{
	var pos0 = index >>> 3;
	var pos1 = (index & 7) >>> 1;
	var bits = (~index & 1) << 3;
	return (buf[pos0].n[pos1] >>> bits) & 0xff;
}

/** assign be32[i] := v */
function /* static void */ basic_set32(buf, index, value)
{
	var bits = ((index ^ 3) & 3) << 3;
	index >>>= 2;
	value &= 0xff;
	buf[index] &= ~(0xff << bits);
	buf[index] |= value << bits;
}

/** assign be64[i] := v */
function /* static void */ basic_set64(buf, index, value)
{
	var pos0 = index >>> 3;
	var pos1 = (index & 7) >>> 1;
	var bits = (~index & 1) << 3;
	buf[pos0].n[pos1] &= ~(0xff << bits);
	buf[pos0].n[pos1] |= value << bits;
}

/** swap byte order in place
 *
 * if two arguments given, second interpreted as 'count'
 * \param buf	data buffer
 * \param off	(optional) index in buffer to start at
 * \param count	(optional) number of elements to swap
 */
function /* void */ swap(off, count)
{
	var buf = this._buf;
	switch (arguments.length) {
	case 1:
		off = 0;
		count = buf.length;
		break;
	case 2:
		count = off;
		off = 0;
	}
	var i;
	var n;
	var t;
	switch (this.type()) {
	case BUF32:
		for (i = off; count--; i++)
			buf[i] = (buf[i] << 24) |
			    ((buf[i] << 8) & 0xff0000) |
			    ((buf[i] >>> 8) & 0xff00) |
			    ((buf[i] >>> 24) & 0xff);
		break;
	case BUF64:
		for (i = off; count--; i++) {
			n = buf[i].n;
			t = ((n[3] >>> 16) | (n[3] << 16)) & 0xffff;
			n[3] = ((n[0] >>> 16) | (n[0] << 16)) & 0xffff;
			n[0] = t;
			t = ((n[2] >>> 16) | (n[2] << 16)) & 0xffff;
			n[2] = ((n[1] >>> 16) | (n[1] << 16)) & 0xffff;
			n[1] = t;
		}
		break;
	}
}

/** set an array of int to zeros */
function /* void */ zero32()
{
	var buf = this._buf;
	var i = buf.length;
	while (i) buf[--i] = 0;
}

/** set an array of long to zeros */
function /* void */ zero64()
{
	var buf = this._buf;
	var i = buf.length;
	while (i) buf[--i] = new Long;
}

function /* static char */ b64_val_to_char(n)
{
	if (n < 26) n += 'a'.charCodeAt(0);
	else if (n < 52) n += 'a'.charCodeAt(0) - 26;
	else if (n < 62) n += '0'.charCodeAt(0) - 52;
	else if (n < 63) return '+';
	else return '/';
	return String.fromCharCode(n);
}

function /* static void */ basic_copy(dst, dstoff, src, srcoff, sz)
{
	var set = basic_type(dst) == BUF32 ? basic_set32 : basic_set64;
	var get = basic_type(src) == BUF32 ? basic_get32 : basic_get64;
	while (sz-- > 0) set(dst, dstoff++, get(src, srcoff++));
}

function /* static void */ basic_copy_be_le(dst, dstoff, src, srcoff, sz)
{
	var dst32 = basic_type(dst) == BUF32;
	var set = dst32 ? basic_set32 : basic_set64;
	var get = basic_type(src) == BUF32 ? basic_get32 : basic_get64;
	var xor = dst32 ? 3 : 7;
	while (sz-- > 0) set(dst, dstoff++ ^ xor, get(src, srcoff++));
}

function /* static void */ basic_copy_le_be(dst, dstoff, src, srcoff, sz)
{
	var src32 = basic_type(src) == BUF32;
	var set = basic_type(dst) == BUF32 ? basic_set32 : basic_set64;
	var get = src32 ? basic_get32 : basic_get64;
	var xor = src32 ? 3 : 7;
	while (sz-- > 0) set(dst, dstoff++, get(src, srcoff++ ^ xor));
}

/** return an array of 'sz' int zeros */
function /* static buffer */ create_zeros32(sz)
{
	var res = new Buffer(new Array(sz));
	res.zero32();
	return res;
}

/** return an array of 'sz' long zeros */
function /* static buffer */ create_zeros64(sz)
{
	var res = new Buffer(new Array(sz));
	res.zero64();
	return res;
}

/** convert a hex string to type int[].
 * \param str	hex string
 * \return	the buffer as an array of int or else null.
 */
function /* static Buffer */ from_hex(str)
{
	var res = [];
	var n = 0;
	var i;
	var j = 0;
	for (i = 0; i < str.length; i++) {
		var c = str.charCodeAt(i);
		if (c >= 0x30 && c <= 0x39)
			c -= 0x30;
		else if (c >= 0x41 && c <= 0x46)
			c -= 0x41 - 10;
		else if (c >= 0x61 && c <= 0x66)
			c -= 0x61 - 10;
		else
			return null;
		n = (n << 4) | c;
		if (j == 7) {
			res.push(n);
			j = 0;
			n = 0;
		} else
			j++;
	}
	if (j) {
		while (j++ < 8) n <<= 4;
		res.push(n);
	}
	return new Buffer(res);
}

/** convert a text string to type int[].
 * \param str	text string
 * \return	the buffer
 */
function /* static Buffer */ from_text(str)
{
	var bytes = [];
	var i, j;
	for (i = 0; i < str.length; i++) {
		var c = str.charCodeAt(i);
		var chbytes = [];
		do {
			chbytes.push(c & 0xff);
			c >>>= 8;
		} while (c);
		for (j = chbytes.length-1; j > -1; j--)
			bytes.push(chbytes[j]);
	}
	var res = create_zeros32((bytes.length + 3)>>>2);
	for (i = 0; i < bytes.length; i++)
		res.set32(i, bytes[i]);
	return res;
}

/** copy one buffer to another, keeping byte order (be to be)
 * \param[out] dst	destination
 * \param[in] dstoff	destination byte offset
 * \param[in] src	source
 * \param[in] srcoff	source byte offset
 * \param[in] sz	number of bytes
 */
function /* static void */ static_copy(dst, dstoff, src, srcoff, sz)
{
	return basic_copy(dst._buf, dstoff, src._buf, srcoff, sz);
}

/** copy one buffer to another, switching byte order from be to le
 * \param[out] dst	destination
 * \param[in] dstoff	destination byte offset
 * \param[in] src	source
 * \param[in] srcoff	source byte offset
 * \param[in] sz	number of bytes
 */
function /* static void */ static_copy_be_le(dst, dstoff, src, srcoff, sz)
{
	basic_copy_be_le(dst._buf, dstoff, src._buf, srcoff, sz);
}

/** Copy one buffer to another, switching byte order from LE to BE
 * \param[out] dst	Destination
 * \param[in] dstoff	Destination byte offset
 * \param[in] src	Source
 * \param[in] srcoff	Source byte offset
 * \param[in] sz	Number of bytes
 */
function /* static void */ static_copy_le_be(dst, dstoff, src, srcoff, sz)
{
	basic_copy_le_be(dst._buf, dstoff, src._buf, srcoff, sz);
}

function _connect(dest, functions)
{
	for (var i = 0; i < functions.length; i++) {
		var f = functions[i];
		dest[f.name] = f;
	}
}

_connect(Buffer, [
    b64_val_to_char,
    basic_copy,
    basic_copy_be_le,
    basic_copy_le_be,
    basic_type,
    create_zeros32,
    create_zeros64,
    basic_get32,
    basic_get64,
    from_hex,
    from_text,
    basic_set32,
    basic_set64,
]);
Buffer.copy = static_copy;
Buffer.copy_be_le = static_copy_be_le;
Buffer.copy_le_be = static_copy_le_be;

_connect(Buffer.prototype, [
    as_base64,
    as_hex,
    as_text,
    copy,
    copy_be_le,
    copy_le_be,
    get32,
    get64,
    set32,
    set64,
    swap,
    zero32,
    zero64,
    type,
]);

return Buffer;
})();
