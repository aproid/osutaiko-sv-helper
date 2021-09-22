const { ipcRenderer } = require('electron');

const { __VERSION__ } = require('./src/env');

window.addEventListener('DOMContentLoaded', () => {
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

				return ret;
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

	class FileInput {
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

	class ProfileManager {
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
				const profileName = self.$input.value;
				const profileDatas = getInputDatas();

				delete profileDatas['beatmapPath'];

				self.saveProfile(profileName, profileDatas);

				updateView();
			}

			function onLoadButtonClick(e) {
				const profileName = self.$input.value;

				self.loadProfile(profileName);
			}

			function onDeleteButtonClick(e) {
				const profileName = self.$input.value;

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
			if(name !== undefined && name !== '') {
				return Storage.getAccess((storage) => {
					storage.profiles[name] = datas;
				});
			}

			return false;
		}

		loadProfile(name) {
			if(name !== undefined && name !== '') {
				return Storage.getAccess((storage) => {
					const profile = storage.profiles[name];

					setInputDatas(profile);

					return profile;
				});
			}

			return false;
		}

		deleteProfile(name) {
			if(name !== undefined && name !== '') {
				return Storage.getAccess((storage) => {
					delete storage.profiles[name];
				});
			}

			return false;
		}
	}

	addIPCTrigger('.titlebar-close', 'click', 'main:close');

	const beatmapInput = new FileInput('.file');

	const profileManager = new ProfileManager('.profile');

	const $wrap = document.querySelector('.wrap');

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
	const $optionBackup = document.getElementById('op_backup');
	const $optionIgnoreVelocity = document.getElementById('op_ignr_velocity');
	const $optionIgnoreVolume = document.getElementById('op_ignr_volume');

	const $overwriteButton = document.querySelector('.btn-overwrite');
	const $modifyButton = document.querySelector('.btn-modify');
	const $removeButton = document.querySelector('.btn-remove');
	const $backupButton = document.querySelector('.btn-backup');

	const $modeToggler = document.querySelector('.mode-toggler');

	$overwriteButton.addEventListener('click', onOverwriteClick);
	$modifyButton.addEventListener('click', onModifyClick);
	$removeButton.addEventListener('click', onRemoveClick);
	$backupButton.addEventListener('click', onBackupClick);

	$optionIgnoreVelocity.addEventListener('change', onIgnoreVelocityChange);
	$optionIgnoreVolume.addEventListener('change', onIgnoreVolumeChange);

	$modeToggler.addEventListener('click', onModeTogglerClick);

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

			_mode = mode;
		} else if(mode === 'advanced') {
			ipcRenderer.send('main:advanced');

			$wrap.classList.remove('mode-basic');
			$wrap.classList.add('mode-advanced');

			_mode = mode;
		}

		if(_mode) {
			Storage.getAccess((storage) => {
				storage.mode = _mode;
			});
		}
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
			optionBackup: d.optionBackup,
			optionIgnoreVelocity: d.optionIgnoreVelocity,
			optionIgnoreVolume: d.optionIgnoreVolume
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
			optionDense: d.optionDense,
			optionOffset: d.optionOffset,
			optionBackup: d.optionBackup,
			optionIgnoreVelocity: d.optionIgnoreVelocity,
			optionIgnoreVolume: d.optionIgnoreVolume
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
			optionBackup: d.optionBackup
		});
	}

	function onBackupClick() {
		ipcRenderer.send('main:backup');
	}

	function getInputDatas() {
		const beatmapPath = beatmapInput.value();

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
		const optionBackup = $optionBackup.checked;
		const optionIgnoreVelocity = $optionIgnoreVelocity.checked;
		const optionIgnoreVolume = $optionIgnoreVolume.checked;

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
			optionBackup,
			optionIgnoreVelocity,
			optionIgnoreVolume
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
		$optionBackup.checked = datas.optionBackup;
		$optionIgnoreVelocity.checked = datas.optionIgnoreVelocity;
		$optionIgnoreVolume.checked = datas.optionIgnoreVolume;

		$optionIgnoreVelocity.dispatchEvent(new Event('change'));
		$optionIgnoreVolume.dispatchEvent(new Event('change'));
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
		const isAdvanced = $wrap.classList.contains('mode-advanced');

		if(isBasic) setMode('advanced');
		if(isAdvanced) setMode('basic');
	}
});

function addIPCTrigger(selector, event, ipcCommand, isSync=false) {
	return document.querySelector(selector).addEventListener(event, () => ipcRenderer[isSync ? 'sendSync' : 'send'](ipcCommand));
}