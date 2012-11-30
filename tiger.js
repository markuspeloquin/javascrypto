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

/** Tiger hash function
 * \param version (Optional) version (1 [default] or 2)
 */
Tiger = function(/*optional*/version)
{
	this.constructor = Tiger;
	// default to 1
	this._buf = Buffer.zeros32(Tiger.BLOCK/4);
	this._version = (arguments.length && version == 2) ? 2 : 1;
}
Tiger.BLOCK = 64;	/**< Block size in bytes */
Tiger.DIGEST = 24;	/**< Digest size in bytes */
Tiger.prototype = new Hash();

Tiger.prototype.init = function()
{
	this._res = [new Long(0x01234567,0x89abcdef),
	    new Long(0xfedcba98,0x76543210),new Long(0xf096a5b4,0xc3b2e187)];
	this._length = new Long;
	this._sz = 0;
}
Tiger.prototype.update = function(buf, sz)
{
	if (sz > buf.length*4) sz = buf.length*4;
	var temp = Buffer.zeros64(Tiger.BLOCK/8);
	var src = 0; // pos

	this._length = Long.add(this._length, new Long(sz));

	if (this._sz + sz < Tiger.BLOCK) {
		// buffer won't fill
		Buffer.copy(this._buf, this._sz, buf, src, sz);
		this._sz += sz;
		return;
	}

	// if data remaining in ctx
	if (this._sz) {
		var bytes = Tiger.BLOCK - this._sz;
		Buffer.copy(this._buf, this._sz, buf, src, bytes);
		Buffer.copy_be_le(temp, 0, this._buf, 0, Tiger.BLOCK);
		Tiger.compress(temp, this._res);
		src += bytes;
		sz -= bytes;
		// context buffer now empty
	}

	while (sz >= Tiger.BLOCK) {
		Buffer.copy_be_le(temp, 0, buf, src, Tiger.BLOCK);
		Tiger.compress(temp, this._res);
		src += Tiger.BLOCK;
		sz -= Tiger.BLOCK;
	}

	if (sz)
		// fill context buffer with the remaining bytes
		Buffer.copy(this._buf, 0, buf, src, sz);
	this._sz = sz;
}
Tiger.prototype.end = function()
{
	var temp = Buffer.zeros64(Tiger.BLOCK/8);
	var i;

	Buffer.copy_be_le(temp, 0, this._buf, 0, this._sz);

	i = this._sz;
	Buffer.set64(temp, i++ ^ 7, this._version == 1 ? 0x01: 0x80);
	while (i & 7) Buffer.set64(temp, i++ ^ 7, 0);

	if (i > 56) {
		Tiger.compress(temp, this._res);
		i = 0;
	}

	while (i>>>3 < 7) {
		temp[i>>>3] = new Long;
		i += 8;
	}
	temp[7] = Long.lshift(this._length,3);
	Tiger.compress(temp, this._res);

	var res = new Array(Tiger.DIGEST>>2);
	res[0] = 0;
	Buffer.copy_le_be(res, 0, this._res, 0, Tiger.DIGEST);
	return res;
}
Tiger.prototype.digest_size = function()
{ return Tiger.DIGEST }
Tiger.prototype.block_size = function()
{ return Tiger.BLOCK }

