'use strict';

function arrayEqual(a, b) {
	if (a.length != b.length) return false;
	for (let i = 0; i < a.length; i++)
		if (a[i] != b[i]) return false;
	return true;
}

function strReverse(str) {
	return str.split('').reverse().join('');
}

function msgPrint(str) {
	const container = document.getElementById('status');
	if (container.firstChild)
		container.appendChild(document.createElement('br'));
	container.appendChild(document.createTextNode(str));
}

function msgClear() {
	const container = document.getElementById('status');
	while (container.firstChild)
		container.removeChild(container.firstChild);
}

const Timer = (function() {
	function Timer() {
		this._start = new Date().getTime();
	}

	function read() {
		return new Date().getTime() - this._start;
	}

	Timer.prototype = {
		constructor: Timer,
		read: read,
	};
	return Timer;
})();

function addRunTime(runTime, group, milli) {
	runTime[group] = (runTime[group] || 0) + milli;
}

function runHashTest(test, runTime) {
	const group = test.group;
	const hash = test.hash.toLowerCase();
	const hashfn = test.fn;
	let msg = test.msg;

	const timer = new Timer;
	hashfn.init();
	if (msg == null)
		test.generator(hashfn);
	else {
		const buf = ByteArray.fromText(msg);
		hashfn.update(buf, buf.size());
	}
	const digestHex = hashfn.end().toHex().toLowerCase();
	addRunTime(runTime, group, timer.read());

	msg = group + ' test ' + test.testnum + ': ';
	if (digestHex == hash)
		msg += 'PASS';
	else
		msg += 'FAIL (actual ' + digestHex + ', expected ' + hash + ')';
	msgPrint(msg);
}

function runSerpentTest(testnum, key, ct, pt, type, encrypt, runTime) {
	ct = ByteArray.fromHex(ct);
	pt = ByteArray.fromHex(pt);

	const timer = new Timer;
	const cipher = new Serpent(ByteArray.fromHex(key));

	const iter = type == 'monte_carlo' ? 10000 : 1;
	const buf = new ByteArray(16);
	let correct;
	if (encrypt) {
		correct = ct;
		cipher.encrypt(pt, buf);
		for (let i = 1; i != iter; ++i)
			cipher.encrypt(buf, buf);
	} else {
		correct = pt;
		cipher.decrypt(ct, buf);
		for (let i = 1; i != iter; ++i)
			cipher.decrypt(buf, buf);
	}
	const msg = 'serpent test ' + testnum + ': ';
	let success = arrayEqual(correct, buf);

	switch (type) {
	case 'table':
	case 'variable_key':
	case 'variable_text':
		// do opposite direction for known answer
		if (encrypt) {
			correct = pt;
			cipher.decrypt(ct, buf);
		} else {
			correct = ct;
			cipher.encrypt(pt, buf);
		}

		success = success && arrayEqual(correct, buf);
	}
	addRunTime(runTime, 'serpent', timer.read());

	if (success)
		msgPrint(msg + 'PASS');
	else
		msgPrint(msg + 'FAIL correct:' + correct.toHex() +
		    ' result:' + buf.toHex());
}

function checkboxValue(id) {
	return document.getElementById(id).checked;
}

