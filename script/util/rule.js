/**
 * @author Titus Wormer
 * @copyright 2016 Titus Wormer
 * @license MIT
 * @module remark:lint:script:rule
 * @fileoverview Get information for a rule.
 */

'use strict';

/* Dependencies. */
var fs = require('fs');
var path = require('path');
var dox = require('dox');
var strip = require('strip-indent');
var trim = require('trim');

/* Expose. */
module.exports = ruleSync;

/**
 * Get information for a rule at `filePath`.
 *
 * @param {string} filePath - Path to rule.
 */
function ruleSync(filePath) {
  var ruleId = path.basename(filePath);
  var result = {};
  var tests = {};
  var description;
  var code;
  var tags;
  var name;

  ruleId = ruleId.slice('remark-lint-'.length);
  code = fs.readFileSync(path.join(filePath, 'index.js'), 'utf-8');
  tags = dox.parseComments(code)[0].tags;
  description = find(tags, 'fileoverview');
  name = find(tags, 'module');

  /* istanbul ignore if */
  if (name !== ruleId) {
    throw new Error(
      ruleId + ' has an invalid `@module`: ' + name
    );
  }

  /* istanbul ignore if */
  if (!description) {
    throw new Error(ruleId + ' is missing a `@fileoverview`');
  }

  description = strip(description);

  result.ruleId = ruleId;
  result.description = trim(description);
  result.tests = tests;
  result.filePath = filePath;

  findAll(tags, 'example').map(strip).forEach(function (example) {
    var lines = example.split('\n');
    var value = strip(lines.slice(1).join('\n'));
    var info;
    var setting;
    var context;
    var name;

    try {
      info = JSON.parse(lines[0]);
    } catch (err) {
      /* istanbul ignore next */
      throw new Error(
        'Could not parse example in ' + ruleId + ':\n' + err.stack
      );
    }

    setting = JSON.stringify(info.setting || true);
    context = tests[setting];
    name = info.name;

    if (!context) {
      context = tests[setting] = [];
    }

    if (!info.label) {
      context[name] = {
        config: info.config || {},
        setting: setting,
        input: value,
        output: []
      };

      return;
    }

    /* istanbul ignore if */
    if (info.label !== 'input' && info.label !== 'output') {
      throw new Error(
        'Expected `input` or `ouput` for `label` in ' +
        ruleId + ', not `' + info.label + '`'
      );
    }

    if (!context[name]) {
      context[name] = {config: info.config || {}};
    }

    context[name].setting = setting;

    if (info.label === 'output') {
      value = value.split('\n');
    }

    context[name][info.label] = value;
  });

  return result;
}

/**
 * Find the first tag in `tags` with a type set to `key`.
 *
 * @param {Array.<Object>} tags - List of tags.
 * @param {string} key - Type of tag.
 * @return {Object?} - Tag, when found.
 */
function find(tags, key) {
  var value = null;

  tags.some(function (tag) {
    if (tag && tag.type === key) {
      value = tag;

      return true;
    }

    return false;
  });

  return value && value.string;
}

/**
 * Find the first tag in `tags` with a type set to `key`.
 *
 * @param {Array.<Object>} tags - List of tags.
 * @param {string} key - Type of tag.
 * @return {Object?} - Tag, when found.
 */
function findAll(tags, key) {
  return tags
    .filter(function (tag) {
      return tag && tag.type === key;
    })
    .map(function (tag) {
      return tag.string;
    });
}
