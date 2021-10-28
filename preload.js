const { ipcRenderer } = require('electron');

const { __VERSION__ } = require('./src/env');

class Storage {
	static instance;

	constructor() {
		if(this.constructor.instance)
			return this.constructor.instance;

		this._storage = {};

		if(localStorage[__VERSION__]) {
			this._storage = JSON.parse(localStorage[__VERSION__]);
		}

		this.constructor.instance = this;
	}

	save() {
		localStorage[__VERSION__] = JSON.stringify(this._storage);
	}

	clear() {
		localStorage.clear();
	}

	static getAccess(callback) {
		const storage = this.getInstance();
		const storageOriginal = JSON.stringify(storage._storage);

		const ret = callback(storage._storage);

		try {
			storage.save();

			return ret !== undefined ? JSON.parse(JSON.stringify(ret)) : ret;
		} catch(e) {
			storage._storage = JSON.parse(storageOriginal);

			localStorage[__VERSION__] = storageOriginal;

			throw e;
		}
	}

	static getInstance() {
		return new this;
	}
}

class FileUI {
	constructor(selector) {
		const self = this;

		this._value = undefined;

		this.$el = document.querySelector(selector);
		this.$label = this.$el.querySelector('.file-label');
		this.$button = this.$el.querySelector('.file-select');

		this.$el.addEventListener('drop', onDragDrop);
		this.$el.addEventListener('dragover', onDragOver);
		this.$button.addEventListener('click', onButtonClick);

		function onDragDrop(e) {
			e.preventDefault();
			e.stopPropagation();

			if(e.dataTransfer.files.length > 0) {
				const file = e.dataTransfer.files[0];

				if(file) setFile(file);
			}
		}

		function onDragOver(e) {
			e.preventDefault();
			e.stopPropagation();
		}

		function onButtonClick(e) {
			const file = ipcRenderer.sendSync('main:file');

			if(file) setFile(file);
		}

		function setFile(file) {
			self.$el.classList.add('active');
			self.$label.innerText = file.name;

			self._value = file.path;
		}
	}

	value() {
		return this._value;
	}
}

class ProfileUI {
	constructor(selector) {
		const self = this;

		this._profiles = Storage.getAccess((storage) => {
			if(storage.profiles === undefined)
				storage.profiles = {};

			return storage.profiles;
		});

		this.$el = document.querySelector(selector);
		this.$input = this.$el.querySelector('input');
		this.$select = this.$el.querySelector('select');
		this.$saveButton = this.$el.querySelector('.profile-btn-save');
		this.$loadButton = this.$el.querySelector('.profile-btn-load');
		this.$deleteButton = this.$el.querySelector('.profile-btn-delete');

		this.$select.addEventListener('change', onSelectChange);
		this.$saveButton.addEventListener('click', onSaveButtonClick);
		this.$loadButton.addEventListener('click', onLoadButtonClick);
		this.$deleteButton.addEventListener('click', onDeleteButtonClick);

		updateView();

		function onSelectChange(e) {
			self.$input.value = self.$select.value;
		}

		function onSaveButtonClick(e) {
			let profileName = self.$input.value;
			let profileDatas;

			if(profileName === undefined || profileName === '')
				return;

			if(self.onSave && typeof self.onSave === 'function')
				profileDatas = self.onSave(profileName);

			self.saveProfile(profileName, profileDatas);

			updateView();
		}

		function onLoadButtonClick(e) {
			let profileName = self.$input.value;
			let profileDatas;

			if(profileName === undefined || profileName === '')
				return;

			profileDatas = self.loadProfile(profileName);

			if(self.onLoad && typeof self.onLoad === 'function')
				self.onLoad(profileDatas);
		}

		function onDeleteButtonClick(e) {
			let profileName = self.$input.value;

			if(profileName === undefined || profileName === '')
				return;

			self.deleteProfile(profileName);

			updateView();
		}

		function updateView() {
			self.$select.innerHTML = '';

			for(let i in self._profiles) {
				const $option = document.createElement('option');

				$option.innerText = i;

				self.$select.append($option);
			}
		}
	}

	saveProfile(name, datas) {
		Storage.getAccess((storage) => storage.profiles[name] = datas);

		return this._profiles[name] = datas;
	}

	loadProfile(name) {
		return this._profiles[name];
	}

	deleteProfile(name) {
		Storage.getAccess((storage) => delete storage.profiles[name]);

		return delete this._profiles[name];
	}
}

