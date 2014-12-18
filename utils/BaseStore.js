/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var CHANGE_EVENT = 'change';

/**
 * @class BaseStore
 * @extends EventEmitter
 * @param dispatcher The dispatcher interface
 * @constructor
 */
function BaseStore(dispatcher) {
    this.dispatcher = dispatcher;
    if (this.initialize) {
        this.initialize();
    }
}

util.inherits(BaseStore, EventEmitter);

/**
 * Convenience method for getting the store context object.
 * @method getContext
 * @return {Object} Returns the store context object.
 */
BaseStore.prototype.getContext = function getContext() {
  return this.dispatcher.getContext();
};

/**
 * Add a listener for the change event
 * @method addChangeListener
 * @param {Function} callback
 */
BaseStore.prototype.addChangeListener = function addChangeListener(callback) {
  this.on(CHANGE_EVENT, callback);
};

/**
 * Remove a listener for the change event
 * @method removeChangeListener
 * @param {Function} callback
 */
BaseStore.prototype.removeChangeListener = function removeChangeListener(callback) {
  this.removeListener(CHANGE_EVENT, callback);
};

/**
 * Emit a change event
 * @method emitChange
 * @param {*} param=this
 */
BaseStore.prototype.emitChange = function emitChange(param) {
  this.emit(CHANGE_EVENT, param || this);
};

module.exports = BaseStore;
