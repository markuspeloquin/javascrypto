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
 * \param hmacfn	Hmac object
 * \param passwd	Password ByteArray
 * \param salt		Salt ByteArray
 * \param iter		How many iterations to compute
 * \param szkey		Size of the key to produce in bytes
 * \return		The generated key
 */
function pbkdf2(hmacfn, passwd, salt, iter, szkey) {
	const szDigest = hmacfn.digestSize();
	const blocks = (szkey / szDigest) ^ 0;
	const partial = szkey % szDigest;
	const res = new ByteArray(szkey);
	const indexbuf = new ByteArray(4, [1]);
	const indexbufImpl = indexbuf._buf;

	let pos = 0;
	for (let i = 0; i < blocks; i++) {
		pbkdf2_f(hmacfn, passwd, salt, iter, indexbuf, res, pos);
		indexbufImpl[0]++;
		pos += szDigest;
	}

	if (partial) {
		const bufPartial = new ByteArray(szDigest);
		pbkdf2_f(hmacfn, passwd, salt, iter, indexbuf, bufPartial, 0);

		// copy words
		let pos32 = pos >>> 2;
		const partial32 = partial >>> 2;
		for (let i = 0; i < partial32; i++)
			res.set32(pos32++, bufPartial.get32(i));
		pos = pos32 << 2;

		// copy any remaining bytes
		for (let i = partial32 << 2; i < partial; i++)
			res.set(pos++, bufPartial.get(i));
	}

	return res;
}

// PBKDF2's F function
function pbkdf2_f(hmacfn, passwd, salt, iter, indexbuf, res, resoff) {
	const szDigest = hmacfn.digestSize();
	const szDigest32 = szDigest >>> 2;

	hmacfn.init(passwd);
	hmacfn.update(salt, salt.size());
	hmacfn.update(indexbuf, 4);
	let u = hmacfn.end();

	const resoff32 = resoff >>> 2;
	let pos32 = resoff32;
	for (let i = 0; i < szDigest32; i++)
		res.set32(pos32++, u.get32(i));

	for (let i = 1; i < iter; i++) {
		hmacfn.init(passwd);
		hmacfn.update(u, szDigest);
		u = hmacfn.end();

		pos32 = resoff32;
		for (let i = 0; i < szDigest32; i++) {
			res.set32(pos32, res.get32(pos32) ^ u.get32(i));
			pos32++;
		}
	}
}

return pbkdf2;
})();
