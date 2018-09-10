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
 * \param mode		One of Crypt.MODE_*
 */
function Crypt(cipher, mode) {
	this._cipher = cipher;
	this._mode = mode;
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
	switch (this._mode) {
	case Crypt.MODE_CTR:
		return _ctr(this._cipher, plaintext, true, sz);
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
		return _ctr(this._cipher, ciphertext, false, sz);
	default:
		throw 'No such block mode';
	}
}

function _ctr(cipher, text, encrypt, sz) {
	const szBlock = cipher.blockSize();
	const szBlock4 = szBlock >> 2;

	let iv;
	let pos;
	const res = [];
	if (encrypt) {
		iv = ByteArray.generateRandom(szBlock);
		pos = 0;
		for (let i = 0; i != szBlock; i += 4)
			res.push(iv.get32(i >>> 2));
	} else {
		iv = text;
		pos = szBlock4;
	}
	const blocks = (sz / szBlock) ^ 0;
	const left = sz % szBlock;

	const pre = new ByteArray(szBlock);
	const tmp = new ByteArray(szBlock);

	// copy all but last 4 bytes from 'iv' to 'pre'
	for (let i = 0; i < szBlock4 - 1; i++)
		pre.set32(i, iv.get32(i));

	// copy last 4 bytes to 'ivTail'
	const ivTail = iv.get32(szBlock4 - 1);

	// encrypt whole blocks
	for (let i = 0; i < blocks; i++) {
		// in effect, pre = iv XOR counter
		pre.set32(szBlock4 - 1, i ^ ivTail);

		cipher.encrypt(pre, tmp);
		for (let j = 0; j < szBlock4; j++)
			res.push(tmp.get32(j) ^ text.get32(pos + j));

		pos += szBlock4;
	}

	// encrypt partial block
	if (left) {
		pre.set32(szBlock4 - 1, blocks ^ ivTail);

		cipher.encrypt(pre, tmp);
		let i;
		const left4 = left >> 2;
		for (i = 0; i < left4; i++)
			res.push(tmp.get32(i) ^ text.get32(pos + i));
		if (left & 3) {
			const pos8 = (pos + i) << 2;
			let x = tmp.get(pos8) << 24;
			let mask = 0xff000000;
			if (left & 3 > 1) {
				x |= tmp.get(pos8 + 1) << 16;
				mask = 0xffff0000;
			}
			if (left & 3 > 2) {
				x |= tmp.get(pos8 + 2) << 8;
				mask = 0xffffff00;
			}
			res.push((tmp.get32(i) ^ x) & mask);
		}
	}

	return new ByteArray(res, sz + (encrypt ? iv.size() : 0));
}

return Crypt;
})();
