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

const Crypt = (() => {

/** Create a block encrypter
 * \param cipher	The Cipher object to en/decrypt with
 * \param mode		On of Crypt.MODE_*.
 * \param iv		The initial vector
 */
function Crypt(cipher, mode, iv) {
	this._cipher = cipher;
	this._mode = mode;
	this._iv = iv;
}
Crypt.MODE_CTR = 0;	/**< Counter block mode */
Crypt.prototype = {};
Crypt.prototype.constructor = Crypt;

/** Encrypt data
 * \param plaintext	Data to encrypt
 * \param sz		Size of plaintext in bytes
 * \returns		The encrypted data (size could be rounded up)
 */
Crypt.prototype.encrypt = function(plaintext, sz) {
	if (sz > plaintext.size()) sz = plaintext.size();

	const _cipher = this._cipher;
	const _iv = this._iv;
	const _ivImpl = _iv._buf;

	const plaintextImpl = plaintext._buf;
	const szBlk = _cipher.blockSize();
	const szBlk4 = szBlk >> 2;
	const blocks = (sz / szBlk) ^ 0;
	const buf = new ByteArray(szBlk);
	const bufImpl = buf._buf;
	const left = sz - blocks * szBlk;
	const res = [];

	switch (this._mode) {
	case Crypt.MODE_CTR:
		const pre = new ByteArray(szBlk);
		const preImpl = pre._buf;

		// copy all but last 4 bytes from 'iv' to 'pre'
		for (let i = 0; i < szBlk4 - 1; i++)
			preImpl[i] = _ivImpl[i];

		// copy last 4 bytes to 'iv_tail'
		const ivTail = _ivImpl[szBlk4 - 1];

		// encrypt whole blocks
		var pos = 0;
		for (let i = 0; i < blocks; i++) {
			// in effect, pre = iv XOR counter
			preImpl[szBlk4 - 1] = i ^ ivTail;

			_cipher.encrypt(pre, buf);
			for (let j = 0; j < szBlk4; j++)
				res.push(bufImpl[j] ^ plaintextImpl[pos + j]);

			pos += szBlk4;
		}

		// encrypt partial block
		if (left) {
			preImpl[szBlk4 - 1] = blocks ^ ivTail;

			_cipher.encrypt(pre, buf);
			let i;
			for (i = 0; i < left >> 2; i++)
				res.push(bufImpl[i] ^ plaintextImpl[pos + i]);
			if (left & 3) {
				let x = bufImpl[i] ^ plaintextImpl[pos + i];
				switch (left & 3) {
				case 1: x &= 0xff000000; break;
				case 2: x &= 0xffff0000; break;
				case 3: x &= 0xffffff00;
				}
				res.push(x);
			}
		}

		return new ByteArray(sz, res);
	default:
		throw 'No such block mode';
	}
}

/** Decrypt data
 * \param ciphertext	Data to decrypt
 * \param sz		Size of plaintext in bytes
 * \returns		The decrypted data
 */
Crypt.prototype.decrypt = function(ciphertext, sz) {
	switch (this._mode) {
	case Crypt.MODE_CTR:
		return this.encrypt(ciphertext, sz);
	default:
		throw 'No such block mode';
	}
}

return Crypt;
})();
