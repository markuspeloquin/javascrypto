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

class Hmac {
	/** Create a HMAC function
	 * \param hashfn A hash function object
	 */
	constructor(hashfn) {
		this._fn = hashfn;
		this._key = new ByteArray(hashfn.blockSize());
	}

	/** Initialize the HMAC context
	 * \param key	Key ByteArray
	 */
	init(key) {
		const _fn = this._fn;
		const _key = this._key;
		const sz = key.size();

		const szBlock = _fn.blockSize();
		const szBlock32 = szBlock >>> 2;
		const szDigest = _fn.digestSize();
		const szDigest32 = szDigest >>> 2;

		let end;
		if (sz > szBlock) {
			_fn.init();
			_fn.update(key, sz);
			const digest = _fn.end();
			for (let i = 0; i < szDigest32; i++)
				_key.set32(i, digest.get32(i));

			end = szDigest;
		} else {
			const sz32 = sz >>> 2;
			// copy full words
			for (let i = 0; i < sz32; i++)
				_key.set32(i, key.get32(i));
			// copy partial
			for (let i = sz32 << 2; i < sz; i++)
				_key.set(i, key.get(i));

			// zero a partial word
			end = sz;
			while (end & 3)
				_key.set(end++, 0);
		}

		// zero the rest of the words
		for (let i = end >>> 2; i < szBlock32; i++)
			_key.set32(i, 0);

		const keyIpad = new ByteArray(szBlock);
		for (let i = 0; i < szBlock32; i++)
			keyIpad.set32(i, _key.get32(i) ^ IPAD);

		_fn.init();
		_fn.update(keyIpad, szBlock);
	}

	/** Add data to the HMAC computation
	 * \param buf	BE buffer
	 * \param sz	Length of buffer in bytes
	 */
	update(buf, sz) {
		this._fn.update(buf, sz);
	}

	/** Return the result of the HMAC computation */
	end() {
		const _fn = this._fn;
		const _key = this._key;

		const szBlock = _fn.blockSize();
		const szBlock32 = szBlock >> 2;
		const szDigest = _fn.digestSize();

		const keyOpad = new ByteArray(szBlock);
		for (let i = 0; i < szBlock32; i++)
			keyOpad.set32(i, _key.get32(i) ^ OPAD);

		const midDigest = _fn.end();
		_fn.init();
		_fn.update(keyOpad, szBlock);
		_fn.update(midDigest, szDigest);
		return _fn.end();
	}

	/** The block size of the hash function */
	blockSize() {
		return this._fn.blockSize();
	}

	/** The digest size of the hash function */
	digestSize() {
		return this._fn.digestSize();
	}
}

return Hmac;
})();
