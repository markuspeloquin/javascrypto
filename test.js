function str_reverse(str)
{
	var res = '';
	for (var i = str.length-1; i > -1; i--)
		res += str.charAt(i);
	return res;
}

function msg_print(str)
{
	var container = document.getElementById('status');
	if (container.firstChild)
		container.appendChild(document.createElement('br'));
	var txt = document.createTextNode(str);
	container.appendChild(txt);
}

function msg_clear()
{
	var container = document.getElementById('status');
	while (container.firstChild)
		container.removeChild(container.firstChild);
}

function run_hash_test(groupname, testnum, hashfn, msg, hash)
{
	var buf = Buffer.from_ascii(msg);
	hashfn.init();
	hashfn.update(buf, msg.length);
	var digest = hashfn.end();
	var digest_hex = Buffer.as_hex(digest);

	hash = hash.toLowerCase();
	digest_hex = digest_hex.toLowerCase();
	var msg = groupname + ' test ' + testnum + ': ';
	if (digest_hex == hash)
		msg += 'PASS';
	else
		msg += 'FAIL (got ' + digest_hex + ')';
	msg_print(msg);
}

function run_serpent_test(testnum, key, ct, pt, type, encrypt)
{
	var buf;
	var cipher;
	var correct;
	var i;
	var iter;
	var msg;

	ct = Buffer.from_hex(ct);
	pt = Buffer.from_hex(pt);

	cipher = new Serpent(Buffer.from_hex(key));

	iter = type == 'monte_carlo' ? 10000 : 1;
	buf = [0,0,0,0];
	if (encrypt) {
		correct = ct;
		cipher.encrypt(pt, buf);
		for (i = 1; i != iter; ++i)
			cipher.encrypt(buf, buf);
	} else {
		correct = pt;
		cipher.decrypt(ct, buf);
		for (i = 1; i != iter; ++i)
			cipher.decrypt(buf, buf);
	}
	msg = 'serpent test ' + testnum + ': ';
	for (i = 0; i != 4; ++i)
		if (correct[i] != buf[i]) {
			msg_print(msg + 'FAIL correct:' +
			    Buffer.as_hex(correct) + ' result:' +
			    Buffer.as_hex(buf));
			return;
		}

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

		for (i = 0; i != 4; ++i)
			if (correct[i] != buf[i]) {
				msg_print(msg + 'FAIL correct:' +
				    Buffer.as_hex(correct) + ' result:' +
				    Buffer.as_hex(buf));
				return;
			}
	default:;
	}

	msg_print(msg + 'PASS');
}

function checkbox_value(id)
{
	return document.getElementById(id).checked;
}

