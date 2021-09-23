/**
 * @jest-environment jsdom
 */

const { ipcRenderer } = require('electron');
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

jest.mock('electron', () => ({
	ipcRenderer: {
		send: jest.fn(),
		sendSync: jest.fn().mockReturnValue({
			path: require('path').join(__dirname, 'beatmap.template.osu'),
			name: 'beatmap.template.osu'
		})
	}
}));

describe('DOM Unit Test', () => {
	let $close;
	let $file;
	let $startPointTime;
	let $startPointVelocity;
	let $startPointVolume;
	let $startTimeInclude;
	let $endPointTime;
	let $endPointVelocity;
	let $endPointVolume;
	let $endTimeInclude;
	let $optionKiai;
	let $optionDense;
	let $optionOffset;
	let $optionOffsetPrecise;
	let $optionExponential;
	let $optionIgnoreVelocity;
	let $optionIgnoreVolume;
	let $optionBackup;
	let $overwriteButton;
	let $removeButton;
	let $backupButton;

	function matrix(cb) {
		const cases = {
			beatmapPath: [ undefined, [ () => $file.dispatchEvent(new Event('click')), path.join(__dirname, 'beatmap.template.osu') ] ],
			startPointTime: [ '', [ () => $startPointTime.value = '00:00:100', '00:00:100' ] ],
			startPointVelocity: [ '', [ () => $startPointVelocity.value = '1.0', '1.0' ] ],
			startPointVolume: [ '', [ () => $startPointVolume.value = '100', '100' ] ],
			startTimeInclude: [ true, [ () => $startTimeInclude.checked = false, false ] ],
			endPointTime: [ '', [ () => $endPointTime.value = '00:01:000', '00:01:000' ] ],
			endPointVelocity: [ '', [ () => $endPointVelocity.value = '2.0', '2.0' ] ],
			endPointVolume: [ '', [ () => $endPointVolume.value = '50', '50' ] ],
			endTimeInclude: [ true, [ () => $endTimeInclude.checked = false, false ] ],
			optionKiai: [ false, [ () => $optionKiai.checked = true, true ] ],
			optionDense: [ false, [ () => $optionDense.checked = true, true ] ],
			optionOffset: [ false, [ () => $optionOffset.checked = true, true ] ],
			optionOffsetPrecise: [ false, [ () => $optionOffsetPrecise.checked = true, true ] ],
			optionExponential: [ false, [ () => $optionExponential.checked = true, true ] ],
			optionIgnoreVelocity: [ false, [ () => $optionIgnoreVelocity.checked = true, true ] ],
			optionIgnoreVolume: [ false, [ () => $optionIgnoreVolume.checked = true, true ] ],
			optionBackup: [ true, [ () => $optionBackup.checked = false, false ] ]
		};

		const testParameter = Object.keys(cases).reduce((acc, k) => {
			acc[k] = cases[k][0];

			return acc;
		}, {});

		for(let i in cases) {
			const fieldCases = cases[i];

			for(let j in fieldCases) {
				const c = fieldCases[j];

				if(Array.isArray(c)) {
					c[0]();

					testParameter[i] = c[1];
				}

				cb(testParameter);
			}
		}
	}

	beforeEach(() => {
		const html = fs.readFileSync(path.join(__dirname, '../index.html')).toString();

		document.write(html);

		require('../preload');

		window.dispatchEvent(new Event('DOMContentLoaded'));

		expect(window).toBeTruthy();
		expect(document).toBeTruthy();

		$close = document.querySelector('.titlebar-close');
		$file = document.querySelector('.file-select');
		$startPointTime = document.getElementById('sp_time');
		$startPointVelocity = document.getElementById('sp_velocity');
		$startPointVolume = document.getElementById('sp_volume');
		$startTimeInclude = document.getElementById('sp_include');
		$endPointTime = document.getElementById('ep_time');
		$endPointVelocity = document.getElementById('ep_velocity');
		$endPointVolume = document.getElementById('ep_volume');
		$endTimeInclude = document.getElementById('ep_include');
		$optionKiai = document.getElementById('op_kiai');
		$optionDense = document.getElementById('op_dense');
		$optionOffset = document.getElementById('op_offset');
		$optionOffsetPrecise = document.getElementById('op_offset_precise');
		$optionExponential = document.getElementById('op_exponential');
		$optionIgnoreVelocity = document.getElementById('op_ignr_velocity');
		$optionIgnoreVolume = document.getElementById('op_ignr_volume');
		$optionBackup = document.getElementById('op_backup');
		$overwriteButton = document.querySelector('.btn-overwrite');
		$removeButton = document.querySelector('.btn-remove');
		$backupButton = document.querySelector('.btn-backup');
	});

	test('Close Button', () => {
		$close.click();

		expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:close');
	});

	test('Overwrite Button', () => {
		matrix((p) => {
			$overwriteButton.click();

			expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:overwrite', {
				beatmapPath: p.beatmapPath,
				startPointTime: p.startPointTime,
				startPointVelocity: p.startPointVelocity,
				startPointVolume: p.startPointVolume,
				startTimeInclude: p.startTimeInclude,
				endPointTime: p.endPointTime,
				endPointVelocity: p.endPointVelocity,
				endPointVolume: p.endPointVolume,
				endTimeInclude: p.endTimeInclude,
				optionKiai: p.optionKiai,
				optionDense: p.optionDense,
				optionOffset: p.optionOffset,
				optionOffsetPrecise: p.optionOffsetPrecise,
				optionExponential: p.optionExponential,
				optionIgnoreVelocity: p.optionIgnoreVelocity,
				optionIgnoreVolume: p.optionIgnoreVolume,
				optionBackup: p.optionBackup
			});
		});
	});

	test('Remove Button', () => {
		matrix((p) => {
			$removeButton.click();

			expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:remove', {
				beatmapPath: p.beatmapPath,
				startPointTime: p.startPointTime,
				startTimeInclude: p.startTimeInclude,
				endPointTime: p.endPointTime,
				endTimeInclude: p.endTimeInclude,
				optionOffset: p.optionOffset,
				optionOffsetPrecise: p.optionOffsetPrecise,
				optionBackup: p.optionBackup
			});
		});
	});

	test('Backup Button', () => {
		$backupButton.click();

		expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:backup');
	});
})