Tiger._NUM_PASSES = 3;
Tiger.t1 = [
	new Long(0x02AAB17C,0xF7E90C5E),new Long(0xAC424B03,0xE243A8EC),
	new Long(0x72CD5BE3,0x0DD5FCD3),new Long(0x6D019B93,0xF6F97F3A),
	new Long(0xCD9978FF,0xD21F9193),new Long(0x7573A1C9,0x708029E2),
	new Long(0xB164326B,0x922A83C3),new Long(0x46883EEE,0x04915870),
	new Long(0xEAACE305,0x7103ECE6),new Long(0xC54169B8,0x08A3535C),
	new Long(0x4CE75491,0x8DDEC47C),new Long(0x0AA2F4DF,0xDC0DF40C),
	new Long(0x10B76F18,0xA74DBEFA),new Long(0xC6CCB623,0x5AD1AB6A),
	new Long(0x13726121,0x572FE2FF),new Long(0x1A488C6F,0x199D921E),
	new Long(0x4BC9F9F4,0xDA0007CA),new Long(0x26F5E6F6,0xE85241C7),
	new Long(0x859079DB,0xEA5947B6),new Long(0x4F1885C5,0xC99E8C92),
	new Long(0xD78E761E,0xA96F864B),new Long(0x8E36428C,0x52B5C17D),
	new Long(0x69CF6827,0x373063C1),new Long(0xB607C93D,0x9BB4C56E),
	new Long(0x7D820E76,0x0E76B5EA),new Long(0x645C9CC6,0xF07FDC42),
	new Long(0xBF38A078,0x243342E0),new Long(0x5F6B343C,0x9D2E7D04),
	new Long(0xF2C28AEB,0x600B0EC6),new Long(0x6C0ED85F,0x7254BCAC),
	new Long(0x71592281,0xA4DB4FE5),new Long(0x1967FA69,0xCE0FED9F),
	new Long(0xFD5293F8,0xB96545DB),new Long(0xC879E9D7,0xF2A7600B),
	new Long(0x86024892,0x0193194E),new Long(0xA4F9533B,0x2D9CC0B3),
	new Long(0x9053836C,0x15957613),new Long(0xDB6DCF8A,0xFC357BF1),
	new Long(0x18BEEA7A,0x7A370F57),new Long(0x037117CA,0x50B99066),
	new Long(0x6AB30A97,0x74424A35),new Long(0xF4E92F02,0xE325249B),
	new Long(0x7739DB07,0x061CCAE1),new Long(0xD8F3B49C,0xECA42A05),
	new Long(0xBD56BE3F,0x51382F73),new Long(0x45FAED58,0x43B0BB28),
	new Long(0x1C813D5C,0x11BF1F83),new Long(0x8AF0E4B6,0xD75FA169),
	new Long(0x33EE18A4,0x87AD9999),new Long(0x3C26E8EA,0xB1C94410),
	new Long(0xB510102B,0xC0A822F9),new Long(0x141EEF31,0x0CE6123B),
	new Long(0xFC65B900,0x59DDB154),new Long(0xE0158640,0xC5E0E607),
	new Long(0x884E0798,0x26C3A3CF),new Long(0x930D0D95,0x23C535FD),
	new Long(0x35638D75,0x4E9A2B00),new Long(0x4085FCCF,0x40469DD5),
	new Long(0xC4B17AD2,0x8BE23A4C),new Long(0xCAB2F0FC,0x6A3E6A2E),
	new Long(0x2860971A,0x6B943FCD),new Long(0x3DDE6EE2,0x12E30446),
	new Long(0x6222F32A,0xE01765AE),new Long(0x5D550BB5,0x478308FE),
	new Long(0xA9EFA98D,0xA0EDA22A),new Long(0xC351A716,0x86C40DA7),
	new Long(0x1105586D,0x9C867C84),new Long(0xDCFFEE85,0xFDA22853),
	new Long(0xCCFBD026,0x2C5EEF76),new Long(0xBAF294CB,0x8990D201),
	new Long(0xE69464F5,0x2AFAD975),new Long(0x94B013AF,0xDF133E14),
	new Long(0x06A7D1A3,0x2823C958),new Long(0x6F95FE51,0x30F61119),
	new Long(0xD92AB34E,0x462C06C0),new Long(0xED7BDE33,0x887C71D2),
	new Long(0x79746D6E,0x6518393E),new Long(0x5BA41938,0x5D713329),
	new Long(0x7C1BA6B9,0x48A97564),new Long(0x31987C19,0x7BFDAC67),
	new Long(0xDE6C23C4,0x4B053D02),new Long(0x581C49FE,0xD002D64D),
	new Long(0xDD474D63,0x38261571),new Long(0xAA4546C3,0xE473D062),
	new Long(0x928FCE34,0x9455F860),new Long(0x48161BBA,0xCAAB94D9),
	new Long(0x63912430,0x770E6F68),new Long(0x6EC8A5E6,0x02C6641C),
	new Long(0x87282515,0x337DDD2B),new Long(0x2CDA6B42,0x034B701B),
	new Long(0xB03D37C1,0x81CB096D),new Long(0xE1084382,0x66C71C6F),
	new Long(0x2B3180C7,0xEB51B255),new Long(0xDF92B82F,0x96C08BBC),
	new Long(0x5C68C8C0,0xA632F3BA),new Long(0x5504CC86,0x1C3D0556),
	new Long(0xABBFA4E5,0x5FB26B8F),new Long(0x41848B0A,0xB3BACEB4),
	new Long(0xB334A273,0xAA445D32),new Long(0xBCA696F0,0xA85AD881),
	new Long(0x24F6EC65,0xB528D56C),new Long(0x0CE1512E,0x90F4524A),
	new Long(0x4E9DD79D,0x5506D35A),new Long(0x258905FA,0xC6CE9779),
	new Long(0x2019295B,0x3E109B33),new Long(0xF8A9478B,0x73A054CC),
	new Long(0x2924F2F9,0x34417EB0),new Long(0x3993357D,0x536D1BC4),
	new Long(0x38A81AC2,0x1DB6FF8B),new Long(0x47C4FBF1,0x7D6016BF),
	new Long(0x1E0FAADD,0x7667E3F5),new Long(0x7ABCFF62,0x938BEB96),
	new Long(0xA78DAD94,0x8FC179C9),new Long(0x8F1F98B7,0x2911E50D),
	new Long(0x61E48EAE,0x27121A91),new Long(0x4D62F7AD,0x31859808),
	new Long(0xECEBA345,0xEF5CEAEB),new Long(0xF5CEB25E,0xBC9684CE),
	new Long(0xF633E20C,0xB7F76221),new Long(0xA32CDF06,0xAB8293E4),
	new Long(0x985A202C,0xA5EE2CA4),new Long(0xCF0B8447,0xCC8A8FB1),
	new Long(0x9F765244,0x979859A3),new Long(0xA8D516B1,0xA1240017),
	new Long(0x0BD7BA3E,0xBB5DC726),new Long(0xE54BCA55,0xB86ADB39),
	new Long(0x1D7A3AFD,0x6C478063),new Long(0x519EC608,0xE7669EDD),
	new Long(0x0E5715A2,0xD149AA23),new Long(0x177D4571,0x848FF194),
	new Long(0xEEB55F32,0x41014C22),new Long(0x0F5E5CA1,0x3A6E2EC2),
	new Long(0x8029927B,0x75F5C361),new Long(0xAD139FAB,0xC3D6E436),
	new Long(0x0D5DF1A9,0x4CCF402F),new Long(0x3E8BD948,0xBEA5DFC8),
	new Long(0xA5A0D357,0xBD3FF77E),new Long(0xA2D12E25,0x1F74F645),
	new Long(0x66FD9E52,0x5E81A082),new Long(0x2E0C90CE,0x7F687A49),
	new Long(0xC2E8BCBE,0xBA973BC5),new Long(0x000001BC,0xE509745F),
	new Long(0x423777BB,0xE6DAB3D6),new Long(0xD1661C7E,0xAEF06EB5),
	new Long(0xA1781F35,0x4DAACFD8),new Long(0x2D11284A,0x2B16AFFC),
	new Long(0xF1FC4F67,0xFA891D1F),new Long(0x73ECC25D,0xCB920ADA),
	new Long(0xAE610C22,0xC2A12651),new Long(0x96E0A810,0xD356B78A),
	new Long(0x5A9A381F,0x2FE7870F),new Long(0xD5AD62ED,0xE94E5530),
	new Long(0xD225E5E8,0x368D1427),new Long(0x65977B70,0xC7AF4631),
	new Long(0x99F889B2,0xDE39D74F),new Long(0x233F30BF,0x54E1D143),
	new Long(0x9A9675D3,0xD9A63C97),new Long(0x5470554F,0xF334F9A8),
	new Long(0x166ACB74,0x4A4F5688),new Long(0x70C74CAA,0xB2E4AEAD),
	new Long(0xF0D09164,0x6F294D12),new Long(0x57B82A89,0x684031D1),
	new Long(0xEFD95A5A,0x61BE0B6B),new Long(0x2FBD12E9,0x69F2F29A),
	new Long(0x9BD37013,0xFEFF9FE8),new Long(0x3F9B0404,0xD6085A06),
	new Long(0x4940C1F3,0x166CFE15),new Long(0x09542C4D,0xCDF3DEFB),
	new Long(0xB4C52183,0x85CD5CE3),new Long(0xC935B7DC,0x4462A641),
	new Long(0x3417F8A6,0x8ED3B63F),new Long(0xB8095929,0x5B215B40),
	new Long(0xF99CDAEF,0x3B8C8572),new Long(0x018C0614,0xF8FCB95D),
	new Long(0x1B14ACCD,0x1A3ACDF3),new Long(0x84D471F2,0x00BB732D),
	new Long(0xC1A3110E,0x95E8DA16),new Long(0x430A7220,0xBF1A82B8),
	new Long(0xB77E090D,0x39DF210E),new Long(0x5EF4BD9F,0x3CD05E9D),
	new Long(0x9D4FF6DA,0x7E57A444),new Long(0xDA1D60E1,0x83D4A5F8),
	new Long(0xB287C384,0x17998E47),new Long(0xFE3EDC12,0x1BB31886),
	new Long(0xC7FE3CCC,0x980CCBEF),new Long(0xE46FB590,0x189BFD03),
	new Long(0x3732FD46,0x9A4C57DC),new Long(0x7EF700A0,0x7CF1AD65),
	new Long(0x59C64468,0xA31D8859),new Long(0x762FB0B4,0xD45B61F6),
	new Long(0x155BAED0,0x99047718),new Long(0x68755E4C,0x3D50BAA6),
	new Long(0xE9214E7F,0x22D8B4DF),new Long(0x2ADDBF53,0x2EAC95F4),
	new Long(0x32AE3909,0xB4BD0109),new Long(0x834DF537,0xB08E3450),
	new Long(0xFA209DA8,0x4220728D),new Long(0x9E691D9B,0x9EFE23F7),
	new Long(0x0446D288,0xC4AE8D7F),new Long(0x7B4CC524,0xE169785B),
	new Long(0x21D87F01,0x35CA1385),new Long(0xCEBB400F,0x137B8AA5),
	new Long(0x272E2B66,0x580796BE),new Long(0x36122641,0x25C2B0DE),
	new Long(0x057702BD,0xAD1EFBB2),new Long(0xD4BABB8E,0xACF84BE9),
	new Long(0x91583139,0x641BC67B),new Long(0x8BDC2DE0,0x8036E024),
	new Long(0x603C8156,0xF49F68ED),new Long(0xF7D236F7,0xDBEF5111),
	new Long(0x9727C459,0x8AD21E80),new Long(0xA08A0896,0x670A5FD7),
	new Long(0xCB4A8F43,0x09EBA9CB),new Long(0x81AF564B,0x0F7036A1),
	new Long(0xC0B99AA7,0x78199ABD),new Long(0x959F1EC8,0x3FC8E952),
	new Long(0x8C505077,0x794A81B9),new Long(0x3ACAAF8F,0x056338F0),
	new Long(0x07B43F50,0x627A6778),new Long(0x4A44AB49,0xF5ECCC77),
	new Long(0x3BC3D6E4,0xB679EE98),new Long(0x9CC0D4D1,0xCF14108C),
	new Long(0x4406C00B,0x206BC8A0),new Long(0x82A18854,0xC8D72D89),
	new Long(0x67E366B3,0x5C3C432C),new Long(0xB923DD61,0x102B37F2),
	new Long(0x56AB2779,0xD884271D),new Long(0xBE83E1B0,0xFF1525AF),
	new Long(0xFB7C65D4,0x217E49A9),new Long(0x6BDBE0E7,0x6D48E7D4),
	new Long(0x08DF8287,0x45D9179E),new Long(0x22EA6A9A,0xDD53BD34),
	new Long(0xE36E141C,0x5622200A),new Long(0x7F805D1B,0x8CB750EE),
	new Long(0xAFE5C7A5,0x9F58E837),new Long(0xE27F996A,0x4FB1C23C),
	new Long(0xD3867DFB,0x0775F0D0),new Long(0xD0E673DE,0x6E88891A),
	new Long(0x123AEB9E,0xAFB86C25),new Long(0x30F1D5D5,0xC145B895),
	new Long(0xBB434A2D,0xEE7269E7),new Long(0x78CB67EC,0xF931FA38),
	new Long(0xF33B0372,0x323BBF9C),new Long(0x52D66336,0xFB279C74),
	new Long(0x505F33AC,0x0AFB4EAA),new Long(0xE8A5CD99,0xA2CCE187),
	new Long(0x53497480,0x1E2D30BB),new Long(0x8D2D5711,0xD5876D90),
	new Long(0x1F1A4128,0x91BC038E),new Long(0xD6E2E71D,0x82E56648),
	new Long(0x74036C3A,0x497732B7),new Long(0x89B67ED9,0x6361F5AB),
	new Long(0xFFED95D8,0xF1EA02A2),new Long(0xE72B3BD6,0x1464D43D),
	new Long(0xA6300F17,0x0BDC4820),new Long(0xEBC18760,0xED78A77A),
];

