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

/** Abstract Hash class. */
class Hash {
	constructor() {}

	/** Initialize the hash function */
	init() {
		throw 'Hash.init() not overloaded';
	}

	/** Add data to the computation
	 * \param buf	The data
	 * \param sz	The size of buf in bytes
	 */
	update(buf, sz) {
		throw 'Hash.update() not overloaded';
	}

	/** End the hash computation
	 * \return	The digest
	 */
	end() {
		throw 'Hash.update() not overloaded';
	}

	/** Get the size of the digest in bytes */
	digestSize() {
		throw 'Hash.digestSize not overloaded';
	}

	/** Get the size of the blocks in bytes */
	blockSize() {
		throw 'Hash.blockSize not overloaded';
	}
}
