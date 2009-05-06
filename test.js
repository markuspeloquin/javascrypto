function str_reverse(str)
{
	var res = '';
	for (var i = str.length-1; i > -1; i--)
		res += str.charAt(i);
	return res;
}

function print_msg(str)
{
	var container = document.getElementById('status');
	if (container.firstChild) {
		var br = document.createElement('br');
		container.appendChild(br);
	}
	var txt = document.createTextNode(str);
	container.appendChild(txt);
}

function run_test(groupname, testnum, hashfn, msg, hash)
{
	var buf = Buffer.from_ascii(msg);
	hashfn.init();
	hashfn.update(buf, msg.length);
	var digest = hashfn.end();
	var digest_hex = Buffer.as_hex(digest);

	hash = hash.toLowerCase();
	digest_hex = digest_hex.toLowerCase();
	var msg = '\n' + groupname + ' test ' + testnum + ': ';
	if (digest_hex == hash)
		msg += 'PASS';
	else
		msg += 'FAIL (got ' + digest_hex + ')';
	print_msg(msg);
}

var alphabet = 'abcdefghijklmnopqrstuvwxyz';
var digits = '0123456789';

// TIGER TESTS

var tiger_tests = [];
tiger_tests.push({
    msg: '',
    hash: '3293AC630C13F0245F92BBB1766E16167A4E58492DDE73F3' });
tiger_tests.push({
    msg: 'a',
    hash: '77BEFBEF2E7EF8AB2EC8F93BF587A7FC613E247F5F247809' });
tiger_tests.push({
    msg: 'abc',
    hash: '2AAB1484E8C158F2BFB8C5FF41B57A525129131C957B5F93' });
tiger_tests.push({
    msg: 'message digest',
    hash: 'D981F8CB78201A950DCF3048751E441C517FCA1AA55A29F6' });
tiger_tests.push({
    msg: alphabet,
    hash: '1714A472EEE57D30040412BFCC55032A0B11602FF37BEEE9'});
tiger_tests.push({
    msg: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    hash: '0F7BF9A19B9C58F2B7610DF7E84F0AC3A71C631E7B53F78E' });
tiger_tests.push({
    msg: (alphabet.toUpperCase() + alphabet + digits),
    hash: '8DCEA680A17583EE502BA38A3C368651890FFBCCDC49A8CC' });
tiger_tests.push({
    msg: function(){
	var res = '';
	for (var i = 0; i < 8; i++) res += '1234567890';
	return res; }(),
    hash: '1C14795529FD9F207A958F84C52F11E887FA0CABDFD91BFD' });
// this test takes a very long time
/*
tiger_tests.push({
    msg: function(){
	var res = '';
	for (var i = 0; i < 1000000; i++) res += 'a';
	return res; }(),
    hash: '6DB0E2729CBEAD93D715C6A7D36302E9B3CEE0D2BC314B41' });
*/

var wp_tests = [];
wp_tests.push({
    msg: '',
    hash:
	'19FA61D75522A4669B44E39C1D2E1726C530232130D407F89AFEE0964997F7A7' +
        '3E83BE698B288FEBCF88E3E03C4F0757EA8964E59B63D93708B138CC42A66EB3' });
wp_tests.push({
    msg: 'a',
    hash:
	'8ACA2602792AEC6F11A67206531FB7D7F0DFF59413145E6973C45001D0087B42' +
        'D11BC645413AEFF63A42391A39145A591A92200D560195E53B478584FDAE231A' });
/*
wp_tests.push({
    msg: '',
    hash: '' });
*/
wp_tests.push({
    msg: 'abc',
    hash:
	'4E2448A4C6F486BB16B6562C73B4020BF3043E3A731BCE721AE1B303D97E6D4C' +
        '7181EEBDB6C57E277D0E34957114CBD6C797FC9D95D8B582D225292076D4EEF5' });
wp_tests.push({
    msg: 'message digest',
    hash:
	'378C84A4126E2DC6E56DCC7458377AAC838D00032230F53CE1F5700C0FFB4D3B' +
        '8421557659EF55C106B4B52AC5A4AAA692ED920052838F3362E86DBD37A8903E' });
wp_tests.push({
    msg: alphabet,
    hash:
	'F1D754662636FFE92C82EBB9212A484A8D38631EAD4238F5442EE13B8054E41B' +
        '08BF2A9251C30B6A0B8AAE86177AB4A6F68F673E7207865D5D9819A3DBA4EB3B' });
wp_tests.push({
    msg: (alphabet.toUpperCase() + alphabet + digits),
    hash:
	'DC37E008CF9EE69BF11F00ED9ABA26901DD7C28CDEC066CC6AF42E40F82F3A1E' +
        '08EBA26629129D8FB7CB57211B9281A65517CC879D7B962142C65F5A7AF01467' });
wp_tests.push({
    msg: function(){
	var res = '';
	for (var i = 0; i < 8; i++) res += '1234567890';
	return res; }(),
    hash:
	'466EF18BABB0154D25B9D38A6414F5C08784372BCCB204D6549C4AFADB601429' +
        '4D5BD8DF2A6C44E538CD047B2681A51A2C60481E88C5A20B2C2A80CF3A9A083B' });
wp_tests.push({
    msg: 'abcdbcdecdefdefgefghfghighijhijk',
    hash:
	'2A987EA40F917061F5D6F0A0E4644F488A7A5A52DEEE656207C562F988E95C69' +
        '16BDC8031BC5BE1B7B947639FE050B56939BAAA0ADFF9AE6745B7B181C3BE3FD' });
// this test takes a very long time
/*
wp_tests.push({
    msg: function(){
	var res = '';
	for (var i = 0; i < 1000000; i++) res += 'a';
	return res; }(),
    hash:
	'0C99005BEB57EFF50A7CF005560DDF5D29057FD86B20BFD62DECA0F1CCEA4AF5' +
	'1FC15490EDDC47AF32BB2B66C34FF9AD8C6008AD677F77126953B226E4ED8B01' });
*/

onload = function()
{
	run_tiger_tests(new Tiger, tiger_tests, 0);
}

function run_tiger_tests(hashfn, tests, start_index)
{
	if (start_index >= tests.length) {
		run_whirlpool_tests(new Whirlpool, wp_tests, 0);
		return;
	}

	run_test('tiger', start_index + 1, hashfn,
	    tests[start_index].msg, tests[start_index].hash);

	// tail recurse, let status update
	setTimeout(function() { run_tiger_tests(hashfn,
	    tests, start_index + 1) }, 0);
}

function run_whirlpool_tests(hashfn, tests, start_index)
{
	if (start_index >= tests.length)
		return;

	run_test('whirlpool', start_index + 1, hashfn,
	    tests[start_index].msg, tests[start_index].hash);

	// tail recurse, let status update
	setTimeout(function() { run_whirlpool_tests(hashfn,
	    tests, start_index + 1) }, 0);
}