Tiger.t2 = [
	new Long(0xE6A6BE5A,0x05A12138),new Long(0xB5A122A5,0xB4F87C98),
	new Long(0x563C6089,0x140B6990),new Long(0x4C46CB2E,0x391F5DD5),
	new Long(0xD932ADDB,0xC9B79434),new Long(0x08EA70E4,0x2015AFF5),
	new Long(0xD765A667,0x3E478CF1),new Long(0xC4FB757E,0xAB278D99),
	new Long(0xDF11C686,0x2D6E0692),new Long(0xDDEB84F1,0x0D7F3B16),
	new Long(0x6F2EF604,0xA665EA04),new Long(0x4A8E0F0F,0xF0E0DFB3),
	new Long(0xA5EDEEF8,0x3DBCBA51),new Long(0xFC4F0A2A,0x0EA4371E),
	new Long(0xE83E1DA8,0x5CB38429),new Long(0xDC8FF882,0xBA1B1CE2),
	new Long(0xCD45505E,0x8353E80D),new Long(0x18D19A00,0xD4DB0717),
	new Long(0x34A0CFED,0xA5F38101),new Long(0x0BE77E51,0x8887CAF2),
	new Long(0x1E341438,0xB3C45136),new Long(0xE05797F4,0x9089CCF9),
	new Long(0xFFD23F9D,0xF2591D14),new Long(0x543DDA22,0x8595C5CD),
	new Long(0x661F81FD,0x99052A33),new Long(0x8736E641,0xDB0F7B76),
	new Long(0x15227725,0x418E5307),new Long(0xE25F7F46,0x162EB2FA),
	new Long(0x48A8B212,0x6C13D9FE),new Long(0xAFDC5417,0x92E76EEA),
	new Long(0x03D912BF,0xC6D1898F),new Long(0x31B1AAFA,0x1B83F51B),
	new Long(0xF1AC2796,0xE42AB7D9),new Long(0x40A3A7D7,0xFCD2EBAC),
	new Long(0x1056136D,0x0AFBBCC5),new Long(0x7889E1DD,0x9A6D0C85),
	new Long(0xD3352578,0x2A7974AA),new Long(0xA7E25D09,0x078AC09B),
	new Long(0xBD4138B3,0xEAC6EDD0),new Long(0x920ABFBE,0x71EB9E70),
	new Long(0xA2A5D0F5,0x4FC2625C),new Long(0xC054E36B,0x0B1290A3),
	new Long(0xF6DD59FF,0x62FE932B),new Long(0x35373545,0x11A8AC7D),
	new Long(0xCA845E91,0x72FADCD4),new Long(0x84F82B60,0x329D20DC),
	new Long(0x79C62CE1,0xCD672F18),new Long(0x8B09A2AD,0xD124642C),
	new Long(0xD0C1E96A,0x19D9E726),new Long(0x5A786A9B,0x4BA9500C),
	new Long(0x0E020336,0x634C43F3),new Long(0xC17B474A,0xEB66D822),
	new Long(0x6A731AE3,0xEC9BAAC2),new Long(0x8226667A,0xE0840258),
	new Long(0x67D45676,0x91CAECA5),new Long(0x1D94155C,0x4875ADB5),
	new Long(0x6D00FD98,0x5B813FDF),new Long(0x51286EFC,0xB774CD06),
	new Long(0x5E883447,0x1FA744AF),new Long(0xF72CA0AE,0xE761AE2E),
	new Long(0xBE40E4CD,0xAEE8E09A),new Long(0xE9970BBB,0x5118F665),
	new Long(0x726E4BEB,0x33DF1964),new Long(0x703B0007,0x29199762),
	new Long(0x4631D816,0xF5EF30A7),new Long(0xB880B5B5,0x1504A6BE),
	new Long(0x641793C3,0x7ED84B6C),new Long(0x7B21ED77,0xF6E97D96),
	new Long(0x77630631,0x2EF96B73),new Long(0xAE528948,0xE86FF3F4),
	new Long(0x53DBD7F2,0x86A3F8F8),new Long(0x16CADCE7,0x4CFC1063),
	new Long(0x005C19BD,0xFA52C6DD),new Long(0x68868F5D,0x64D46AD3),
	new Long(0x3A9D512C,0xCF1E186A),new Long(0x367E62C2,0x385660AE),
	new Long(0xE359E7EA,0x77DCB1D7),new Long(0x526C0773,0x749ABE6E),
	new Long(0x735AE5F9,0xD09F734B),new Long(0x493FC7CC,0x8A558BA8),
	new Long(0xB0B9C153,0x3041AB45),new Long(0x321958BA,0x470A59BD),
	new Long(0x852DB00B,0x5F46C393),new Long(0x91209B2B,0xD336B0E5),
	new Long(0x6E604F7D,0x659EF19F),new Long(0xB99A8AE2,0x782CCB24),
	new Long(0xCCF52AB6,0xC814C4C7),new Long(0x4727D9AF,0xBE11727B),
	new Long(0x7E950D0C,0x0121B34D),new Long(0x756F4356,0x70AD471F),
	new Long(0xF5ADD442,0x615A6849),new Long(0x4E87E099,0x80B9957A),
	new Long(0x2ACFA1DF,0x50AEE355),new Long(0xD898263A,0xFD2FD556),
	new Long(0xC8F4924D,0xD80C8FD6),new Long(0xCF99CA3D,0x754A173A),
	new Long(0xFE477BAC,0xAF91BF3C),new Long(0xED5371F6,0xD690C12D),
	new Long(0x831A5C28,0x5E687094),new Long(0xC5D3C90A,0x3708A0A4),
	new Long(0x0F7F9037,0x17D06580),new Long(0x19F9BB13,0xB8FDF27F),
	new Long(0xB1BD6F1B,0x4D502843),new Long(0x1C761BA3,0x8FFF4012),
	new Long(0x0D1530C4,0xE2E21F3B),new Long(0x8943CE69,0xA7372C8A),
	new Long(0xE5184E11,0xFEB5CE66),new Long(0x618BDB80,0xBD736621),
	new Long(0x7D29BAD6,0x8B574D0B),new Long(0x81BB613E,0x25E6FE5B),
	new Long(0x071C9C10,0xBC07913F),new Long(0xC7BEEB79,0x09AC2D97),
	new Long(0xC3E58D35,0x3BC5D757),new Long(0xEB017892,0xF38F61E8),
	new Long(0xD4EFFB9C,0x9B1CC21A),new Long(0x99727D26,0xF494F7AB),
	new Long(0xA3E063A2,0x956B3E03),new Long(0x9D4A8B9A,0x4AA09C30),
	new Long(0x3F6AB7D5,0x00090FB4),new Long(0x9CC0F2A0,0x57268AC0),
	new Long(0x3DEE9D2D,0xEDBF42D1),new Long(0x330F49C8,0x7960A972),
	new Long(0xC6B27202,0x87421B41),new Long(0x0AC59EC0,0x7C00369C),
	new Long(0xEF4EAC49,0xCB353425),new Long(0xF450244E,0xEF0129D8),
	new Long(0x8ACC46E5,0xCAF4DEB6),new Long(0x2FFEAB63,0x989263F7),
	new Long(0x8F7CB9FE,0x5D7A4578),new Long(0x5BD8F764,0x4E634635),
	new Long(0x427A7315,0xBF2DC900),new Long(0x17D0C4AA,0x2125261C),
	new Long(0x3992486C,0x93518E50),new Long(0xB4CBFEE0,0xA2D7D4C3),
	new Long(0x7C75D620,0x2C5DDD8D),new Long(0xDBC295D8,0xE35B6C61),
	new Long(0x60B369D3,0x02032B19),new Long(0xCE42685F,0xDCE44132),
	new Long(0x06F3DDB9,0xDDF65610),new Long(0x8EA4D21D,0xB5E148F0),
	new Long(0x20B0FCE6,0x2FCD496F),new Long(0x2C1B9123,0x58B0EE31),
	new Long(0xB28317B8,0x18F5A308),new Long(0xA89C1E18,0x9CA6D2CF),
	new Long(0x0C6B1857,0x6AAADBC8),new Long(0xB65DEAA9,0x1299FAE3),
	new Long(0xFB2B794B,0x7F1027E7),new Long(0x04E4317F,0x443B5BEB),
	new Long(0x4B852D32,0x5939D0A6),new Long(0xD5AE6BEE,0xFB207FFC),
	new Long(0x309682B2,0x81C7D374),new Long(0xBAE309A1,0x94C3B475),
	new Long(0x8CC3F97B,0x13B49F05),new Long(0x98A9422F,0xF8293967),
	new Long(0x244B16B0,0x1076FF7C),new Long(0xF8BF571C,0x663D67EE),
	new Long(0x1F0D6758,0xEEE30DA1),new Long(0xC9B611D9,0x7ADEB9B7),
	new Long(0xB7AFD588,0x7B6C57A2),new Long(0x6290AE84,0x6B984FE1),
	new Long(0x94DF4CDE,0xACC1A5FD),new Long(0x058A5BD1,0xC5483AFF),
	new Long(0x63166CC1,0x42BA3C37),new Long(0x8DB8526E,0xB2F76F40),
	new Long(0xE1088003,0x6F0D6D4E),new Long(0x9E0523C9,0x971D311D),
	new Long(0x45EC2824,0xCC7CD691),new Long(0x575B8359,0xE62382C9),
	new Long(0xFA9E400D,0xC4889995),new Long(0xD1823ECB,0x45721568),
	new Long(0xDAFD983B,0x8206082F),new Long(0xAA7D2908,0x2386A8CB),
	new Long(0x269FCD44,0x03B87588),new Long(0x1B91F5F7,0x28BDD1E0),
	new Long(0xE4669F39,0x040201F6),new Long(0x7A1D7C21,0x8CF04ADE),
	new Long(0x65623C29,0xD79CE5CE),new Long(0x23684490,0x96C00BB1),
	new Long(0xAB9BF187,0x9DA503BA),new Long(0xBC23ECB1,0xA458058E),
	new Long(0x9A58DF01,0xBB401ECC),new Long(0xA070E868,0xA85F143D),
	new Long(0x4FF18830,0x7DF2239E),new Long(0x14D565B4,0x1A641183),
	new Long(0xEE133374,0x52701602),new Long(0x950E3DCF,0x3F285E09),
	new Long(0x59930254,0xB9C80953),new Long(0x3BF29940,0x8930DA6D),
	new Long(0xA955943F,0x53691387),new Long(0xA15EDECA,0xA9CB8784),
	new Long(0x29142127,0x352BE9A0),new Long(0x76F0371F,0xFF4E7AFB),
	new Long(0x0239F450,0x274F2228),new Long(0xBB073AF0,0x1D5E868B),
	new Long(0xBFC80571,0xC10E96C1),new Long(0xD2670885,0x68222E23),
	new Long(0x9671A3D4,0x8E80B5B0),new Long(0x55B5D38A,0xE193BB81),
	new Long(0x693AE2D0,0xA18B04B8),new Long(0x5C48B4EC,0xADD5335F),
	new Long(0xFD743B19,0x4916A1CA),new Long(0x25770181,0x34BE98C4),
	new Long(0xE77987E8,0x3C54A4AD),new Long(0x28E11014,0xDA33E1B9),
	new Long(0x270CC59E,0x226AA213),new Long(0x71495F75,0x6D1A5F60),
	new Long(0x9BE853FB,0x60AFEF77),new Long(0xADC786A7,0xF7443DBF),
	new Long(0x09044561,0x73B29A82),new Long(0x58BC7A66,0xC232BD5E),
	new Long(0xF306558C,0x673AC8B2),new Long(0x41F639C6,0xB6C9772A),
	new Long(0x216DEFE9,0x9FDA35DA),new Long(0x11640CC7,0x1C7BE615),
	new Long(0x93C43694,0x565C5527),new Long(0xEA038E62,0x46777839),
	new Long(0xF9ABF3CE,0x5A3E2469),new Long(0x741E768D,0x0FD312D2),
	new Long(0x0144B883,0xCED652C6),new Long(0xC20B5A5B,0xA33F8552),
	new Long(0x1AE69633,0xC3435A9D),new Long(0x97A28CA4,0x088CFDEC),
	new Long(0x8824A43C,0x1E96F420),new Long(0x37612FA6,0x6EEEA746),
	new Long(0x6B4CB165,0xF9CF0E5A),new Long(0x43AA1C06,0xA0ABFB4A),
	new Long(0x7F4DC26F,0xF162796B),new Long(0x6CBACC8E,0x54ED9B0F),
	new Long(0xA6B7FFEF,0xD2BB253E),new Long(0x2E25BC95,0xB0A29D4F),
	new Long(0x86D6A58B,0xDEF1388C),new Long(0xDED74AC5,0x76B6F054),
	new Long(0x8030BDBC,0x2B45805D),new Long(0x3C81AF70,0xE94D9289),
	new Long(0x3EFF6DDA,0x9E3100DB),new Long(0xB38DC39F,0xDFCC8847),
	new Long(0x12388552,0x8D17B87E),new Long(0xF2DA0ED2,0x40B1B642),
	new Long(0x44CEFADC,0xD54BF9A9),new Long(0x1312200E,0x433C7EE6),
	new Long(0x9FFCC84F,0x3A78C748),new Long(0xF0CD1F72,0x248576BB),
	new Long(0xEC697405,0x3638CFE4),new Long(0x2BA7B67C,0x0CEC4E4C),
	new Long(0xAC2F4DF3,0xE5CE32ED),new Long(0xCB33D143,0x26EA4C11),
	new Long(0xA4E9044C,0xC77E58BC),new Long(0x5F513293,0xD934FCEF),
	new Long(0x5DC96455,0x06E55444),new Long(0x50DE418F,0x317DE40A),
	new Long(0x388CB31A,0x69DDE259),new Long(0x2DB4A834,0x55820A86),
	new Long(0x9010A91E,0x84711AE9),new Long(0x4DF7F0B7,0xB1498371),
	new Long(0xD62A2EAB,0xC0977179),new Long(0x22FAC097,0xAA8D5C0E),
];

