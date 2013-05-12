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

var pbkdf2 = (function(){

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
function pbkdf2(hmacfn, passwd, passwdsz, salt, saltsz, iter, szkey)
{
	var sz_digest = hmacfn.digest_size();
	var blocks = Math.floor(szkey / sz_digest);
	var partial = szkey % sz_digest;
	var res = Buffer.create_zeros32((szkey + 3) >>> 2);
	var indexbuf = new Buffer([1]);

	for (var i = 0; i < blocks; i++) {
		pbkdf2_f(hmacfn, passwd, passwdsz, salt, saltsz, iter,
		    indexbuf, res, i * sz_digest);
		indexbuf._buf[0]++;
	}

	if (partial) {
		var buf_partial = Buffer.create_zeros32(sz_digest>>>2);
		pbkdf2_f(hmacfn, passwd, passwdsz, salt, saltsz, iter,
		    indexbuf, buf_partial, 0);
		res.copy(blocks * sz_digest, buf_partial, 0, partial);
	}

	return res;
}

// PBKDF2's F function
function pbkdf2_f(hmacfn, passwd, passwdsz, salt, saltsz, iter, indexbuf,
    res, resoff)
{
	var sz_digest = hmacfn.digest_size();
	var i, j;
	var u, u_impl, res_impl = res._buf;

	hmacfn.init(passwd, passwdsz);
	hmacfn.update(salt, saltsz);
	hmacfn.update(indexbuf, 4);
	u = hmacfn.end();

	res.copy(resoff, u, 0, sz_digest);
	resoff >>>= 2;
	for (i = 1; i < iter; i++) {
		hmacfn.init(passwd, passwdsz);
		hmacfn.update(u, sz_digest);
		u = hmacfn.end();
		u_impl = u._buf;
		for (j = 0; j < u_impl.length; j++)
			// assume resoff is a multiple of 4
			res_impl[resoff+j] ^= u_impl[j];
	}
}

return pbkdf2;
})();
