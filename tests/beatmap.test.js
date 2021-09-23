const path = require('path');
const fs = require('fs');

const { Beatmap, BeatmapManipulater, TimingPoint, HitObject } = require('../src/beatmap');

// Based on template beatmap file
const TIMING_POINT_COUNT = 17;
const TIMING_POINT_RANGE_START = 70165;
const TIMING_POINT_RANGE_END = 109242;
const TIMING_POINT_RANGE_LENGTH = 5;
const HIT_OBJECT_COUNT = 881;
const HIT_OBJECT_RANGE_START = 9959;
const HIT_OBJECT_RANGE_END = 17139;
const HIT_OBJECT_RANGE_LENGTH = 38;
const ISOLATE_OFFSET_TIME = 7972; // Extracted from map editor
const ISOLATE_RANGE_START = 8011;
const ISOLATE_RANGE_END = 69857;
const ISOLATE_RANGE_LENGTH = 390;
const ISOLATE_PREVIOUS_BEAT_LENGTH = -83.333333333333;
const ISOLATE_PREVIOUS_VOLUME = 75;

function range(cb) {
	const cases = [
		{ includingStartTime: true, includingEndTime: true },
		{ includingStartTime: true, includingEndTime: false },
		{ includingStartTime: false, includingEndTime: true },
		{ includingStartTime: false, includingEndTime: false }
	];

	for(let i in cases) {
		cb(cases[i].includingStartTime, cases[i].includingEndTime);
	}
}

