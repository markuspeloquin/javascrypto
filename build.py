#!/usr/bin/env python3

import heapq
import os
import sys
from typing import Dict, Iterable, List, TextIO

LICENSE_LINES = 13

DEP = {}
DEP['byte_array'] = ['error', 'long']
DEP['cipher'] = []
DEP['crypt'] = ['byte_array']
DEP['error'] = []
DEP['hash'] = []
DEP['hmac'] = ['byte_array']
DEP['long'] = ['error']
DEP['pbkdf2'] = ['byte_array', 'hmac']
DEP['serpent'] = ['byte_array', 'cipher']
DEP['tiger'] = ['byte_array', 'hash', 'long']
DEP['whirlpool'] = ['byte_array', 'hash']

def combine(req: Iterable[str]) -> Dict[str, int]:
	'''Give mapping of NAME -> DEPENDENTS.'''
	res = {}
	stack = []
	for r in req:
		res[r] = 0
		stack.append(r)
	while stack:
		s = stack.pop()
		for d in DEP[s]:
			if d in res:
				res[d] += 1
			else:
				res[d] = 1
				stack.append(d)
	return res

def get_order(names: Iterable[str]) -> List[str]:
	'''Order the packages and their dependencies so that all packages
	come after any dependents.'''
	# verify that all keys are used
	for n in names:
		if n not in DEP:
			print('unrecognized key: %s' % n, file=sys.stderr)
			sys.exit(1)

	counts = combine(names)

	# keys cannot be decreased, so instead I add a new value to the
	# queue with the decreased key, and subsequent entries of the value
	# are ignored; also, there's a definite assumption that
	# 2*len(counts) is enough space

	queue = [(v,k) for (k,v) in counts.items()]
	heapq.heapify(queue)

	order = []
	used: Dict[str, bool] = {}
	while queue:
		# get min
		(_, name) = heapq.heappop(queue)
		if name in used:
			continue

		# add to list
		order.append(name)
		used[name] = True

		for d in DEP[name]:
			# 'decrease' key of each dependency
			counts[d] -= 1
			heapq.heappush(queue, (counts[d], d))
	order.reverse()
	return order

def output_file(out: TextIO, fin: TextIO, keep_license: bool) -> None:
	skip = LICENSE_LINES
	if keep_license: skip = 0
	while True:
		line = fin.readline()
		if not line:
			break
		if skip:
			skip -= 1
			continue
		out.write(line)

def output_files(out: TextIO, paths: List[str]) -> None:
	first = True
	for p in paths:
		with open(p, 'r') as fin:
			output_file(out, fin, first)
		first = False

if len(sys.argv) < 2:
	print(
'''usage: %s MODULE... > OUTFILE

ex:    %s pbkdf2 tiger > my_crypto.js
Dependencies are handled automatically, and the order is corrected.''' %
	    (sys.argv[0], sys.argv[0]))
	sys.exit(0)

if len(sys.argv) == 2 and sys.argv[1] == 'all':
	order = get_order(DEP.keys())
else:
	order = get_order(sys.argv[1:])
output_files(sys.stdout, [ x + '.js' for x in order ])
