const { Application } = require("spectron");
const electron = require("electron");
const path = require('path');
const fs = require('fs');

const app = new Application({
	path: electron,
	requireName: 'electronRequire',
	env: {
		NODE_ENV: 'test'
	},
	args: [
		path.join(__dirname, '../main.js')
	]
});

describe('Application Integrated Test', () => {
	jest.setTimeout(10000);

	beforeAll(() => {
		return app.start();
	});

	afterAll(async () => {
		if(app && app.isRunning()) {
			await app.client.execute(() => window.close());
		}
	});

	describe('Initalize', () => {
		test('Display App Window', async () => {
			const windowCount = await app.client.getWindowCount();

			expect(windowCount).toBe(1);
		});
	});
});