#!/usr/bin/python

import Queue
import os
import sys

LICENSE_LINES = 13

DEP = {}
DEP['buffer'] = ['long']
DEP['cipher'] = []
DEP['crypt'] = []
DEP['hash'] = []
DEP['hmac'] = ['buffer']
DEP['long'] = []
DEP['pbkdf2'] = ['buffer']
DEP['serpent'] = ['buffer', 'cipher']
DEP['tiger'] = ['buffer', 'hash', 'long']
DEP['whirlpool'] = ['buffer', 'hash', 'long']

def combine(req):
	'''Give mapping of NAME -> DEPENDENTS.'''
	res = {}
	stack = []
	for r in req:
		res[r] = 0
		stack.append(r)
	while stack:
		s = stack.pop()
		for d in DEP[s]:
			if not res.has_key(d):
				res[d] = 1
				stack.append(d)
			else:
				res[d] += 1
	return res

def get_order(names):
	'''Order the packages and their dependencies so that all packages
	come after any dependents.'''
	# verify that all keys are used
	for n in names:
		if not DEP.has_key(n):
			print >>sys.stderr, 'unrecognized key: %s' % n
			sys.exit(1)

	counts = combine(names)

	# alas, Python has no Fibonacci queue type, which would have been
	# better; instead of decreasing keys, I add a new value to the
	# queue with the decreased key; also, there's a definite assumption
	# that 2*len(counts) is enough space

	queue = Queue.PriorityQueue(2 * len(counts))
	for (key, value) in counts.iteritems():
		queue.put((value,key))

	order = []
	used = {}
	while not queue.empty():
		# get min
		(_, name) = queue.get()
		if used.has_key(name):
			continue

		# add to list
		order.append(name)
		used[name] = True

		for d in DEP[name]:
			# 'decrease' key of each dependency
			counts[d] -= 1
			queue.put((counts[d], d))
	order.reverse()
	return order

def output_file(out, fin, keep_license):
	eof = False
	skip = LICENSE_LINES
	if keep_license: skip = 0
	while not eof:
		line = fin.readline()
		if not line:
			eof = True
			continue
		if skip:
			skip -= 1
			continue
		out.write(line)

def output_files(out, paths):
	first = True
	for p in paths:
		output_file(out, file(p, 'r'), first)
		first = False

if len(sys.argv) < 2:
	print (
'''usage: %s MODULE... > OUTFILE

ex:    %s pbkdf2 tiger > my_crypto.js
Dependencies are handled automatically, and the order is corrected.''' %
	    (sys.argv[0], sys.argv[0]))
	sys.exit(0)

if len(sys.argv) == 2 and sys.argv[1] == 'all':
	order = get_order(DEP.keys())
else:
	order = get_order(sys.argv[1:])
print order
output_files(sys.stdout, [ x + '.js' for x in order ])
