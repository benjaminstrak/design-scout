// src/utils/data.test.js
const fs = require('fs');
const path = require('path');
const { saveStageOutput, loadStageOutput } = require('./data');

const TEST_DIR = path.join(__dirname, '../../data/test');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

test('saveStageOutput writes JSON file with timestamp', () => {
  const data = { items: [{ title: 'Test Item' }] };
  const filePath = saveStageOutput('collect', data, TEST_DIR);
  expect(fs.existsSync(filePath)).toBe(true);
  const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  expect(saved.stage).toBe('collect');
  expect(saved.data).toEqual(data);
  expect(saved.timestamp).toBeDefined();
});

test('loadStageOutput reads the most recent file for a stage', () => {
  const data1 = { items: ['old'] };
  const data2 = { items: ['new'] };
  saveStageOutput('collect', data1, TEST_DIR);
  saveStageOutput('collect', data2, TEST_DIR);
  const loaded = loadStageOutput('collect', TEST_DIR);
  expect(loaded.data).toEqual(data2);
});

test('loadStageOutput returns null if no file exists', () => {
  const loaded = loadStageOutput('nonexistent', TEST_DIR);
  expect(loaded).toBeNull();
});
