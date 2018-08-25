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

const AssertionError = (() => {
	function AssertionError(msg, cause) {
		Error.call(this, msg);

		this.cause = cause;
		this.message = msg;
		this.name = 'AssertionError';
	}
	AssertionError.prototype = Object.create(Error.prototype);
	AssertionError.prototype.constructor = AssertionError;

	return AssertionError;
})();

const EncodingError = (() => {
	function EncodingError(msg, cause) {
		Error.call(this, msg);

		this.cause = cause;
		this.message = msg;
		this.name = 'EncodingError';
	}
	EncodingError.prototype = Object.create(Error.prototype);
	EncodingError.prototype.constructor = EncodingError;

	return EncodingError;
})();

const IndexError = (() => {
	function IndexError(msg, cause) {
		Error.call(this, msg);

		this.cause = cause;
		this.message = msg;
		this.name = 'IndexError';
	}
	IndexError.prototype = Object.create(Error.prototype);
	IndexError.prototype.constructor = IndexError;

	return IndexError;
})();

const RuntimeError = (() => {
	function RuntimeError(msg, cause) {
		Error.call(this, msg);

		this.cause = cause;
		this.message = msg;
		this.name = 'RuntimeError';
	}
	RuntimeError.prototype = Object.create(Error.prototype);
	RuntimeError.prototype.constructor = RuntimeError;

	return RuntimeError;
})();

const TypeError = (() => {
	function TypeError(msg, cause) {
		Error.call(this, msg);

		this.cause = cause;
		this.message = msg;
		this.name = 'TypeError';
	}
	TypeError.prototype = Object.create(Error.prototype);
	TypeError.prototype.constructor = TypeError;

	return TypeError;
})();
