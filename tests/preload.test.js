/**
 * @jest-environment jsdom
 */

const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

const { Storage, FileUI, ProfileUI } = require('../preload');
const { __VERSION__ } = require('../src/env');

jest.mock('electron', () => ({
	ipcRenderer: {
		send: jest.fn(),
		sendSync: jest.fn()
	}
}));

jest.mock('../src/env', () => ({
	__VERSION__: 'test'
}));

let $wrap;
let $closeButton;
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
let $modifyButton;
let $removeButton;
let $backupButton;
let $modeToggler;
let $swapTime;
let $swapVelocity;
let $swapVolume;

describe('Front-End Unit Test', () => {
	describe('Storage', () => {
		let storage;

		beforeEach(() => {
			localStorage.clear();
			localStorage[__VERSION__] = JSON.stringify({ __VERSION__ });

			Storage.instance = undefined;

			storage = new Storage;
		});

		afterAll(() => {
			localStorage.clear();

			storage._storage = {};
		});

		test('Web Storage Integration', () => {
			storage = new Storage;

			expect(storage._storage).toEqual({ __VERSION__ });

			storage.clear();

			expect(localStorage[__VERSION__]).toBe(undefined);

			storage.save();

			expect(localStorage[__VERSION__]).toBe(JSON.stringify({ __VERSION__ }));

			Storage.instance = undefined;

			localStorage.clear();

			storage = new Storage;

			expect(storage._storage).toEqual({ });
		});

		test('Singleton Instantiation', () => {
			expect(storage).toBe(new Storage);
			expect(storage).toBe(Storage.instance);
			expect(storage).toBe(Storage.getInstance());
		});

		test('Data Manipulation', () => {
			let result;

			result = Storage.getAccess((storage) => {
				storage.test = __VERSION__;

				return storage.__VERSION__;
			});

			expect(result).toBe(__VERSION__);
			expect(storage._storage.test).toBe(__VERSION__);
		});

		test('Data Overflow', () => {
			let closure = () => Storage.getAccess((storage) => {
				storage.test = Array.from({ length: 1024 * 1024 * 5 }, () => '_').join('');
			});

			Storage.getAccess((storage) => {
				storage.test = __VERSION__;
			});

			expect(closure).toThrow();
			expect(storage._storage.test).toBe(__VERSION__);
		});
	});

	describe('File User Interface', () => {
		const mockFile = {
			path: path.join(__dirname, 'beatmap.template.osu'),
			name: 'beatmap.template'
		};

		let file;

		beforeEach(() => {
			let mockTemplate = `
				<div class="file">
					<div class="file-label"></div>
					<button class="file-select"></button>
				</div>
			`;

			document.write(mockTemplate);

			file = new FileUI('.file');
		});

		test('File Select', () => {
			ipcRenderer.sendSync.mockReturnValueOnce(mockFile);

			file.$button.click();

			expect(ipcRenderer.sendSync).toHaveBeenCalledWith('main:file');

			let returnValue = ipcRenderer.sendSync.mock.results.slice(-1)[0].value;

			expect(file.$el.classList.contains('active')).toBe(true);
			expect(file.$label.innerText).toBe(returnValue.name);
			expect(file._value).toBe(returnValue.path);

			file.$button.click();

			expect(file.$label.innerText).toBe(returnValue.name);
			expect(file._value).toBe(returnValue.path);
		});

		test('File Drag & Drop', () => {
			let dragEvent = new Event('dragover');
			let dropEvent = new Event('drop');

			dropEvent.dataTransfer = { files: [ mockFile ] };

			file.$el.dispatchEvent(dragEvent);
			file.$el.dispatchEvent(dropEvent);

			expect(file.$el.classList.contains('active')).toBe(true);
			expect(file.$label.innerText).toBe(mockFile.name);
			expect(file._value).toBe(mockFile.path);

			dropEvent.dataTransfer = { files: [ ] };

			file.$el.dispatchEvent(dragEvent);
			file.$el.dispatchEvent(dropEvent);

			expect(file.$label.innerText).toBe(mockFile.name);
			expect(file._value).toBe(mockFile.path);

			dropEvent.dataTransfer = { files: [ undefined ] };

			file.$el.dispatchEvent(dragEvent);
			file.$el.dispatchEvent(dropEvent);

			expect(file.$label.innerText).toBe(mockFile.name);
			expect(file._value).toBe(mockFile.path);
		});
	});

	describe('Profile User Interface', () => {
		let profile;

		beforeEach(() => {
			let mockTemplate = `
				<div class="profile">
					<input type="text">
					<select></select>
					<button class="profile-btn-save">Save</button>
					<button class="profile-btn-load">Load</button>
					<button class="profile-btn-delete">Delete</button>
				</div>
			`;

			document.write(mockTemplate);

			profile = new ProfileUI('.profile');
		});

		test('Select & Input Value Integration', () => {
			const $select = profile.$select;

			profile.$select = { value: __VERSION__ };

			$select.dispatchEvent(new Event('change'));

			expect(profile.$input.value).toBe(__VERSION__);
		});

		test('Save Button', () => {
			profile.onSave = jest.fn().mockReturnValueOnce({ __VERSION__ });

			profile.$saveButton.click();

			expect(profile.onSave).not.toHaveBeenCalled();

			profile.$input.value = 'Test Profile';
			profile.$saveButton.click();

			expect(profile.onSave).toHaveBeenCalled();
			expect(profile._profiles['Test Profile']).toEqual({ __VERSION__ });

			profile.onSave = undefined;

			profile.$saveButton.click();

			expect(profile._profiles['Test Profile']).toBe(undefined);
		});

		test('Load Button', () => {
			profile._profiles = { 'Test Profile': { __VERSION__ } };
			profile.onLoad = jest.fn();

			profile.$loadButton.click();

			expect(profile.onLoad).not.toHaveBeenCalled();

			profile.$input.value = 'Test Profile';
			profile.$loadButton.click();

			expect(profile.onLoad).toHaveBeenCalledWith({ __VERSION__ });

			profile.onLoad = undefined;

			profile.$loadButton.click();

			expect(profile._profiles['Test Profile']).toEqual({ __VERSION__ });
		});

		test('Delete Button', () => {
			profile._profiles = { 'Test Profile': { __VERSION__ } };

			profile.$deleteButton.click();

			expect(profile._profiles.hasOwnProperty('Test Profile')).toBe(true);

			profile.$input.value = 'Test Profile';
			profile.$deleteButton.click();

			expect(profile._profiles.hasOwnProperty('Test Profile')).toBe(false);
		});
	});

	describe('Main Form', () => {
		beforeEach(() => {
			render();
		});

		test('Close Button', () => {
			$closeButton.click();

			expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:close');
		});

		test('Mode Toggler', () => {
			const initialMode = $wrap.classList.contains('mode-basic') ? 'basic' : 'advanced';
			const reversedMode = initialMode === 'basic' ? 'advanced' : 'basic';

			$modeToggler.click();

			expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:' + reversedMode);
			expect($wrap.classList.contains('mode-' + initialMode)).toBe(false);
			expect($wrap.classList.contains('mode-' + reversedMode)).toBe(true);

			$modeToggler.click();

			expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:' + initialMode);
			expect($wrap.classList.contains('mode-' + reversedMode)).toBe(false);
			expect($wrap.classList.contains('mode-' + initialMode)).toBe(true);
		});

		test('-1/16 Offset & -1/12 Inclusive', () => {
			$optionOffset.click();

			expect($optionOffset.checked).toBe(true);
			expect($optionOffsetPrecise.checked).toBe(false);

			$optionOffsetPrecise.click();

			expect($optionOffset.checked).toBe(true);
			expect($optionOffsetPrecise.checked).toBe(true);

			$optionOffset.click();

			expect($optionOffset.checked).toBe(false);
			expect($optionOffsetPrecise.checked).toBe(false);

			$optionOffsetPrecise.click();

			expect($optionOffset.checked).toBe(true);
			expect($optionOffsetPrecise.checked).toBe(true);

			$optionOffsetPrecise.click();

			expect($optionOffset.checked).toBe(true);
			expect($optionOffsetPrecise.checked).toBe(false);
		});

		test('Ignore Velocity', () => {
			$startPointVelocity.value = __VERSION__;
			$endPointVelocity.value = __VERSION__;

			$optionIgnoreVelocity.click();

			expect($startPointVelocity.disabled).toBe(true);
			expect($startPointVelocity.value).toBe('');
			expect($endPointVelocity.disabled).toBe(true);
			expect($endPointVelocity.value).toBe('');

			$optionIgnoreVelocity.click();

			expect($startPointVelocity.disabled).toBe(false);
			expect($endPointVelocity.disabled).toBe(false);
		});

		test('Ignore Volume', () => {
			$startPointVolume.value = __VERSION__;
			$endPointVolume.value = __VERSION__;

			$optionIgnoreVolume.click();

			expect($startPointVolume.disabled).toBe(true);
			expect($startPointVolume.value).toBe('');
			expect($endPointVolume.disabled).toBe(true);
			expect($endPointVolume.value).toBe('');

			$optionIgnoreVolume.click();

			expect($startPointVolume.disabled).toBe(false);
			expect($endPointVolume.disabled).toBe(false);
		});

		test('Swap Button', () => {
			$startPointTime.value = '00:00:100';
			$endPointTime.value = '00:00:200';
			$swapTime.click();

			expect($startPointTime.value).toBe('00:00:200');
			expect($endPointTime.value).toBe('00:00:100');

			$startPointVelocity.value = '1';
			$endPointVelocity.value = '2';
			$swapVelocity.click();

			expect($startPointVelocity.value).toBe('2');
			expect($endPointVelocity.value).toBe('1');

			$startPointVolume.value = '100';
			$endPointVolume.value = '0';
			$swapVolume.click();

			expect($startPointVolume.value).toBe('0');
			expect($endPointVolume.value).toBe('100');
		});

		test('Overwrite Button', () => {
			matrix((p) => {
				$overwriteButton.click();

				expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:overwrite', expect.objectContaining({
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
				}));
			});
		});

		test('Modify Button', () => {
			matrix((p) => {
				$modifyButton.click();
				
				expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:modify', expect.objectContaining({
					startPointTime: p.startPointTime,
					startPointVelocity: p.startPointVelocity,
					startPointVolume: p.startPointVolume,
					startTimeInclude: p.startTimeInclude,
					endPointTime: p.endPointTime,
					endPointVelocity: p.endPointVelocity,
					endPointVolume: p.endPointVolume,
					endTimeInclude: p.endTimeInclude,
					optionKiai: p.optionKiai,
					optionOffset: p.optionOffset,
					optionOffsetPrecise: p.optionOffsetPrecise,
					optionExponential: p.optionExponential,
					optionIgnoreVelocity: p.optionIgnoreVelocity,
					optionIgnoreVolume: p.optionIgnoreVolume,
					optionBackup: p.optionBackup
				}));
			});
		});

		test('Remove Button', () => {
			matrix((p) => {
				$removeButton.click();

				expect(ipcRenderer.send).toHaveBeenLastCalledWith('main:remove', expect.objectContaining({
					startPointTime: p.startPointTime,
					startTimeInclude: p.startTimeInclude,
					endPointTime: p.endPointTime,
					endTimeInclude: p.endTimeInclude,
					optionOffset: p.optionOffset,
					optionOffsetPrecise: p.optionOffsetPrecise,
					optionBackup: p.optionBackup
				}));
			});
		});

		test('Backup Button', () => {
			$backupButton.click();

			expect(ipcRenderer.send).toHaveBeenCalledWith('main:backup');
		});
	});
});