window.addEventListener('DOMContentLoaded', () => {
	const fileUI = new FileUI('.file');
	const profileUI = new ProfileUI('.profile');

	const $wrap = document.querySelector('.wrap');

	const $closeButton = document.querySelector('.titlebar-close');

	const $startPointTime = document.getElementById('sp_time');
	const $startPointVelocity = document.getElementById('sp_velocity');
	const $startPointVolume = document.getElementById('sp_volume');
	const $startTimeInclude = document.getElementById('sp_include');

	const $endPointTime = document.getElementById('ep_time');
	const $endPointVelocity = document.getElementById('ep_velocity');
	const $endPointVolume = document.getElementById('ep_volume');
	const $endTimeInclude = document.getElementById('ep_include');

	const $optionKiai = document.getElementById('op_kiai');
	const $optionDense = document.getElementById('op_dense');
	const $optionOffset = document.getElementById('op_offset');
	const $optionOffsetPrecise = document.getElementById('op_offset_precise');
	const $optionExponential = document.getElementById('op_exponential');
	const $optionIgnoreVelocity = document.getElementById('op_ignr_velocity');
	const $optionIgnoreVolume = document.getElementById('op_ignr_volume');
	const $optionBackup = document.getElementById('op_backup');

	const $overwriteButton = document.querySelector('.btn-overwrite');
	const $modifyButton = document.querySelector('.btn-modify');
	const $removeButton = document.querySelector('.btn-remove');
	const $backupButton = document.querySelector('.btn-backup');

	const $modeToggler = document.querySelector('.mode-toggler');

	const $swapTime = document.querySelector('.swap-time');
	const $swapVelocity = document.querySelector('.swap-velocity');
	const $swapVolume = document.querySelector('.swap-volume');

	$closeButton.addEventListener('click', onCloseClick);

	$overwriteButton.addEventListener('click', onOverwriteClick);
	$modifyButton.addEventListener('click', onModifyClick);
	$removeButton.addEventListener('click', onRemoveClick);
	$backupButton.addEventListener('click', onBackupClick);

	$optionOffset.addEventListener('change', onOffsetChange);
	$optionOffsetPrecise.addEventListener('change', onOffsetPreciseChange);
	$optionIgnoreVelocity.addEventListener('change', onIgnoreVelocityChange);
	$optionIgnoreVolume.addEventListener('change', onIgnoreVolumeChange);

	$modeToggler.addEventListener('click', onModeTogglerClick);

	$swapTime.addEventListener('click', onSwapTimeButtonClick);
	$swapVelocity.addEventListener('click', onSwapVelocityButtonClick);
	$swapVolume.addEventListener('click', onSwapVolumeButtonClick);

	profileUI.onSave = getInputDatas;
	profileUI.onLoad = setInputDatas;

	Storage.getAccess((storage) => {
		if(storage.mode) {
			setMode(storage.mode);
		} else {
			setMode('basic');
		}
	});

	function setMode(mode) {
		let _mode;

		if(mode === 'basic') {
			ipcRenderer.send('main:basic');

			$wrap.classList.remove('mode-advanced');
			$wrap.classList.add('mode-basic');

			_mode = 'basic';
		} else {
			ipcRenderer.send('main:advanced');

			$wrap.classList.remove('mode-basic');
			$wrap.classList.add('mode-advanced');

			_mode = 'advanced';
		}

		Storage.getAccess((storage) => {
			storage.mode = _mode;
		});
	}

	function onCloseClick() {
		ipcRenderer.send('main:close');
	}

	function onOverwriteClick() {
		const d = getInputDatas();

		ipcRenderer.send('main:overwrite', {
			beatmapPath: d.beatmapPath,
			startPointTime: d.startPointTime,
			startPointVelocity: d.startPointVelocity,
			startPointVolume: d.startPointVolume,
			startTimeInclude: d.startTimeInclude,
			endPointTime: d.endPointTime,
			endPointVelocity: d.endPointVelocity,
			endPointVolume: d.endPointVolume,
			endTimeInclude: d.endTimeInclude,
			optionKiai: d.optionKiai,
			optionDense: d.optionDense,
			optionOffset: d.optionOffset,
			optionOffsetPrecise: d.optionOffsetPrecise,
			optionExponential: d.optionExponential,
			optionIgnoreVelocity: d.optionIgnoreVelocity,
			optionIgnoreVolume: d.optionIgnoreVolume,
			optionBackup: d.optionBackup
		});
	}

	function onModifyClick() {
		const d = getInputDatas();

		ipcRenderer.send('main:modify', {
			beatmapPath: d.beatmapPath,
			startPointTime: d.startPointTime,
			startPointVelocity: d.startPointVelocity,
			startPointVolume: d.startPointVolume,
			startTimeInclude: d.startTimeInclude,
			endPointTime: d.endPointTime,
			endPointVelocity: d.endPointVelocity,
			endPointVolume: d.endPointVolume,
			endTimeInclude: d.endTimeInclude,
			optionKiai: d.optionKiai,
			optionOffset: d.optionOffset,
			optionOffsetPrecise: d.optionOffsetPrecise,
			optionExponential: d.optionExponential,
			optionIgnoreVelocity: d.optionIgnoreVelocity,
			optionIgnoreVolume: d.optionIgnoreVolume,
			optionBackup: d.optionBackup
		});
	}

	function onRemoveClick() {
		const d = getInputDatas();

		ipcRenderer.send('main:remove', {
			beatmapPath: d.beatmapPath,
			startPointTime: d.startPointTime,
			startTimeInclude: d.startTimeInclude,
			endPointTime: d.endPointTime,
			endTimeInclude: d.endTimeInclude,
			optionOffset: d.optionOffset,
			optionOffsetPrecise: d.optionOffsetPrecise,
			optionBackup: d.optionBackup
		});
	}

	function onBackupClick() {
		ipcRenderer.send('main:backup');
	}

	function getInputDatas() {
		const beatmapPath = fileUI.value();

		const startPointTime = $startPointTime.value;
		const startPointVelocity = $startPointVelocity.value;
		const startPointVolume = $startPointVolume.value;
		const startTimeInclude = $startTimeInclude.checked;

		const endPointTime = $endPointTime.value;
		const endPointVelocity = $endPointVelocity.value;
		const endPointVolume = $endPointVolume.value;
		const endTimeInclude = $endTimeInclude.checked;

		const optionKiai = $optionKiai.checked;
		const optionDense = $optionDense.checked;
		const optionOffset = $optionOffset.checked;
		const optionOffsetPrecise = $optionOffsetPrecise.checked;
		const optionExponential = $optionExponential.checked;
		const optionIgnoreVelocity = $optionIgnoreVelocity.checked;
		const optionIgnoreVolume = $optionIgnoreVolume.checked;
		const optionBackup = $optionBackup.checked;

		return {
			beatmapPath,
			startPointTime,
			startPointVelocity,
			startPointVolume,
			startTimeInclude,
			endPointTime,
			endPointVelocity,
			endPointVolume,
			endTimeInclude,
			optionKiai,
			optionDense,
			optionOffset,
			optionOffsetPrecise,
			optionExponential,
			optionIgnoreVelocity,
			optionIgnoreVolume,
			optionBackup
		};
	}

	function setInputDatas(datas) {
		$startPointTime.value = datas.startPointTime;
		$startPointVelocity.value = datas.startPointVelocity;
		$startPointVolume.value = datas.startPointVolume;
		$startTimeInclude.checked = datas.startTimeInclude;

		$endPointTime.value = datas.endPointTime;
		$endPointVelocity.value = datas.endPointVelocity;
		$endPointVolume.value = datas.endPointVolume;
		$endTimeInclude.checked = datas.endTimeInclude;

		$optionKiai.checked = datas.optionKiai;
		$optionDense.checked = datas.optionDense;
		$optionOffset.checked = datas.optionOffset;
		$optionOffsetPrecise.checked = datas.optionOffsetPrecise;
		$optionExponential.checked = datas.optionExponential;
		$optionIgnoreVelocity.checked = datas.optionIgnoreVelocity;
		$optionIgnoreVolume.checked = datas.optionIgnoreVolume;
		$optionBackup.checked = datas.optionBackup;

		$optionIgnoreVelocity.dispatchEvent(new Event('change'));
		$optionIgnoreVolume.dispatchEvent(new Event('change'));
	}

	function onOffsetChange() {
		if(!$optionOffset.checked)
			$optionOffsetPrecise.checked = false;
	}

	function onOffsetPreciseChange() {
		if($optionOffsetPrecise.checked)
			$optionOffset.checked = true;
	}

	function onIgnoreVelocityChange() {
		$startPointVelocity.disabled = $optionIgnoreVelocity.checked;
		$endPointVelocity.disabled = $optionIgnoreVelocity.checked;

		if($optionIgnoreVelocity.checked) {
			$startPointVelocity.value = '';
			$endPointVelocity.value = '';
		}
	}

	function onIgnoreVolumeChange() {
		$startPointVolume.disabled = $optionIgnoreVolume.checked;
		$endPointVolume.disabled = $optionIgnoreVolume.checked;

		if($optionIgnoreVolume.checked) {
			$startPointVolume.value = '';
			$endPointVolume.value = '';
		}
	}

	function onModeTogglerClick() {
		const isBasic = $wrap.classList.contains('mode-basic');

		if(isBasic) {
			setMode('advanced');
		} else {
			setMode('basic');
		}
	}

	function onSwapTimeButtonClick() {
		[$startPointTime.value, $endPointTime.value] = [$endPointTime.value, $startPointTime.value];
	}

	function onSwapVelocityButtonClick() {
		[$startPointVelocity.value, $endPointVelocity.value] = [$endPointVelocity.value, $startPointVelocity.value];
	}

	function onSwapVolumeButtonClick() {
		[$startPointVolume.value, $endPointVolume.value] = [$endPointVolume.value, $startPointVolume.value];
	}
});

module.exports = {
	Storage,
	FileUI,
	ProfileUI
};