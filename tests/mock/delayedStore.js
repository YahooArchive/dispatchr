/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function DelayedStore(context) {
    this.called = false;
    this.context = context;
    this.state = {
        final: false
    };
}

DelayedStore.storeName = 'DelayedStore';
util.inherits(DelayedStore, EventEmitter);

DelayedStore.prototype.delay = function (payload, done) {
    var self = this;
    self.called = true;
    self.state.page = 'delay';
    setTimeout(function () {
        self.state.final = true;
        done();
    }, 10);
};

DelayedStore.prototype.getState = function () {
    return this.state;
};

DelayedStore.prototype.toJSON = function () {
    return this.state;
};

DelayedStore.handlers = {
    'DELAY': 'delay'
};

module.exports = DelayedStore;