function startTests() {
	if (testsRunning) {
		testsStop = true;
		setTimeout(startTests, 0);
		return;
	}

	const alphabet = 'abcdefghijklmnopqrstuvwxyz';
	const digits = '0123456789';

	const tests = [];

	const runTiger = checkboxValue('run_tiger');
	const runWhirlpool = checkboxValue('run_whirlpool');
	const runSerpent = checkboxValue('run_serpent');

	const tiger = runTiger ? new Tiger : null;
	const whirlpool = runWhirlpool ? new Whirlpool : null;

	if (runTiger) {
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 1,
		    msg: '',
		    hash: '3293AC630C13F0245F92BBB1766E16167A4E58492DDE73F3',
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 2,
		    msg: 'a',
		    hash: '77BEFBEF2E7EF8AB2EC8F93BF587A7FC613E247F5F247809',
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 3,
		    msg: 'abc',
		    hash: '2AAB1484E8C158F2BFB8C5FF41B57A525129131C957B5F93',
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 4,
		    msg: 'message digest',
		    hash: 'D981F8CB78201A950DCF3048751E441C517FCA1AA55A29F6',
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 5,
		    msg: alphabet,
		    hash: '1714A472EEE57D30040412BFCC55032A0B11602FF37BEEE9',
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 6,
		    msg:
			'abcdbcdecdefdefgefghfghighij' +
			'hijkijkljklmklmnlmnomnopnopq',
		    hash: '0F7BF9A19B9C58F2B7610DF7E84F0AC3A71C631E7B53F78E',
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 7,
		    generator: function(hashfn) {
			const b0 = ByteArray.fromText(alphabet.toUpperCase());
			const b1 = ByteArray.fromText(alphabet);
			const b2 = ByteArray.fromText(digits);
			hashfn.update(b0, b0.size());
			hashfn.update(b1, b1.size());
			hashfn.update(b2, b2.size());
		    },
		    hash: '8DCEA680A17583EE502BA38A3C368651890FFBCCDC49A8CC',
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 8,
		    generator: function(hashfn) {
			    const buf = ByteArray.fromText('1234567890');
			    for (let i = 0; i < 8; i++)
				    hashfn.update(buf, 10);
		    },
		    hash: '1C14795529FD9F207A958F84C52F11E887FA0CABDFD91BFD',
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 9,
		    generator: function(hashfn) {
			// fully aligned blocks (size 4*n) are more optimal
			// 1 million 'a'
			const buf = ByteArray.fromText('aaaaaaaaaaaaaaaa');
			const bufsz = buf.size();
			const count = 1000000 / bufsz;
			if (bufsz * count != 1000000) throw 'not aligned';
			for (let i = 0; i < count; i++)
				hashfn.update(buf, bufsz);
		    },
		    hash: '6DB0E2729CBEAD93D715C6A7D36302E9B3CEE0D2BC314B41'
		});
	}
	if (runWhirlpool) {
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 1,
		    msg: '',
		    hash:
			'19FA61D75522A4669B44E39C1D2E1726' +
			'C530232130D407F89AFEE0964997F7A7' +
			'3E83BE698B288FEBCF88E3E03C4F0757' +
			'EA8964E59B63D93708B138CC42A66EB3',
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 2,
		    msg: 'a',
		    hash:
			'8ACA2602792AEC6F11A67206531FB7D7' +
			'F0DFF59413145E6973C45001D0087B42' +
			'D11BC645413AEFF63A42391A39145A59' +
			'1A92200D560195E53B478584FDAE231A',
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 3,
		    msg: 'abc',
		    hash:
			'4E2448A4C6F486BB16B6562C73B4020B' +
			'F3043E3A731BCE721AE1B303D97E6D4C' +
			'7181EEBDB6C57E277D0E34957114CBD6' +
			'C797FC9D95D8B582D225292076D4EEF5',
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 4,
		    msg: 'message digest',
		    hash:
			'378C84A4126E2DC6E56DCC7458377AAC' +
			'838D00032230F53CE1F5700C0FFB4D3B' +
			'8421557659EF55C106B4B52AC5A4AAA6' +
			'92ED920052838F3362E86DBD37A8903E',
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 5,
		    msg: alphabet,
		    hash:
			'F1D754662636FFE92C82EBB9212A484A' +
			'8D38631EAD4238F5442EE13B8054E41B' +
			'08BF2A9251C30B6A0B8AAE86177AB4A6' +
			'F68F673E7207865D5D9819A3DBA4EB3B',
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 6,
		    generator: function(hashfn) {
			const b0 = ByteArray.fromText(alphabet.toUpperCase());
			const b1 = ByteArray.fromText(alphabet);
			const b2 = ByteArray.fromText(digits);
			hashfn.update(b0, b0.size());
			hashfn.update(b1, b1.size());
			hashfn.update(b2, b2.size());
		    },
		    hash:
			'DC37E008CF9EE69BF11F00ED9ABA2690' +
			'1DD7C28CDEC066CC6AF42E40F82F3A1E' +
			'08EBA26629129D8FB7CB57211B9281A6' +
			'5517CC879D7B962142C65F5A7AF01467',
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 7,
		    generator: function(hashfn) {
			const buf = ByteArray.fromText('1234567890');
			for (let i = 0; i < 8; i++)
				hashfn.update(buf, buf.size());
		    },
		    hash:
			'466EF18BABB0154D25B9D38A6414F5C0' +
			'8784372BCCB204D6549C4AFADB601429' +
			'4D5BD8DF2A6C44E538CD047B2681A51A' +
			'2C60481E88C5A20B2C2A80CF3A9A083B',
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 8,
		    msg: 'abcdbcdecdefdefgefghfghighijhijk',
		    hash:
			'2A987EA40F917061F5D6F0A0E4644F48' +
			'8A7A5A52DEEE656207C562F988E95C69' +
			'16BDC8031BC5BE1B7B947639FE050B56' +
			'939BAAA0ADFF9AE6745B7B181C3BE3FD',
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 9,
		    generator: function(hashfn) {
			// fully aligned blocks (size 4*n) are more optimal
			// 1 million 'a'
			const buf = ByteArray.fromText('aaaaaaaaaaaaaaaa');
			const bufsz = buf.size();
			const count = 1000000 / bufsz;
			if (bufsz * count != 1000000) throw 'not aligned';
			for (let i = 0; i < count; i++)
				hashfn.update(buf, bufsz);
		    },
		    hash:
			'0C99005BEB57EFF50A7CF005560DDF5D' +
			'29057FD86B20BFD62DECA0F1CCEA4AF5' +
			'1FC15490EDDC47AF32BB2B66C34FF9AD' +
			'8C6008AD677F77126953B226E4ED8B01'
		});
	}
	if (runSerpent)
		tests.push(...serpentTests);

	testsRunning = true;
	msgClear();

	const state = {
		tests: tests,
		times: {},
		index: 0,
	};
	runTests(state);
}

function foreachPair(object, fn) {
	for (const key of Object.keys(object).sort())
		fn(key, object[key]);
}

function runTests(state) {
	const tests = state.tests;
	const runTime = state.times;
	const index = state.index;

	if (testsStop || index == tests.length) {
		testsStop = false;
		testsRunning = false;
		foreachPair(runTime, (key, val) => {
			const sec = val / 1000;
			msgPrint(key + ': ' + sec + ' s');
		});
		msgPrint('all stop');
		return;
	}

	const test = tests[index];
	if (test.key == null)
		runHashTest(test, runTime);
	else {
		// rather than import all the other tests, I'll just run
		// the monte-carlo test twice
		runSerpentTest(test.testnum*2-1, test.key, test.ct, test.pt,
		    test.type, test.encrypt, runTime);
		runSerpentTest(test.testnum*2, test.key, test.ct, test.pt,
		    test.type, !test.encrypt, runTime);
	}

	// tail recurse, let status update
	state.index++;
	setTimeout(() => runTests(state), 0);
}

let testsRunning = false;
let testsStop = false;
