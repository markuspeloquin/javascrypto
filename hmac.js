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

var Hmac = (function(){

var IPAD = 0x36363636;
var OPAD = 0x5c5c5c5c;

/** Create a HMAC function
 * \param hashfn A hash function object
 */
function Hmac(hashfn)
{
	this.constructor = Hmac;
	this._fn = hashfn;
	this._key = Buffer.create_zeros32(hashfn.block_size()>>2);
}
Hmac.prototype = {};

/** Initialize the HMAC context
 * \param key	BE key
 * \param sz	Key length in bytes
 */
function init(key, sz)
{
	var i;
	var sz_block = this._fn.block_size();
	var sz_digest = this._fn.digest_size();

	if (sz > sz_block) {
		this._fn.init();
		this._fn.update(key, sz);
		var digest = this._fn.end();
		this._key.copy(0, digest, 0, sz_digest);
		sz = sz_digest;
	} else
		this._key.copy(0, key, 0, sz);

	while (sz < sz_block)
		this._key.set32(sz++, 0);

	var key_ipad = new Array(sz_block>>2);
	for (i = 0; i < sz_block>>2; i++)
		key_ipad[i] = this._key._buf[i] ^ IPAD;

	this._fn.init();
	this._fn.update(new Buffer(key_ipad), sz_block);
}

/** Add data to the HMAC computation
 * \param buf	BE buffer 
 * \param sz	Length of buffer in bytes
 */
function update(buf, sz)
{
	this._fn.update(buf, sz);
}

/** Return the result of the HMAC computation */
function end()
{
	var i;
	var sz_block = this._fn.block_size();
	var sz_digest = this._fn.digest_size();
	var key_opad = new Array(sz_block>>2);
	var mid_digest;

	for (i = 0; i < sz_block>>2; i++)
		key_opad[i] = this._key._buf[i] ^ OPAD;

	mid_digest = this._fn.end();
	this._fn.init();
	this._fn.update(new Buffer(key_opad), sz_block);
	this._fn.update(mid_digest, sz_digest);
	return this._fn.end();
}

/** The block size of the hash function */
function block_size()
{ return this._fn.block_size() }

/** The digest size of the hash function */
function digest_size()
{ return this._fn.digest_size() }

function _connect(dest, functions)
{
	for (var i = 0; i < functions.length; i++) {
		var f = functions[i];
		dest[f.name] = f;
	}
}
_connect(Hmac.prototype, [
	block_size,
	digest_size,
	end,
	init,
	update,
]);

return Hmac;
})();
