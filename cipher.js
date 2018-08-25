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

'use strict';

const Cipher = (() => {

/** Abstract cipher class */
function Cipher(blockSize) {
	this._blockSize = blockSize;
}
Cipher.prototype = {};
Cipher.prototype.constructor = Cipher;

/** Encrypt a block of data
 * \param[in] plaintext		Data to encrypt
 * \param[out] ciphertext	Encrypted data
 */
Cipher.prototype.encrypt = (plaintext, ciphertext) => {
	throw 'Cipher.encrypt() not overloaded';
}

/** Decrypt a block of data
 * \param[in] ciphertext	Data to decrypt
 * \param[out] plaintext	Decrypted data
 */
Cipher.prototype.decrypt = (ciphertext, plaintext) => {
	throw 'Cipher.decrypt() not overloaded';
}

/** Get the block size */
Cipher.prototype.blockSize = function() {
	return this._blockSize;
}

return Cipher;
})();