describe('Front-End Integrated Test', () => {
	test('Storage & Profile UI', () => {
		localStorage.clear();
		localStorage[__VERSION__] = JSON.stringify({ profiles: { 'Test Profile': { __VERSION__ } } });

		Storage.instance = undefined;

		render();

		const $profileSelect = document.querySelector('.profile select');

		expect($profileSelect.children.length).toBe(1);
	});

	test('Storage & Mode', () => {
		localStorage.clear();
		localStorage[__VERSION__] = JSON.stringify({ mode: 'basic' });

		Storage.instance = undefined;

		render();

		expect($wrap.classList.contains('mode-basic')).toBe(true);
		expect($wrap.classList.contains('mode-advanced')).toBe(false);

		localStorage.clear();
		localStorage[__VERSION__] = JSON.stringify({ mode: 'advanced' });

		Storage.instance = undefined;

		render();

		expect($wrap.classList.contains('mode-basic')).toBe(false);
		expect($wrap.classList.contains('mode-advanced')).toBe(true);
	});

	test('Profile UI & Main Form', () => {
		render();

		const $profileInput = document.querySelector('.profile input');
		const $profileSaveButton = document.querySelector('.profile .profile-btn-save');
		const $profileLoadButton = document.querySelector('.profile .profile-btn-load');

		matrix((p) => {
			if(!p.optionOffset) {
				p.optionOffsetPrecise = false;
			}

			if(p.optionOffsetPrecise) {
				p.optionOffset = true;
			}

			if(p.optionIgnoreVelocity) {
				p.startPointVelocity = '';
				p.endPointVelocity = '';
			}

			if(p.optionIgnoreVolume) {
				p.startPointVolume = '';
				p.endPointVolume = '';
			}

			$profileInput.value = 'Integrated Test';
			$profileSaveButton.click();

			reset();

			$profileLoadButton.click();

			expect($startPointTime.value).toBe(p.startPointTime);
			expect($startPointVelocity.value).toBe(p.startPointVelocity);
			expect($startPointVolume.value).toBe(p.startPointVolume);
			expect($startTimeInclude.checked).toBe(p.startTimeInclude);
			expect($endPointTime.value).toBe(p.endPointTime);
			expect($endPointVelocity.value).toBe(p.endPointVelocity);
			expect($endPointVolume.value).toBe(p.endPointVolume);
			expect($endTimeInclude.checked).toBe(p.endTimeInclude);
			expect($optionKiai.checked).toBe(p.optionKiai);
			expect($optionDense.checked).toBe(p.optionDense);
			expect($optionOffset.checked).toBe(p.optionOffset);
			expect($optionOffsetPrecise.checked).toBe(p.optionOffsetPrecise);
			expect($optionExponential.checked).toBe(p.optionExponential);
			expect($optionIgnoreVelocity.checked).toBe(p.optionIgnoreVelocity);
			expect($optionIgnoreVolume.checked).toBe(p.optionIgnoreVolume);
			expect($optionBackup.checked).toBe(p.optionBackup);
		});
	});
});