Tiger.t3 = [
	new Long(0xF49FCC2F,0xF1DAF39B),new Long(0x487FD5C6,0x6FF29281),
	new Long(0xE8A30667,0xFCDCA83F),new Long(0x2C9B4BE3,0xD2FCCE63),
	new Long(0xDA3FF74B,0x93FBBBC2),new Long(0x2FA165D2,0xFE70BA66),
	new Long(0xA103E279,0x970E93D4),new Long(0xBECDEC77,0xB0E45E71),
	new Long(0xCFB41E72,0x3985E497),new Long(0xB70AAA02,0x5EF75017),
	new Long(0xD42309F0,0x3840B8E0),new Long(0x8EFC1AD0,0x35898579),
	new Long(0x96C6920B,0xE2B2ABC5),new Long(0x66AF4163,0x375A9172),
	new Long(0x2174ABDC,0xCA7127FB),new Long(0xB33CCEA6,0x4A72FF41),
	new Long(0xF04A4933,0x083066A5),new Long(0x8D970ACD,0xD7289AF5),
	new Long(0x8F96E8E0,0x31C8C25E),new Long(0xF3FEC022,0x76875D47),
	new Long(0xEC7BF310,0x056190DD),new Long(0xF5ADB0AE,0xBB0F1491),
	new Long(0x9B50F885,0x0FD58892),new Long(0x49754883,0x58B74DE8),
	new Long(0xA3354FF6,0x91531C61),new Long(0x0702BBE4,0x81D2C6EE),
	new Long(0x89FB2405,0x7DEDED98),new Long(0xAC307513,0x8596E902),
	new Long(0x1D2D3580,0x172772ED),new Long(0xEB738FC2,0x8E6BC30D),
	new Long(0x5854EF8F,0x63044326),new Long(0x9E5C5232,0x5ADD3BBE),
	new Long(0x90AA53CF,0x325C4623),new Long(0xC1D24D51,0x349DD067),
	new Long(0x2051CFEE,0xA69EA624),new Long(0x13220F0A,0x862E7E4F),
	new Long(0xCE393994,0x04E04864),new Long(0xD9C42CA4,0x7086FCB7),
	new Long(0x685AD223,0x8A03E7CC),new Long(0x066484B2,0xAB2FF1DB),
	new Long(0xFE9D5D70,0xEFBF79EC),new Long(0x5B13B9DD,0x9C481854),
	new Long(0x15F0D475,0xED1509AD),new Long(0x0BEBCD06,0x0EC79851),
	new Long(0xD58C6791,0x183AB7F8),new Long(0xD1187C50,0x52F3EEE4),
	new Long(0xC95D1192,0xE54E82FF),new Long(0x86EEA14C,0xB9AC6CA2),
	new Long(0x3485BEB1,0x53677D5D),new Long(0xDD191D78,0x1F8C492A),
	new Long(0xF60866BA,0xA784EBF9),new Long(0x518F643B,0xA2D08C74),
	new Long(0x8852E956,0xE1087C22),new Long(0xA768CB8D,0xC410AE8D),
	new Long(0x38047726,0xBFEC8E1A),new Long(0xA67738B4,0xCD3B45AA),
	new Long(0xAD16691C,0xEC0DDE19),new Long(0xC6D43193,0x80462E07),
	new Long(0xC5A5876D,0x0BA61938),new Long(0x16B9FA1F,0xA58FD840),
	new Long(0x188AB117,0x3CA74F18),new Long(0xABDA2F98,0xC99C021F),
	new Long(0x3E0580AB,0x134AE816),new Long(0x5F3B05B7,0x73645ABB),
	new Long(0x2501A2BE,0x5575F2F6),new Long(0x1B2F7400,0x4E7E8BA9),
	new Long(0x1CD75803,0x71E8D953),new Long(0x7F6ED895,0x62764E30),
	new Long(0xB15926FF,0x596F003D),new Long(0x9F65293D,0xA8C5D6B9),
	new Long(0x6ECEF04D,0xD690F84C),new Long(0x4782275F,0xFF33AF88),
	new Long(0xE4143308,0x3F820801),new Long(0xFD0DFE40,0x9A1AF9B5),
	new Long(0x4325A334,0x2CDB396B),new Long(0x8AE77E62,0xB301B252),
	new Long(0xC36F9E9F,0x6655615A),new Long(0x85455A2D,0x92D32C09),
	new Long(0xF2C7DEA9,0x49477485),new Long(0x63CFB4C1,0x33A39EBA),
	new Long(0x83B040CC,0x6EBC5462),new Long(0x3B9454C8,0xFDB326B0),
	new Long(0x56F56A9E,0x87FFD78C),new Long(0x2DC2940D,0x99F42BC6),
	new Long(0x98F7DF09,0x6B096E2D),new Long(0x19A6E01E,0x3AD852BF),
	new Long(0x42A99CCB,0xDBD4B40B),new Long(0xA59998AF,0x45E9C559),
	new Long(0x366295E8,0x07D93186),new Long(0x6B48181B,0xFAA1F773),
	new Long(0x1FEC57E2,0x157A0A1D),new Long(0x4667446A,0xF6201AD5),
	new Long(0xE615EBCA,0xCFB0F075),new Long(0xB8F31F4F,0x68290778),
	new Long(0x22713ED6,0xCE22D11E),new Long(0x3057C1A7,0x2EC3C93B),
	new Long(0xCB46ACC3,0x7C3F1F2F),new Long(0xDBB893FD,0x02AAF50E),
	new Long(0x331FD92E,0x600B9FCF),new Long(0xA498F961,0x48EA3AD6),
	new Long(0xA8D8426E,0x8B6A83EA),new Long(0xA089B274,0xB7735CDC),
	new Long(0x87F6B373,0x1E524A11),new Long(0x118808E5,0xCBC96749),
	new Long(0x9906E4C7,0xB19BD394),new Long(0xAFED7F7E,0x9B24A20C),
	new Long(0x6509EADE,0xEB3644A7),new Long(0x6C1EF1D3,0xE8EF0EDE),
	new Long(0xB9C97D43,0xE9798FB4),new Long(0xA2F2D784,0x740C28A3),
	new Long(0x7B849647,0x6197566F),new Long(0x7A5BE3E6,0xB65F069D),
	new Long(0xF96330ED,0x78BE6F10),new Long(0xEEE60DE7,0x7A076A15),
	new Long(0x2B4BEE4A,0xA08B9BD0),new Long(0x6A56A63E,0xC7B8894E),
	new Long(0x02121359,0xBA34FEF4),new Long(0x4CBF99F8,0x283703FC),
	new Long(0x39807135,0x0CAF30C8),new Long(0xD0A77A89,0xF017687A),
	new Long(0xF1C1A9EB,0x9E423569),new Long(0x8C797628,0x2DEE8199),
	new Long(0x5D1737A5,0xDD1F7ABD),new Long(0x4F53433C,0x09A9FA80),
	new Long(0xFA8B0C53,0xDF7CA1D9),new Long(0x3FD9DCBC,0x886CCB77),
	new Long(0xC040917C,0xA91B4720),new Long(0x7DD00142,0xF9D1DCDF),
	new Long(0x8476FC1D,0x4F387B58),new Long(0x23F8E7C5,0xF3316503),
	new Long(0x032A2244,0xE7E37339),new Long(0x5C87A5D7,0x50F5A74B),
	new Long(0x082B4CC4,0x3698992E),new Long(0xDF917BEC,0xB858F63C),
	new Long(0x3270B8FC,0x5BF86DDA),new Long(0x10AE72BB,0x29B5DD76),
	new Long(0x576AC94E,0x7700362B),new Long(0x1AD112DA,0xC61EFB8F),
	new Long(0x691BC30E,0xC5FAA427),new Long(0xFF246311,0xCC327143),
	new Long(0x3142368E,0x30E53206),new Long(0x71380E31,0xE02CA396),
	new Long(0x958D5C96,0x0AAD76F1),new Long(0xF8D6F430,0xC16DA536),
	new Long(0xC8FFD13F,0x1BE7E1D2),new Long(0x7578AE66,0x004DDBE1),
	new Long(0x05833F01,0x067BE646),new Long(0xBB34B5AD,0x3BFE586D),
	new Long(0x095F34C9,0xA12B97F0),new Long(0x247AB645,0x25D60CA8),
	new Long(0xDCDBC6F3,0x017477D1),new Long(0x4A2E14D4,0xDECAD24D),
	new Long(0xBDB5E6D9,0xBE0A1EEB),new Long(0x2A7E70F7,0x794301AB),
	new Long(0xDEF42D8A,0x270540FD),new Long(0x01078EC0,0xA34C22C1),
	new Long(0xE5DE511A,0xF4C16387),new Long(0x7EBB3A52,0xBD9A330A),
	new Long(0x77697857,0xAA7D6435),new Long(0x004E8316,0x03AE4C32),
	new Long(0xE7A21020,0xAD78E312),new Long(0x9D41A70C,0x6AB420F2),
	new Long(0x28E06C18,0xEA1141E6),new Long(0xD2B28CBD,0x984F6B28),
	new Long(0x26B75F6C,0x446E9D83),new Long(0xBA47568C,0x4D418D7F),
	new Long(0xD80BADBF,0xE6183D8E),new Long(0x0E206D7F,0x5F166044),
	new Long(0xE258A439,0x11CBCA3E),new Long(0x723A1746,0xB21DC0BC),
	new Long(0xC7CAA854,0xF5D7CDD3),new Long(0x7CAC3288,0x3D261D9C),
	new Long(0x7690C264,0x23BA942C),new Long(0x17E55524,0x478042B8),
	new Long(0xE0BE4776,0x56A2389F),new Long(0x4D289B5E,0x67AB2DA0),
	new Long(0x44862B9C,0x8FBBFD31),new Long(0xB47CC804,0x9D141365),
	new Long(0x822C1B36,0x2B91C793),new Long(0x4EB14655,0xFB13DFD8),
	new Long(0x1ECBBA07,0x14E2A97B),new Long(0x6143459D,0x5CDE5F14),
	new Long(0x53A8FBF1,0xD5F0AC89),new Long(0x97EA04D8,0x1C5E5B00),
	new Long(0x622181A8,0xD4FDB3F3),new Long(0xE9BCD341,0x572A1208),
	new Long(0x14112586,0x43CCE58A),new Long(0x9144C5FE,0xA4C6E0A4),
	new Long(0x0D33D065,0x65CF620F),new Long(0x54A48D48,0x9F219CA1),
	new Long(0xC43E5EAC,0x6D63C821),new Long(0xA9728B3A,0x72770DAF),
	new Long(0xD7934E7B,0x20DF87EF),new Long(0xE35503B6,0x1A3E86E5),
	new Long(0xCAE321FB,0xC819D504),new Long(0x129A50B3,0xAC60BFA6),
	new Long(0xCD5E68EA,0x7E9FB6C3),new Long(0xB01C9019,0x9483B1C7),
	new Long(0x3DE93CD5,0xC295376C),new Long(0xAED52EDF,0x2AB9AD13),
	new Long(0x2E60F512,0xC0A07884),new Long(0xBC3D86A3,0xE36210C9),
	new Long(0x35269D9B,0x163951CE),new Long(0x0C7D6E2A,0xD0CDB5FA),
	new Long(0x59E86297,0xD87F5733),new Long(0x298EF221,0x898DB0E7),
	new Long(0x55000029,0xD1A5AA7E),new Long(0x8BC08AE1,0xB5061B45),
	new Long(0xC2C31C2B,0x6C92703A),new Long(0x94CC596B,0xAF25EF42),
	new Long(0x0A1D73DB,0x22540456),new Long(0x04B6A0F9,0xD9C4179A),
	new Long(0xEFFDAFA2,0xAE3D3C60),new Long(0xF7C8075B,0xB49496C4),
	new Long(0x9CC5C714,0x1D1CD4E3),new Long(0x78BD1638,0x218E5534),
	new Long(0xB2F11568,0xF850246A),new Long(0xEDFABCFA,0x9502BC29),
	new Long(0x796CE5F2,0xDA23051B),new Long(0xAAE128B0,0xDC93537C),
	new Long(0x3A493DA0,0xEE4B29AE),new Long(0xB5DF6B2C,0x416895D7),
	new Long(0xFCABBD25,0x122D7F37),new Long(0x70810B58,0x105DC4B1),
	new Long(0xE10FDD37,0xF7882A90),new Long(0x524DCAB5,0x518A3F5C),
	new Long(0x3C9E8587,0x8451255B),new Long(0x40298281,0x19BD34E2),
	new Long(0x74A05B6F,0x5D3CECCB),new Long(0xB6100215,0x42E13ECA),
	new Long(0x0FF979D1,0x2F59E2AC),new Long(0x6037DA27,0xE4F9CC50),
	new Long(0x5E92975A,0x0DF1847D),new Long(0xD66DE190,0xD3E623FE),
	new Long(0x5032D6B8,0x7B568048),new Long(0x9A36B7CE,0x8235216E),
	new Long(0x80272A7A,0x24F64B4A),new Long(0x93EFED8B,0x8C6916F7),
	new Long(0x37DDBFF4,0x4CCE1555),new Long(0x4B95DB5D,0x4B99BD25),
	new Long(0x92D3FDA1,0x69812FC0),new Long(0xFB1A4A9A,0x90660BB6),
	new Long(0x730C1969,0x46A4B9B2),new Long(0x81E289AA,0x7F49DA68),
	new Long(0x64669A0F,0x83B1A05F),new Long(0x27B3FF7D,0x9644F48B),
	new Long(0xCC6B615C,0x8DB675B3),new Long(0x674F20B9,0xBCEBBE95),
	new Long(0x6F312382,0x75655982),new Long(0x5AE48871,0x3E45CF05),
	new Long(0xBF619F99,0x54C21157),new Long(0xEABAC460,0x40A8EAE9),
	new Long(0x454C6FE9,0xF2C0C1CD),new Long(0x419CF649,0x6412691C),
	new Long(0xD3DC3BEF,0x265B0F70),new Long(0x6D0E60F5,0xC3578A9E),
];

