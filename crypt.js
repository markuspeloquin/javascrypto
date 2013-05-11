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

/** Create a block encrypter
 * \param cipher	The Cipher object to en/decrypt with
 * \param mode		On of Crypt.MODE_*.
 * \param iv		The initial vector
 */
Crypt = function(cipher, mode, iv)
{
	this._cipher = cipher;
	this._mode = mode;
	this._iv = iv;
}
Crypt.MODE_CTR = 0;	/**< Counter block mode */
Crypt.prototype = {};

/** Encrypt data
 * \param plaintext	Data to encrypt
 * \param sz		Size of plaintext in bytes
 * \returns		The encrypted data (size could be rounded up)
 */
Crypt.prototype.encrypt = function(plaintext, sz)
{
	if (sz > plaintext._buf.length * 4) sz = plaintext._buf.length * 4;

	var i, j;
	var sz_blk = this._cipher.block_size();
	var sz_blk_4 = sz_blk >> 2;
	var blocks = Math.floor(sz / sz_blk);
	var left = sz % sz_blk;
	var buf = new Array(sz_blk_4);
	var pos;
	var res = [];

	switch (this._mode) {
	case Crypt.MODE_CTR:
		var pre = new Array(sz_blk_4);
		var iv_tail;

		// copy all but last 4 bytes from 'iv' to 'pre'
		for (i = 0; i < sz_blk_4 - 1; i++)
			pre[i] = this._iv[i];

		// copy last 4 bytes Math.flooro 'iv_tail'
		iv_tail = this._iv[sz_blk_4 - 1];

		// encrypt whole blocks
		pos = 0;
		for (i = 0; i < blocks; i++) {
			// in effect, pre = iv XOR counter
			pre[sz_blk_4 - 1] = i ^ iv_tail;

			this._cipher.encrypt(pre, buf);
			for (j = 0; j < sz_blk_4; j++)
				res.push(buf[j] ^ plaintext._buf[pos + j]);

			pos += sz_blk_4;
		}

		// encrypt partial block
		if (left) {
			pre[sz_blk_4 - 1] = blocks ^ iv_tail;

			this._cipher.encrypt(pre, buf);
			for (i = 0; i < left>>2; i++)
				res.push(buf[i] ^ plaintext._buf[pos + i]);
			if (left < sz_blk) {
				var x = buf[i] ^ plaintext._buf[pos + i];
				switch (left & 3) {
				case 1: x &= 0xff000000; break;
				case 2: x &= 0xffff0000; break;
				case 3: x &= 0xffffff00;
				}
				res.push(x);
			}
		}
		break;
	default:
		throw 'No such block mode';
	}

	return new Buffer(res);
}

/** Decrypt data
 * \param ciphertext	Data to decrypt
 * \param sz		Size of plaintext in bytes
 * \returns		The decrypted data
 */
Crypt.prototype.decrypt = function(ciphertext, sz)
{
	var res;

	switch (this._mode) {
	case Crypt.MODE_CTR:
		res = this.encrypt(ciphertext, sz);
		break;
	default:
		throw 'No such block mode';
	}
	return res;
}