function render() {
	const html = fs.readFileSync(path.join(__dirname, '../index.html')).toString();

	document.write(html);
	
	window.dispatchEvent(new Event('DOMContentLoaded'));

	$wrap = document.querySelector('.wrap');
	$closeButton = document.querySelector('.titlebar-close');
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
	$modifyButton = document.querySelector('.btn-modify');
	$removeButton = document.querySelector('.btn-remove');
	$backupButton = document.querySelector('.btn-backup');
	$modeToggler = document.querySelector('.mode-toggler');
	$swapTime = document.querySelector('.swap-time');
	$swapVelocity = document.querySelector('.swap-velocity');
	$swapVolume = document.querySelector('.swap-volume');
}

function matrix(cb) {
	const cases = {
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

			cb(JSON.parse(JSON.stringify(testParameter)));
		}
	}
}

function reset() {
	$startPointTime.value = '';
	$startPointVelocity.value = '';
	$startPointVolume.value = '';
	$startTimeInclude.checked = true;
	$endPointTime.value = '';
	$endPointVelocity.value = '';
	$endPointVolume.value = '';
	$endTimeInclude.checked = true;
	$optionKiai.checked = false;
	$optionDense.checked = false;
	$optionOffset.checked = false;
	$optionOffsetPrecise.checked = false;
	$optionExponential.checked = false;
	$optionIgnoreVelocity.checked = false;
	$optionIgnoreVolume.checked = false;
	$optionBackup.checked = true;
}