Tiger.t4 = [
	new Long(0x5B0E6085,0x26323C55),new Long(0x1A46C1A9,0xFA1B59F5),
	new Long(0xA9E245A1,0x7C4C8FFA),new Long(0x65CA5159,0xDB2955D7),
	new Long(0x05DB0A76,0xCE35AFC2),new Long(0x81EAC77E,0xA9113D45),
	new Long(0x528EF88A,0xB6AC0A0D),new Long(0xA09EA253,0x597BE3FF),
	new Long(0x430DDFB3,0xAC48CD56),new Long(0xC4B3A67A,0xF45CE46F),
	new Long(0x4ECECFD8,0xFBE2D05E),new Long(0x3EF56F10,0xB39935F0),
	new Long(0x0B22D682,0x9CD619C6),new Long(0x17FD460A,0x74DF2069),
	new Long(0x6CF8CC8E,0x8510ED40),new Long(0xD6C824BF,0x3A6ECAA7),
	new Long(0x61243D58,0x1A817049),new Long(0x048BACB6,0xBBC163A2),
	new Long(0xD9A38AC2,0x7D44CC32),new Long(0x7FDDFF5B,0xAAF410AB),
	new Long(0xAD6D495A,0xA804824B),new Long(0xE1A6A74F,0x2D8C9F94),
	new Long(0xD4F78512,0x35DEE8E3),new Long(0xFD4B7F88,0x6540D893),
	new Long(0x247C2004,0x2AA4BFDA),new Long(0x096EA1C5,0x17D1327C),
	new Long(0xD56966B4,0x361A6685),new Long(0x277DA5C3,0x1221057D),
	new Long(0x94D59893,0xA43ACFF7),new Long(0x64F0C51C,0xCDC02281),
	new Long(0x3D33BCC4,0xFF6189DB),new Long(0xE005CB18,0x4CE66AF1),
	new Long(0xFF5CCD1D,0x1DB99BEA),new Long(0xB0B854A7,0xFE42980F),
	new Long(0x7BD46A6A,0x718D4B9F),new Long(0xD10FA8CC,0x22A5FD8C),
	new Long(0xD3148495,0x2BE4BD31),new Long(0xC7FA975F,0xCB243847),
	new Long(0x4886ED1E,0x5846C407),new Long(0x28CDDB79,0x1EB70B04),
	new Long(0xC2B00BE2,0xF573417F),new Long(0x5C959045,0x2180F877),
	new Long(0x7A6BDDFF,0xF370EB00),new Long(0xCE509E38,0xD6D9D6A4),
	new Long(0xEBEB0F00,0x647FA702),new Long(0x1DCC06CF,0x76606F06),
	new Long(0xE4D9F28B,0xA286FF0A),new Long(0xD85A305D,0xC918C262),
	new Long(0x475B1D87,0x32225F54),new Long(0x2D4FB516,0x68CCB5FE),
	new Long(0xA679B9D9,0xD72BBA20),new Long(0x53841C0D,0x912D43A5),
	new Long(0x3B7EAA48,0xBF12A4E8),new Long(0x781E0E47,0xF22F1DDF),
	new Long(0xEFF20CE6,0x0AB50973),new Long(0x20D261D1,0x9DFFB742),
	new Long(0x16A12B03,0x062A2E39),new Long(0x1960EB22,0x39650495),
	new Long(0x251C16FE,0xD50EB8B8),new Long(0x9AC0C330,0xF826016E),
	new Long(0xED152665,0x953E7671),new Long(0x02D63194,0xA6369570),
	new Long(0x5074F083,0x94B1C987),new Long(0x70BA598C,0x90B25CE1),
	new Long(0x794A1581,0x0B9742F6),new Long(0x0D5925E9,0xFCAF8C6C),
	new Long(0x3067716C,0xD868744E),new Long(0x910AB077,0xE8D7731B),
	new Long(0x6A61BBDB,0x5AC42F61),new Long(0x93513EFB,0xF0851567),
	new Long(0xF494724B,0x9E83E9D5),new Long(0xE887E198,0x5C09648D),
	new Long(0x34B1D3C6,0x75370CFD),new Long(0xDC35E433,0xBC0D255D),
	new Long(0xD0AAB842,0x34131BE0),new Long(0x08042A50,0xB48B7EAF),
	new Long(0x9997C4EE,0x44A3AB35),new Long(0x829A7B49,0x201799D0),
	new Long(0x263B8307,0xB7C54441),new Long(0x752F95F4,0xFD6A6CA6),
	new Long(0x92721740,0x2C08C6E5),new Long(0x2A8AB754,0xA795D9EE),
	new Long(0xA442F755,0x2F72943D),new Long(0x2C31334E,0x19781208),
	new Long(0x4FA98D7C,0xEAEE6291),new Long(0x55C3862F,0x665DB309),
	new Long(0xBD061017,0x5D53B1F3),new Long(0x46FE6CB8,0x40413F27),
	new Long(0x3FE03792,0xDF0CFA59),new Long(0xCFE70037,0x2EB85E8F),
	new Long(0xA7BE29E7,0xADBCE118),new Long(0xE544EE5C,0xDE8431DD),
	new Long(0x8A781B1B,0x41F1873E),new Long(0xA5C94C78,0xA0D2F0E7),
	new Long(0x39412E28,0x77B60728),new Long(0xA1265EF3,0xAFC9A62C),
	new Long(0xBCC2770C,0x6A2506C5),new Long(0x3AB66DD5,0xDCE1CE12),
	new Long(0xE65499D0,0x4A675B37),new Long(0x7D8F5234,0x81BFD216),
	new Long(0x0F6F64FC,0xEC15F389),new Long(0x74EFBE61,0x8B5B13C8),
	new Long(0xACDC82B7,0x14273E1D),new Long(0xDD40BFE0,0x03199D17),
	new Long(0x37E99257,0xE7E061F8),new Long(0xFA526269,0x04775AAA),
	new Long(0x8BBBF63A,0x463D56F9),new Long(0xF0013F15,0x43A26E64),
	new Long(0xA8307E9F,0x879EC898),new Long(0xCC4C27A4,0x150177CC),
	new Long(0x1B432F2C,0xCA1D3348),new Long(0xDE1D1F8F,0x9F6FA013),
	new Long(0x606602A0,0x47A7DDD6),new Long(0xD237AB64,0xCC1CB2C7),
	new Long(0x9B938E72,0x25FCD1D3),new Long(0xEC4E0370,0x8E0FF476),
	new Long(0xFEB2FBDA,0x3D03C12D),new Long(0xAE0BCED2,0xEE43889A),
	new Long(0x22CB8923,0xEBFB4F43),new Long(0x69360D01,0x3CF7396D),
	new Long(0x855E3602,0xD2D4E022),new Long(0x073805BA,0xD01F784C),
	new Long(0x33E17A13,0x3852F546),new Long(0xDF487405,0x8AC7B638),
	new Long(0xBA92B29C,0x678AA14A),new Long(0x0CE89FC7,0x6CFAADCD),
	new Long(0x5F9D4E09,0x08339E34),new Long(0xF1AFE929,0x1F5923B9),
	new Long(0x6E3480F6,0x0F4A265F),new Long(0xEEBF3A2A,0xB29B841C),
	new Long(0xE21938A8,0x8F91B4AD),new Long(0x57DFEFF8,0x45C6D3C3),
	new Long(0x2F006B0B,0xF62CAAF2),new Long(0x62F479EF,0x6F75EE78),
	new Long(0x11A55AD4,0x1C8916A9),new Long(0xF229D290,0x84FED453),
	new Long(0x42F1C27B,0x16B000E6),new Long(0x2B1F7674,0x9823C074),
	new Long(0x4B76ECA3,0xC2745360),new Long(0x8C98F463,0xB91691BD),
	new Long(0x14BCC93C,0xF1ADE66A),new Long(0x8885213E,0x6D458397),
	new Long(0x8E177DF0,0x274D4711),new Long(0xB49B73B5,0x503F2951),
	new Long(0x10168168,0xC3F96B6B),new Long(0x0E3D963B,0x63CAB0AE),
	new Long(0x8DFC4B56,0x55A1DB14),new Long(0xF789F135,0x6E14DE5C),
	new Long(0x683E68AF,0x4E51DAC1),new Long(0xC9A84F9D,0x8D4B0FD9),
	new Long(0x3691E03F,0x52A0F9D1),new Long(0x5ED86E46,0xE1878E80),
	new Long(0x3C711A0E,0x99D07150),new Long(0x5A0865B2,0x0C4E9310),
	new Long(0x56FBFC1F,0xE4F0682E),new Long(0xEA8D5DE3,0x105EDF9B),
	new Long(0x71ABFDB1,0x2379187A),new Long(0x2EB99DE1,0xBEE77B9C),
	new Long(0x21ECC0EA,0x33CF4523),new Long(0x59A4D752,0x1805C7A1),
	new Long(0x3896F5EB,0x56AE7C72),new Long(0xAA638F3D,0xB18F75DC),
	new Long(0x9F39358D,0xABE9808E),new Long(0xB7DEFA91,0xC00B72AC),
	new Long(0x6B5541FD,0x62492D92),new Long(0x6DC6DEE8,0xF92E4D5B),
	new Long(0x353F57AB,0xC4BEEA7E),new Long(0x735769D6,0xDA5690CE),
	new Long(0x0A234AA6,0x42391484),new Long(0xF6F95080,0x28F80D9D),
	new Long(0xB8E319A2,0x7AB3F215),new Long(0x31AD9C11,0x51341A4D),
	new Long(0x773C22A5,0x7BEF5805),new Long(0x45C7561A,0x07968633),
	new Long(0xF913DA9E,0x249DBE36),new Long(0xDA652D9B,0x78A64C68),
	new Long(0x4C27A97F,0x3BC334EF),new Long(0x76621220,0xE66B17F4),
	new Long(0x96774389,0x9ACD7D0B),new Long(0xF3EE5BCA,0xE0ED6782),
	new Long(0x409F7536,0x00C879FC),new Long(0x06D09A39,0xB5926DB6),
	new Long(0x6F83AEB0,0x317AC588),new Long(0x01E6CA4A,0x86381F21),
	new Long(0x66FF3462,0xD19F3025),new Long(0x72207C24,0xDDFD3BFB),
	new Long(0x4AF6B6D3,0xE2ECE2EB),new Long(0x9C994DBE,0xC7EA08DE),
	new Long(0x49ACE597,0xB09A8BC4),new Long(0xB38C4766,0xCF0797BA),
	new Long(0x131B9373,0xC57C2A75),new Long(0xB1822CCE,0x61931E58),
	new Long(0x9D7555B9,0x09BA1C0C),new Long(0x127FAFDD,0x937D11D2),
	new Long(0x29DA3BAD,0xC66D92E4),new Long(0xA2C1D571,0x54C2ECBC),
	new Long(0x58C5134D,0x82F6FE24),new Long(0x1C3AE351,0x5B62274F),
	new Long(0xE907C82E,0x01CB8126),new Long(0xF8ED0919,0x13E37FCB),
	new Long(0x3249D8F9,0xC80046C9),new Long(0x80CF9BED,0xE388FB63),
	new Long(0x1881539A,0x116CF19E),new Long(0x5103F3F7,0x6BD52457),
	new Long(0x15B7E6F5,0xAE47F7A8),new Long(0xDBD7C6DE,0xD47E9CCF),
	new Long(0x44E55C41,0x0228BB1A),new Long(0xB647D425,0x5EDB4E99),
	new Long(0x5D11882B,0xB8AAFC30),new Long(0xF5098BBB,0x29D3212A),
	new Long(0x8FB5EA14,0xE90296B3),new Long(0x677B9421,0x57DD025A),
	new Long(0xFB58E7C0,0xA390ACB5),new Long(0x89D3674C,0x83BD4A01),
	new Long(0x9E2DA4DF,0x4BF3B93B),new Long(0xFCC41E32,0x8CAB4829),
	new Long(0x03F38C96,0xBA582C52),new Long(0xCAD1BDBD,0x7FD85DB2),
	new Long(0xBBB442C1,0x6082AE83),new Long(0xB95FE86B,0xA5DA9AB0),
	new Long(0xB22E0467,0x3771A93F),new Long(0x845358C9,0x493152D8),
	new Long(0xBE2A4886,0x97B4541E),new Long(0x95A2DC2D,0xD38E6966),
	new Long(0xC02C11AC,0x923C852B),new Long(0x2388B199,0x0DF2A87B),
	new Long(0x7C8008FA,0x1B4F37BE),new Long(0x1F70D0C8,0x4D54E503),
	new Long(0x5490ADEC,0x7ECE57D4),new Long(0x002B3C27,0xD9063A3A),
	new Long(0x7EAEA384,0x8030A2BF),new Long(0xC602326D,0xED2003C0),
	new Long(0x83A7287D,0x69A94086),new Long(0xC57A5FCB,0x30F57A8A),
	new Long(0xB56844E4,0x79EBE779),new Long(0xA373B40F,0x05DCBCE9),
	new Long(0xD71A786E,0x88570EE2),new Long(0x879CBACD,0xBDE8F6A0),
	new Long(0x976AD1BC,0xC164A32F),new Long(0xAB21E25E,0x9666D78B),
	new Long(0x901063AA,0xE5E5C33C),new Long(0x9818B344,0x48698D90),
	new Long(0xE36487AE,0x3E1E8ABB),new Long(0xAFBDF931,0x893BDCB4),
	new Long(0x6345A0DC,0x5FBBD519),new Long(0x8628FE26,0x9B9465CA),
	new Long(0x1E5D0160,0x3F9C51EC),new Long(0x4DE44006,0xA15049B7),
	new Long(0xBF6C70E5,0xF776CBB1),new Long(0x411218F2,0xEF552BED),
	new Long(0xCB0C0708,0x705A36A3),new Long(0xE74D1475,0x4F986044),
	new Long(0xCD56D943,0x0EA8280E),new Long(0xC12591D7,0x535F5065),
	new Long(0xC83223F1,0x720AEF96),new Long(0xC3A0396F,0x7363A51F)
];

