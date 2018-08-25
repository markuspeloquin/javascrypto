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

const pbkdf2 = (() => {

/** Password-based key derivation function
 * \param hmacfn	Hmac object.
 * \param passwd	Password
 * \param passwdsz	Size of passwd in bytes
 * \param salt		Salt...
 * \param saltsz	Size of salt in bytes
 * \param iter		How many iterations to compute
 * \param szkey		Size of the key to produce in bytes
 * \return		The generated key
 */
function pbkdf2(hmacfn, passwd, passwdsz, salt, saltsz, iter, szkey) {
	const szDigest = hmacfn.digestSize();
	const blocks = (szkey / szDigest) ^ 0;
	const partial = szkey % szDigest;
	const res = new ByteArray((szkey + 3) >>> 2);
	const indexbuf = new ByteArray([1]);
	const indexbufImpl = indexbuf._buf;

	for (let i = 0; i < blocks; i++) {
		pbkdf2_f(hmacfn, passwd, passwdsz, salt, saltsz, iter,
		    indexbuf, res, i * szDigest);
		indexbufImpl[0]++;
	}

	if (partial) {
		const bufPartial = new ByteArray(szDigest);
		pbkdf2_f(hmacfn, passwd, passwdsz, salt, saltsz, iter,
		    indexbuf, bufPartial, 0);
		res.copy(blocks * szDigest, bufPartial, 0, partial);
	}

	return res;
}

// PBKDF2's F function
function pbkdf2_f(hmacfn, passwd, passwdsz, salt, saltsz, iter, indexbuf,
    res, resoff) {
	const szDigest = hmacfn.digestSize();
	const resImpl = res._buf;

	hmacfn.init(passwd, passwdsz);
	hmacfn.update(salt, saltsz);
	hmacfn.update(indexbuf, 4);
	const u0 = hmacfn.end();

	res.copy(resoff, u0, 0, szDigest);
	resoff >>>= 2;
	for (let i = 1; i < iter; i++) {
		hmacfn.init(passwd, passwdsz);
		hmacfn.update(u, szDigest);
		const u = hmacfn.end();
		const uImpl = u._buf;
		let j = 0;
		for (const val of uImpl) {
			// assume resoff is a multiple of 4
			resImpl[resoff + j++] ^= val;
		}
	}
}

return pbkdf2;
})();
