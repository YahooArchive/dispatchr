/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function DelayedStore(dispatcher) {
    this.dispatcher = dispatcher;
    this.getInitialState();
}

DelayedStore.storeName = 'DelayedStore';
util.inherits(DelayedStore, EventEmitter);

DelayedStore.prototype.getInitialState = function () {
    this.state = {};
};

DelayedStore.prototype.delay = function (payload) {
    var self = this;
    self.called = true;
    self.state.page = 'delay';
    self.state.final = true;
};

DelayedStore.prototype.getState = function () {
    return this.state;
};

DelayedStore.prototype.toJSON = function () {
    return this.state;
};

DelayedStore.prototype.rehydrate = function (state) {
    this.state = state;
};

DelayedStore.handlers = {
    'DELAY': 'delay'
};

module.exports = DelayedStore;