Tiger.round = function(a,b,c,x,m)
{
	var a0, b0, c0;
	c0 = Long.xor(c,x);
	a0 = Long.subtract(a,Long.xor_list([
		Tiger.t1[c0.get8(0)],Tiger.t2[c0.get8(2)],
		Tiger.t3[c0.get8(4)],Tiger.t4[c0.get8(6)]]));
	b0 = Long.add(b,Long.xor_list([
		Tiger.t4[c0.get8(1)],Tiger.t3[c0.get8(3)],
		Tiger.t2[c0.get8(5)],Tiger.t1[c0.get8(7)]]));
	// using add+shift instead gives a speedup of 1.19
	switch (m) {
	case 5:  b0 = Long.add(     Long.lshift(b0, 2), b0); break;
	case 7:  b0 = Long.subtract(Long.lshift(b0, 3), b0); break;
	case 9:  b0 = Long.add(     Long.lshift(b0, 3), b0); break;
	default: b0 = Long.multiply(b0, m);
	}
	a.n = a0.n;
	b.n = b0.n;
	c.n = c0.n;
}
Tiger.compress = function(buf,state)
{
	var a, b, c, tmpa;
	var aa, bb, cc;
	var x0, x1, x2, x3, x4, x5, x6, x7;
	var mul;
	aa = state[0];
	bb = state[1];
	cc = state[2];
	a = new Long(aa);
	b = new Long(bb);
	c = new Long(cc);
	x0 = buf[0];
	x1 = buf[1];
	x2 = buf[2];
	x3 = buf[3];
	x4 = buf[4];
	x5 = buf[5];
	x6 = buf[6];
	x7 = buf[7];
	var _a5 = new Long(0xa5a5a5a5,0xa5a5a5a5);
	var _01 = new Long(0x01234567,0x89abcdef);
	for (var i = 0; i < Tiger._NUM_PASSES; i++) {
		if (i) {
			/* 'key_schedule' */
			x0 = Long.subtract(x0,Long.xor(x7,_a5));
			x1 = Long.xor(x1,x0);
			x2 = Long.add(x2,x1);
			x3 = Long.subtract(x3,Long.xor(x2,
			    Long.lshift(Long.not(x1),19)));
			x4 = Long.xor(x4,x3);
			x5 = Long.add(x5,x4);
			x6 = Long.subtract(x6,Long.xor(x5,
			    Long.rshift(Long.not(x4),23)));
			x7 = Long.xor(x7,x6);
			x0 = Long.add(x0,x7);
			x1 = Long.subtract(x1,Long.xor(x0,
			    Long.lshift(Long.not(x7),19)));
			x2 = Long.xor(x2,x1);
			x3 = Long.add(x3,x2);
			x4 = Long.subtract(x4,Long.xor(x3,
			    Long.rshift(Long.not(x2),23)));
			x5 = Long.xor(x5,x4);
			x6 = Long.add(x6,x5);
			x7 = Long.subtract(x7,Long.xor(x6,_01));
		}

		/* 'pass' */
		switch (i) {
		case 0:		mul = 5; break;
		case 1:		mul = 7; break;
		default:	mul = 9;
		}
		Tiger.round(a, b, c, x0, mul);
		Tiger.round(b, c, a, x1, mul);
		Tiger.round(c, a, b, x2, mul);
		Tiger.round(a, b, c, x3, mul);
		Tiger.round(b, c, a, x4, mul);
		Tiger.round(c, a, b, x5, mul);
		Tiger.round(a, b, c, x6, mul);
		Tiger.round(b, c, a, x7, mul);

		tmpa = a;
		a = c;
		c = b;
		b = tmpa;
	}

	/* 'feed forward' */
	state[0] = Long.xor(a,aa);
	state[1] = Long.subtract(b,bb);
	state[2] = Long.add(c,cc);
}