describe('Beatmap Module Unit Test', () => {
	test('Timing Point', () => {
		const timingPoint = TimingPoint.fromArray('1242,307.692307692308,4,1,0,70,1,0'.split(','));

		expect(timingPoint).toBeInstanceOf(TimingPoint);
		expect(timingPoint.time).toBe(1242);
		expect(timingPoint.beatLength).toBe(307.692307692308);
		expect(timingPoint.meter).toBe(4);
		expect(timingPoint.sampleSet).toBe(1);
		expect(timingPoint.sampleIndex).toBe(0);
		expect(timingPoint.volume).toBe(70);
		expect(timingPoint.uninherited).toBe(1);
		expect(timingPoint.effects).toBe(0);
		expect(timingPoint.toString()).toBe('1242,307.692307692308,4,1,0,70,1,0');
	});

	test('Hit Object', () => {
		const hitObject = HitObject.fromArray('256,192,119190,1,8,0:0:0:0:'.split(','));

		expect(hitObject).toBeInstanceOf(HitObject);
		expect(hitObject.x).toBe(256);
		expect(hitObject.y).toBe(192);
		expect(hitObject.time).toBe(119190);
		expect(hitObject.type).toBe(1);
		expect(hitObject.hitSound).toBe(8);
		expect(hitObject.extra).toBe('0:0:0:0:');
		expect(hitObject.isNote()).toBe(true);
		expect(hitObject.isBigNote()).toBe(false);
		expect(hitObject.isDon()).toBe(false);
		expect(hitObject.isKat()).toBe(true);
		expect(hitObject.isSpinner()).toBe(false);
		expect(hitObject.isSlider()).toBe(false);
		expect(hitObject.toString()).toBe('256,192,119190,1,8,0:0:0:0:');
	});

	describe('Beatmap', () => {
		let testBeatmapPath = path.join(__dirname, './beatmap.test.osu');
		let testBeatmap;

		let templateBeatmapPath = path.join(__dirname, './beatmap.template.osu');
		let templateBeatmapRawString;

		afterAll(() => {
			fs.rmSync(testBeatmapPath);
		});

		describe('Parse Beatmap', () => {
			test('Read Beatmap Template', () => {
				templateBeatmapRawString = fs.readFileSync(templateBeatmapPath).toString();
			});

			test('Make Test Beatmap', () => {
				fs.writeFileSync(testBeatmapPath, templateBeatmapRawString);
			});

			test('Parse Test Beatmap', () => {
				testBeatmap = new Beatmap(testBeatmapPath);

				expect(testBeatmap).toBeInstanceOf(Beatmap);
				expect(testBeatmap.path).toBe(testBeatmapPath);
				expect(testBeatmap.rawString).toBe(templateBeatmapRawString);
				expect(testBeatmap.timingPoints.length).toBe(TIMING_POINT_COUNT);
				expect(testBeatmap.hitObjects.length).toBe(HIT_OBJECT_COUNT);
				expect(testBeatmap.timingPoints[0]).toBeInstanceOf(TimingPoint);
				expect(testBeatmap.hitObjects[0]).toBeInstanceOf(HitObject);
				expect(testBeatmap.timingPointStartIndex < testBeatmap.timingPointEndIndex).toBe(true);
				expect(testBeatmap.hitObjectStartIndex < testBeatmap.hitObjectEndIndex).toBe(true);
			});

			test('Get Timing Points In Range', () => {
				range((includingStartTime, includingEndTime) => {
					const timingPoints = testBeatmap.getTimingPointsInRange(TIMING_POINT_RANGE_START, TIMING_POINT_RANGE_END, includingStartTime, includingEndTime);

					expect(timingPoints).toBeInstanceOf(Array);

					if(includingStartTime && includingEndTime) expect(timingPoints.length).toBe(TIMING_POINT_RANGE_LENGTH);
					else if(includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(TIMING_POINT_RANGE_LENGTH - 1);
					else if(!includingStartTime && includingEndTime) expect(timingPoints.length).toBe(TIMING_POINT_RANGE_LENGTH - 1);
					else if(!includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(TIMING_POINT_RANGE_LENGTH - 2);

					expect(timingPoints[0]).toBeInstanceOf(TimingPoint);
				});
			});

			test('Get Hit Objects In Range', () => {
				range((includingStartTime, includingEndTime) => {
					const hitObjects = testBeatmap.getHitObjectsInRange(HIT_OBJECT_RANGE_START, HIT_OBJECT_RANGE_END, includingStartTime, includingEndTime);

					expect(hitObjects).toBeInstanceOf(Array);

					if(includingStartTime && includingEndTime) expect(hitObjects.length).toBe(HIT_OBJECT_RANGE_LENGTH);
					else if(includingStartTime && !includingEndTime) expect(hitObjects.length).toBe(HIT_OBJECT_RANGE_LENGTH - 1);
					else if(!includingStartTime && includingEndTime) expect(hitObjects.length).toBe(HIT_OBJECT_RANGE_LENGTH - 1);
					else if(!includingStartTime && !includingEndTime) expect(hitObjects.length).toBe(HIT_OBJECT_RANGE_LENGTH - 2);

					expect(hitObjects[0]).toBeInstanceOf(HitObject);
				});
			});

			test('Get Timing Points Out Range', () => {
				range((includingStartTime, includingEndTime) => {
					const timingPoints = testBeatmap.getTimingPointsOutRange(TIMING_POINT_RANGE_START, TIMING_POINT_RANGE_END, includingStartTime, includingEndTime);

					expect(timingPoints).toBeInstanceOf(Array);

					if(includingStartTime && includingEndTime) expect(timingPoints.length).toBe(TIMING_POINT_COUNT - TIMING_POINT_RANGE_LENGTH);
					else if(includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(TIMING_POINT_COUNT - TIMING_POINT_RANGE_LENGTH + 1);
					else if(!includingStartTime && includingEndTime) expect(timingPoints.length).toBe(TIMING_POINT_COUNT - TIMING_POINT_RANGE_LENGTH + 1);
					else if(!includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(TIMING_POINT_COUNT - TIMING_POINT_RANGE_LENGTH + 2);

					expect(timingPoints[0]).toBeInstanceOf(TimingPoint);
				});
			});

			test('Get Hit Objects Out Range', () => {
				range((includingStartTime, includingEndTime) => {
					const hitObjects = testBeatmap.getHitObjectsOutRange(HIT_OBJECT_RANGE_START, HIT_OBJECT_RANGE_END, includingStartTime, includingEndTime);

					expect(hitObjects).toBeInstanceOf(Array);

					if(includingStartTime && includingEndTime) expect(hitObjects.length).toBe(HIT_OBJECT_COUNT - HIT_OBJECT_RANGE_LENGTH);
					else if(includingStartTime && !includingEndTime) expect(hitObjects.length).toBe(HIT_OBJECT_COUNT - HIT_OBJECT_RANGE_LENGTH + 1);
					else if(!includingStartTime && includingEndTime) expect(hitObjects.length).toBe(HIT_OBJECT_COUNT - HIT_OBJECT_RANGE_LENGTH + 1);
					else if(!includingStartTime && !includingEndTime) expect(hitObjects.length).toBe(HIT_OBJECT_COUNT - HIT_OBJECT_RANGE_LENGTH + 2);

					expect(hitObjects[0]).toBeInstanceOf(HitObject);
				});
			});
		});

		describe('Basic Beatmap Manipulation', () => {
			afterAll(() => {
				fs.writeFileSync(testBeatmapPath, templateBeatmapRawString);

				testBeatmap = new Beatmap(testBeatmapPath);
			});

			test('Add Single Timing Point', () => {
				const newTimingPoint = new TimingPoint();

				testBeatmap.appendTimingPoint(newTimingPoint);

				expect(testBeatmap.timingPoints.length).toBe(TIMING_POINT_COUNT + 1);
				expect(testBeatmap.timingPoints.filter(tp => tp.time === 0).pop()).toBeInstanceOf(TimingPoint);
			});

			test('Add Multiple Timing Point', () => {
				const newTimingPoints = Array.from({ length: 5 }, (v, i) => new TimingPoint(i + 1));

				testBeatmap.appendTimingPoints(newTimingPoints);

				expect(testBeatmap.timingPoints.length).toBe(TIMING_POINT_COUNT + 1 + 5);
				expect(testBeatmap.timingPoints.filter(tp => 0 < tp.time && tp.time <= 5).length).toBe(5);
			});

			test('Replace Timing Point Section', () => {
				const newTimingPoints = Array.from({ length: 5 }, (v, i) => new TimingPoint(i + 1));

				testBeatmap.replaceTimingPoints(newTimingPoints);

				expect(testBeatmap.timingPoints.length).toBe(5);
				expect(testBeatmap.timingPoints.filter(tp => tp.time <= 5).length).toBe(5);
			});

			test('Save Test Beatmap', () => {
				testBeatmap.write();

				const savedRawString = fs.readFileSync(testBeatmapPath).toString();

				expect(savedRawString).not.toBe(templateBeatmapRawString);
				expect(savedRawString).toBe(testBeatmap.rawString);
			});
		});

		describe('Advanced Beatmap Manipulation', () => {
			let backupPath = BeatmapManipulater.getBackupPath();
			let beatmapManipulater;

			function resetBeatmap() {
				fs.writeFileSync(testBeatmapPath, templateBeatmapRawString);

				beatmapManipulater = new BeatmapManipulater(testBeatmapPath);
			}

			beforeAll(() => {
				resetBeatmap();
			});

			afterAll(() => {
				fs.rmdirSync(backupPath, { recursive: true });
			});

			test('Backup Beatmap', () => {
				const testBackupPath = path.join(backupPath, '/beatmap.test');

				beatmapManipulater.backup();

				expect(fs.existsSync(backupPath)).toBe(true);
				expect(fs.existsSync(testBackupPath)).toBe(true);

				const backupFiles = fs.readdirSync(testBackupPath);

				expect(backupFiles.length).toBe(1);
				expect(fs.readFileSync(path.join(testBackupPath, backupFiles.pop())).toString()).toBe(beatmapManipulater.beatmap.rawString);
			});

			test('Get Time Interpolated Value', () => {
				const value = 25 + Math.PI;
				const start = 10;
				const end = 50;
				const min = 1.5;
				const max = 2.0;

				expect(BeatmapManipulater.getTimeInterpolatedValue(value, start, end, min, max)).toBe(min + (max - min) * ((value - start) / (end - start)));
				expect(BeatmapManipulater.getTimeInterpolatedValue(value, end, start, max, min)).toBe(max + (min - max) * ((value - end) / (start - end)));
			});

			test('Get Before 1/16 Time', () => {
				expect(beatmapManipulater.getSnapBasedOffsetTime(ISOLATE_RANGE_START, -16)).toBe(ISOLATE_OFFSET_TIME);
			});

			describe('Overwrite', () => {
				beforeEach(resetBeatmap);

				test('Range Only', () => {
					range((includingStartTime, includingEndTime) => {
						resetBeatmap();

						beatmapManipulater.overwrite(ISOLATE_RANGE_START, ISOLATE_RANGE_END, {
							includingStartTime: includingStartTime,
							includingEndTime: includingEndTime,
							isIgnoreVelocity: true,
							isIgnoreVolume: true
						});

						const timingPoints = beatmapManipulater.beatmap.getTimingPointsInRange(ISOLATE_RANGE_START, ISOLATE_RANGE_END);

						if(includingStartTime && includingEndTime) expect(timingPoints.length).toBe(ISOLATE_RANGE_LENGTH);
						else if(includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(ISOLATE_RANGE_LENGTH - 1);
						else if(!includingStartTime && includingEndTime) expect(timingPoints.length).toBe(ISOLATE_RANGE_LENGTH - 1);
						else if(!includingStartTime && !includingEndTime) expect(timingPoints.length).toBe(ISOLATE_RANGE_LENGTH - 2);

						if(includingStartTime && includingEndTime) {
							const timingPoint = timingPoints[0];

							expect(timingPoint).toBeTruthy();
							expect(timingPoint).toBeInstanceOf(TimingPoint);
							expect(timingPoint.beatLength).toBe(ISOLATE_PREVIOUS_BEAT_LENGTH);
							expect(timingPoint.volume).toBe(ISOLATE_PREVIOUS_VOLUME);
						}
					});
				});

				test('Velocity Only', () => {
					beatmapManipulater.overwrite(ISOLATE_RANGE_START, ISOLATE_RANGE_END, {
						startVelocity: 1.0,
						endVelocity: 2.0,
						isIgnoreVolume: true
					});

					const timingPoints = beatmapManipulater.beatmap.getTimingPointsInRange(ISOLATE_RANGE_START, ISOLATE_RANGE_END);

					for(let i in timingPoints) {
						const timingPoint = timingPoints[i];

						expect(timingPoint.beatLength).toBe(parseFloat((-100 / BeatmapManipulater.getTimeInterpolatedValue(timingPoint.time, ISOLATE_RANGE_START, ISOLATE_RANGE_END, 1.0, 2.0)).toFixed(12)));
						expect(timingPoint.volume).toBe(ISOLATE_PREVIOUS_VOLUME);
					}
				});

				test('Volume Only', () => {
					beatmapManipulater.overwrite(ISOLATE_RANGE_START, ISOLATE_RANGE_END, {
						startVolume: 90,
						endVolume: 40,
						isIgnoreVelocity: true
					});

					const timingPoints = beatmapManipulater.beatmap.getTimingPointsInRange(ISOLATE_RANGE_START, ISOLATE_RANGE_END);

					for(let i in timingPoints) {
						const timingPoint = timingPoints[i];

						expect(timingPoint.beatLength).toBe(ISOLATE_PREVIOUS_BEAT_LENGTH);
						expect(timingPoint.volume).toBe(Math.round(BeatmapManipulater.getTimeInterpolatedValue(timingPoint.time, ISOLATE_RANGE_START, ISOLATE_RANGE_END, 90, 40)));
					}
				});

				test('Velocity & Volume', () => {
					beatmapManipulater.overwrite(ISOLATE_RANGE_START, ISOLATE_RANGE_END, {
						startVelocity: 1.0,
						startVolume: 90,
						endVelocity: 2.0,
						endVolume: 40
					});

					const timingPoints = beatmapManipulater.beatmap.getTimingPointsInRange(ISOLATE_RANGE_START, ISOLATE_RANGE_END);

					for(let i in timingPoints) {
						const timingPoint = timingPoints[i];

						expect(timingPoint.beatLength).toBe(parseFloat((-100 / BeatmapManipulater.getTimeInterpolatedValue(timingPoint.time, ISOLATE_RANGE_START, ISOLATE_RANGE_END, 1.0, 2.0)).toFixed(12)));
						expect(timingPoint.volume).toBe(Math.round(BeatmapManipulater.getTimeInterpolatedValue(timingPoint.time, ISOLATE_RANGE_START, ISOLATE_RANGE_END, 90, 40)));
					}
				});

				test('Velocity & Volume & Kiai', () => {
					beatmapManipulater.overwrite(ISOLATE_RANGE_START, ISOLATE_RANGE_END, {
						startVelocity: 1.0,
						startVolume: 90,
						endVelocity: 2.0,
						endVolume: 40,
						isKiai: true
					});

					const timingPoints = beatmapManipulater.beatmap.getTimingPointsInRange(ISOLATE_RANGE_START, ISOLATE_RANGE_END);

					for(let i in timingPoints) {
						const timingPoint = timingPoints[i];

						expect(timingPoint.effects).toBe(1);
					}
				});

				test('Velocity & Volume & Offset', () => {
					beatmapManipulater.overwrite(ISOLATE_RANGE_START, ISOLATE_RANGE_END, {
						startVelocity: 1.0,
						startVolume: 90,
						endVelocity: 2.0,
						endVolume: 40,
						isOffset: true
					});

					const startOffset = beatmapManipulater.getSnapBasedOffsetTime(ISOLATE_RANGE_START, -16);
					const endOffset = beatmapManipulater.getSnapBasedOffsetTime(ISOLATE_RANGE_END, -16);

					const timingPoints = beatmapManipulater.beatmap.getTimingPointsInRange(startOffset, endOffset);
					const hitObjects = beatmapManipulater.beatmap.getHitObjectsInRange(ISOLATE_RANGE_START, ISOLATE_RANGE_END);

					expect(timingPoints.length).toBe(ISOLATE_RANGE_LENGTH);
					expect(timingPoints.length).toBe(hitObjects.length);

					for(let i in timingPoints) {
						const timingPoint = timingPoints[i];
						const timingPointOffsetTime = beatmapManipulater.getSnapBasedOffsetTime(timingPoint.time, 16);

						const matchedHitObject = beatmapManipulater.beatmap.getHitObjectsInRange(timingPointOffsetTime, timingPointOffsetTime);

						expect(matchedHitObject.length).toBe(1);
						expect(matchedHitObject[0].time).toBe(timingPointOffsetTime);
					}
				});

				test('Velocity & Volume & Dense', () => {
					beatmapManipulater.overwrite(ISOLATE_RANGE_START, ISOLATE_RANGE_END, {
						startVelocity: 1.0,
						startVolume: 90,
						endVelocity: 2.0,
						endVolume: 40,
						isDense: true
					});

					const timingPoints = beatmapManipulater.beatmap.getTimingPointsInRange(ISOLATE_RANGE_START, ISOLATE_RANGE_END);

					for(let i = 0; i < timingPoints.length - 1; i++) {
						const currentTimingPoint = timingPoints[i];
						const nextTimingPoint = timingPoints[i + 1];

						expect(beatmapManipulater.getSnapBasedOffsetTime(currentTimingPoint.time, 16)).toBe(nextTimingPoint.time);
					}
				});

				test('Kiai & Offset & Dense', () => {
					beatmapManipulater.overwrite(ISOLATE_RANGE_START, ISOLATE_RANGE_END, {
						isKiai: true,
						isOffset: true,
						isDense: true,
						isIgnoreVelocity: true,
						isIgnoreVolume: true
					});

					const startOffset = beatmapManipulater.getSnapBasedOffsetTime(ISOLATE_RANGE_START, -16);
					const endOffset = beatmapManipulater.getSnapBasedOffsetTime(ISOLATE_RANGE_END, -16);

					const timingPoints = beatmapManipulater.beatmap.getTimingPointsInRange(startOffset, endOffset);

					for(let i = 0; i < timingPoints.length; i++) {
						const currentTimingPoint = timingPoints[i];

						expect(currentTimingPoint.beatLength).toBe(ISOLATE_PREVIOUS_BEAT_LENGTH);
						expect(currentTimingPoint.volume).toBe(ISOLATE_PREVIOUS_VOLUME);
						expect(currentTimingPoint.effects).toBe(1);

						if(i < timingPoints.length - 1) {
							const nextTimingPoint = timingPoints[i + 1];

							expect(beatmapManipulater.getSnapBasedOffsetTime(currentTimingPoint.time, 16)).toBe(nextTimingPoint.time);
						}
					}
				});

				test('Velocity & Volume & Kiai & Offset', () => {
					beatmapManipulater.overwrite(ISOLATE_RANGE_START, ISOLATE_RANGE_END, {
						startVelocity: 1.0,
						startVolume: 90,
						endVelocity: 2.0,
						endVolume: 40,
						isKiai: true,
						isOffset: true
					});

					const startOffset = beatmapManipulater.getSnapBasedOffsetTime(ISOLATE_RANGE_START, -16);
					const endOffset = beatmapManipulater.getSnapBasedOffsetTime(ISOLATE_RANGE_END, -16);

					const timingPoints = beatmapManipulater.beatmap.getTimingPointsInRange(startOffset, endOffset);
					const hitObjects = beatmapManipulater.beatmap.getHitObjectsInRange(ISOLATE_RANGE_START, ISOLATE_RANGE_END);

					expect(timingPoints.length).toBe(ISOLATE_RANGE_LENGTH);
					expect(timingPoints.length).toBe(hitObjects.length);

					for(let i = 0; i < timingPoints.length; i++) {
						const timingPoint = timingPoints[i];
						const timingPointOffsetTime = beatmapManipulater.getSnapBasedOffsetTime(timingPoint.time, 16);

						const matchedHitObject = beatmapManipulater.beatmap.getHitObjectsInRange(timingPointOffsetTime, timingPointOffsetTime);

						expect(matchedHitObject.length).toBe(1);
						expect(matchedHitObject[0].time).toBe(timingPointOffsetTime);

						expect(timingPoint.beatLength).toBe(parseFloat((-100 / BeatmapManipulater.getTimeInterpolatedValue(timingPoint.time, startOffset, endOffset, 1.0, 2.0)).toFixed(12)));
						expect(timingPoint.volume).toBe(Math.round(BeatmapManipulater.getTimeInterpolatedValue(timingPoint.time, startOffset, endOffset, 90, 40)));
						expect(timingPoint.effects).toBe(1);
					}
				});
			})

			describe('Remove', () => {
				beforeEach(resetBeatmap);

				test('Range Only', () => {
					range((includingStartTime, includingEndTime) => {
						resetBeatmap();

						beatmapManipulater.remove(TIMING_POINT_RANGE_START, TIMING_POINT_RANGE_END, {
							includingStartTime: includingStartTime,
							includingEndTime: includingEndTime,
							isOffset: false
						});

						const timingPointsLength = beatmapManipulater.beatmap.timingPoints.length;

						if(includingStartTime && includingEndTime) expect(timingPointsLength).toBe(TIMING_POINT_COUNT - TIMING_POINT_RANGE_LENGTH);
						else if(includingStartTime && !includingEndTime) expect(timingPointsLength).toBe(TIMING_POINT_COUNT - TIMING_POINT_RANGE_LENGTH + 1);
						else if(!includingStartTime && includingEndTime) expect(timingPointsLength).toBe(TIMING_POINT_COUNT - TIMING_POINT_RANGE_LENGTH + 1);
						else if(!includingStartTime && !includingEndTime) expect(timingPointsLength).toBe(TIMING_POINT_COUNT - TIMING_POINT_RANGE_LENGTH + 2);
					});
				});

				test('Offset Only', () => {
					beatmapManipulater.remove(TIMING_POINT_RANGE_START, TIMING_POINT_RANGE_END, {
						isOffset: true
					});

					const startOffset = beatmapManipulater.getSnapBasedOffsetTime(TIMING_POINT_RANGE_START, -16);
					const endOffset = beatmapManipulater.getSnapBasedOffsetTime(TIMING_POINT_RANGE_END, -16);

					const timingPointsLength = beatmapManipulater.beatmap.timingPoints.length;
					const timingPointsInRange = beatmapManipulater.beatmap.getTimingPointsInRange(TIMING_POINT_RANGE_START, TIMING_POINT_RANGE_END);
					const timingPointsInOffsetRange = beatmapManipulater.beatmap.getTimingPointsInRange(startOffset, endOffset);

					expect(timingPointsLength).toBe(TIMING_POINT_COUNT - TIMING_POINT_RANGE_LENGTH + 1);
					expect(timingPointsInRange.length).toBe(1);
					expect(timingPointsInOffsetRange.length).toBe(0);
				});
			});
		});
	});
});