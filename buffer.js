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

Buffer = {

BUF32: 0,
BUF64: 1,

type: function(buf)
{
	// doesn't really matter in this case
	if (!buf.length) return this.BUF32;
	if (buf[0] == null) {
		var x = 3;
	}
	switch (buf[0].constructor) {
	case Number:	return this.BUF32;
	case Long:	return this.BUF64
	default:	throw "buffer::type(): bad number type";
	}
},

/** Convert a buffer to a hex string
 *
 * If only two arguments specified, the second is the size
 * \param buf	Buffer of data
 * \param off	(Optional) byte offset to begin at
 * \param sz	(Optional) number of bytes
 * \return	Hex string
 */
as_hex: function(buf, off, sz)
{
	var type = this.type(buf);
	var shift = type == this.BUF32 ? 2 : 3;
	var get = type == this.BUF32 ? this.get32 : this.get64;
	switch (arguments.length) {
	case 1:
		off = 0;
		sz = buf.length << shift;
		break;
	case 2:
		sz = off;
		off = 0;
	}
	var res = '';
	for (var i = 0; i < sz; i++) {
		var n = get(buf, i).toString(16);
		if (n.length == 1) res += '0' + n;
		else res += n;
	}
	return res;
},

/** Copy one buffer to another, keeping byte order (BE to BE)
 * \param[out] dst	Destination
 * \param[in] dstoff	Destination byte offset
 * \param[in] src	Source
 * \param[in] srcoff	Source byte offset
 * \param[in] sz	Number of bytes
 */
copy: function(dst, dstoff, src, srcoff, sz)
{
	var i = dstoff;
	var j = srcoff;
	var set = this.type(dst) == this.BUF32 ? this.set32 : this.set64;
	var get = this.type(src) == this.BUF32 ? this.get32 : this.get64;
	while (sz--) set(dst, i++, get(src, j++));
},

/** Copy one buffer to another, switching byte order from BE to LE
 * \param[out] dst	Destination
 * \param[in] dstoff	Destination byte offset
 * \param[in] src	Source
 * \param[in] srcoff	Source byte offset
 * \param[in] sz	Number of bytes
 */
copy_be_le: function(dst, dstoff, src, srcoff, sz)
{
	var dst32 = this.type(dst) == this.BUF32;
	var i = dstoff;
	var j = srcoff;
	var set = dst32 ? this.set32 : this.set64;
	var get = this.type(src) == this.BUF32 ? this.get32 : this.get64;
	var xor = dst32 ? 3 : 7;
	while (sz--) set(dst, i++ ^ xor, get(src, j++));
},

/** Copy one buffer to another, switching byte order from LE to BE
 * \param[out] dst	Destination
 * \param[in] dstoff	Destination byte offset
 * \param[in] src	Source
 * \param[in] srcoff	Source byte offset
 * \param[in] sz	Number of bytes
 */
copy_le_be: function(dst, dstoff, src, srcoff, sz)
{
	var src32 = this.type(src) == this.BUF32;
	var i = dstoff;
	var j = srcoff;
	var set = this.type(dst) == this.BUF32 ? this.set32 : this.set64;
	var get = src32 ? this.get32 : this.get64;
	var xor = src32 ? 3 : 7;
	while (sz--) set(dst, i++, get(src, j++ ^ xor));
},

/** Swap byte order in place
 *
 * If two arguments given, second interpreted as 'count'
 * \param buf	Data buffer
 * \param off	(Optional) index in buffer to start at
 * \param count	(Optional) number of elements to swap
 */
swap: function(buf, off, count)
{
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
	switch (this.type(buf)) {
	case BUF32:
		for (i = off; count--; i++)
			buf[i] = (buf[i] << 24) | ((buf[i] << 8) & 0xff0000) |
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
},

/** Return an array of 'sz' int zeros */
zeros32: function(sz)
{
	var res = new Array(sz);
	this.setzero32(res);
	return res;
},
/** Return an array of 'sz' Long zeros */
zeros64: function(sz)
{
	var res = new Array(sz);
	this.setzero64(res);
	return res;
},
/** Set an array of int to zeros */
setzero32: function(buf)
{
	for (var i = 0; i < buf.length; i++) buf[i] = 0;
},
/** Set an array of Long to zeros */
setzero64: function(buf)
{
	for (var i = 0; i < buf.length; i++) buf[i] = new Long;
},

/** Assign be32[i] := v */
set32: function(buf, index, value)
{
	var bits = ((index ^ 3) & 3) << 3;
	index >>>= 2;
	value &= 0xff;
	buf[index] &= ~(0xff << bits);
	buf[index] |= value << bits;
},

/** Give be32[i] */
get32: function(buf, index)
{
	return (buf[index>>>2] >>> (((index ^ 3) & 3) << 3)) & 0xff;
},

/** Assign be64[i] := v */
set64: function(buf, index, value)
{
	if (buf.length * 8 < index)
		alert(buf.length + ',' + index);
	var pos0 = index >>> 3;
	var pos1 = (index & 7) >>> 1;
	var bits = (~index & 1) << 3;
	buf[pos0].n[pos1] &= ~(0xff << bits);
	buf[pos0].n[pos1] |= value << bits;
},

/** Give be32[i] */
get64: function(buf, index)
{
	var pos0 = index >>> 3;
	var pos1 = (index & 7) >>> 1;
	var bits = (~index & 1) << 3;
	return (buf[pos0].n[pos1] >>> bits) & 0xff;
},
	
};