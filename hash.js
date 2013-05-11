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

/** Abstract Hash function */
function Hash()
{
	this.constructor = Hash;
}
Hash.prototype = {};

/** Initialize the hash function */
Hash.prototype.init = function()
{ throw 'Hash.init() not overloaded' }

/** Add data to the computation 
 * \param buf	The data
 * \param sz	The size of buf in bytes
 */
Hash.prototype.update = function(buf, sz)
{ throw 'Hash.update() not overloaded' }

/** End the hash computation
 * \return	The digest
 */
Hash.prototype.end = function()
{ throw 'Hash.update() not overloaded' }

/** Get the size of the digest in bytes */
Hash.prototype.digest_size = function()
{ throw 'Hash.digest_size() not overloaded' }

/** Get the size of the blocks in bytes */
Hash.prototype.block_size = function()
{ throw 'Hash.block_size() not overloaded' }