function start_tests()
{
	if (tests_running) {
		tests_stop = true;
		setTimeout(start_tests, 0);
		return;
	}

	var alphabet = 'abcdefghijklmnopqrstuvwxyz';
	var digits = '0123456789';
	var tests = [];

	var run_tiger = checkbox_value('run_tiger');
	var run_whirlpool = checkbox_value('run_whirlpool');
	var run_serpent = checkbox_value('run_serpent');
	var run_longtests = checkbox_value('run_longtests');

	var tiger;
	var whirlpool;
	if (run_tiger) tiger = new Tiger;
	if (run_whirlpool) whirlpool = new Whirlpool;

	if (run_tiger) {
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 1,
		    msg: '',
		    hash: '3293AC630C13F0245F92BBB1766E16167A4E58492DDE73F3'
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 2,
		    msg: 'a',
		    hash: '77BEFBEF2E7EF8AB2EC8F93BF587A7FC613E247F5F247809'
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 3,
		    msg: 'abc',
		    hash: '2AAB1484E8C158F2BFB8C5FF41B57A525129131C957B5F93'
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 4,
		    msg: 'message digest',
		    hash: 'D981F8CB78201A950DCF3048751E441C517FCA1AA55A29F6'
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 5,
		    msg: alphabet,
		    hash: '1714A472EEE57D30040412BFCC55032A0B11602FF37BEEE9'
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 6,
		    msg:
			'abcdbcdecdefdefgefghfghighij' +
			'hijkijkljklmklmnlmnomnopnopq',
		    hash: '0F7BF9A19B9C58F2B7610DF7E84F0AC3A71C631E7B53F78E'
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 7,
		    msg: (alphabet.toUpperCase() + alphabet + digits),
		    hash: '8DCEA680A17583EE502BA38A3C368651890FFBCCDC49A8CC'
		});
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 8,
		    msg: function(){
			var res = '';
			for (var i = 0; i < 8; i++) res += '1234567890';
			return res; }(),
		    hash: '1C14795529FD9F207A958F84C52F11E887FA0CABDFD91BFD'
		});
	}
	if (run_tiger && run_longtests)
		tests.push({
		    fn: tiger,
		    group: 'tiger',
		    testnum: 9,
		    msg: function(){
			var res = '';
			for (var i = 0; i < 1000000; i++) res += 'a';
			return res; }(),
		    hash: '6DB0E2729CBEAD93D715C6A7D36302E9B3CEE0D2BC314B41',
		    longtest: true
		});
	if (run_whirlpool) {
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 1,
		    msg: '',
		    hash:
			'19FA61D75522A4669B44E39C1D2E1726' +
			'C530232130D407F89AFEE0964997F7A7' +
			'3E83BE698B288FEBCF88E3E03C4F0757' +
			'EA8964E59B63D93708B138CC42A66EB3'
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
			'1A92200D560195E53B478584FDAE231A'
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
			'C797FC9D95D8B582D225292076D4EEF5'
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
			'92ED920052838F3362E86DBD37A8903E'
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
			'F68F673E7207865D5D9819A3DBA4EB3B'
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 6,
		    msg: (alphabet.toUpperCase() + alphabet + digits),
		    hash:
			'DC37E008CF9EE69BF11F00ED9ABA2690' +
			'1DD7C28CDEC066CC6AF42E40F82F3A1E' +
			'08EBA26629129D8FB7CB57211B9281A6' +
			'5517CC879D7B962142C65F5A7AF01467'
		});
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 7,
		    msg: function(){
			var res = '';
			for (var i = 0; i < 8; i++) res += '1234567890';
			return res; }(),
		    hash:
			'466EF18BABB0154D25B9D38A6414F5C0' +
			'8784372BCCB204D6549C4AFADB601429' +
			'4D5BD8DF2A6C44E538CD047B2681A51A' +
			'2C60481E88C5A20B2C2A80CF3A9A083B'
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
			'939BAAA0ADFF9AE6745B7B181C3BE3FD'
		});
	}
	if (run_whirlpool && run_longtests)
		tests.push({
		    fn: whirlpool,
		    group: 'whirlpool',
		    testnum: 9,
		    msg: function(){
			var res = '';
			for (var i = 0; i < 1000000; i++) res += 'a';
			return res; }(),
		    hash:
			'0C99005BEB57EFF50A7CF005560DDF5D' +
			'29057FD86B20BFD62DECA0F1CCEA4AF5' +
			'1FC15490EDDC47AF32BB2B66C34FF9AD' +
			'8C6008AD677F77126953B226E4ED8B01',
		    longtest: true
		});
	if (run_serpent && run_longtests)
		tests = tests.concat(serpent_tests);

	tests_running = true;
	msg_clear();
	run_tests(tests, 0);
}

function run_tests(tests, start_index)
{
	if (tests_stop || start_index == tests.length) {
		tests_stop = false;
		tests_running = false;
		msg_print('all stop');
		return;
	}

	var test = tests[start_index];
	if (test.key != null) {
		// rather than import all the other tests, I'll just run
		// the monte-carlo test twice
		run_serpent_test(test.testnum*2-1, test.key, test.ct, test.pt,
		    test.type, test.encrypt);
		run_serpent_test(test.testnum*2, test.key, test.ct, test.pt,
		    test.type, !test.encrypt);
	} else
		run_hash_test(test.group, test.testnum, test.fn, test.msg,
		    test.hash);

	// tail recurse, let status update
	setTimeout(function() {
		run_tests(tests, start_index + 1);
	}, 0);
}

var tests_running = false;
var tests_stop = false;
