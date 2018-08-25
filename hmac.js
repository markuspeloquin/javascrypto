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

const Hmac = (() => {

const IPAD = 0x36363636;
const OPAD = 0x5c5c5c5c;

/** Create a HMAC function
 * \param hashfn A hash function object
 */
function Hmac(hashfn) {
	this._fn = hashfn;
	this._key = new ByteArray(hashfn.blockSize());
}
Hmac.prototype = {};
Hmac.prototype.constructor = Hmac;

/** Initialize the HMAC context
 * \param key	BE key
 * \param sz	Key length in bytes
 */
Hmac.prototype.init = function(key, sz) {
	const _fn = this._fn;
	const _key = this._key;
	const _keyImpl = _key._buf;

	const szBlock = _fn.blockSize();
	const szBlock4 = szBlock >> 2;
	var szDigest = _fn.digestSize();

	if (sz > szBlock) {
		_fn.init();
		_fn.update(key, sz);
		const digest = _fn.end();
		_key.copy(0, digest, 0, szDigest);
		sz = szDigest;
	} else
		_key.copy(0, key, 0, sz);

	while (sz < szBlock)
		_keyImpl[sz++] = 0;

	const keyIpad = new ByteArray(szBlock);
	const keyIpadImpl = keyIpad._buf;
	for (let i = 0; i < szBlock4; i++)
		keyIpadImpl[i] = _keyImpl[i] ^ IPAD;

	_fn.init();
	_fn.update(keyIpad, szBlock);
}

/** Add data to the HMAC computation
 * \param buf	BE buffer
 * \param sz	Length of buffer in bytes
 */
Hmac.prototype.update = function(buf, sz) {
	this._fn.update(buf, sz);
}

/** Return the result of the HMAC computation */
Hmac.prototype.end = function() {
	const _fn = this._fn;
	const _key = this._key;
	const _keyImpl = _key._buf;

	const szBlock = _fn.blockSize();
	const szBlock4 = szBlock >> 2;
	const szDigest = _fn.digestSize();

	const keyOpad = new ByteArray(szBlock);
	const keyOpadImpl = keyOpad._buf;
	for (let i = 0; i < szBlock4; i++)
		keyOpadImpl[i] = _keyImpl[i] ^ OPAD;

	const midDigest = _fn.end();
	_fn.init();
	_fn.update(keyOpad, szBlock);
	_fn.update(midDigest, szDigest);
	return _fn.end();
}

/** The block size of the hash function */
Hmac.prototype.blockSize = function() {
	return this._fn.blockSize();
}

/** The digest size of the hash function */
Hmac.prototype.digestSize = function() {
	return this._fn.digestSize();
}

return Hmac;
})();
