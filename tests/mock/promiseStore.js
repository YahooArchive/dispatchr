/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Promise = require('es6-promise').Promise;

function PromiseStore(context) {
    this.called = false;
    this.context = context;
    this.state = {
        final: false
    };
}

PromiseStore.storeName = 'PromiseStore';
util.inherits(PromiseStore, EventEmitter);

PromiseStore.prototype.delay = function () {
    var self = this;
    self.called = true;
    self.state.page = 'delay';
    return new Promise(function (fulfill) {
        setTimeout(function () {
            self.state.final = true;
            fulfill();
        }, 10);
    });
};

PromiseStore.prototype.getState = function () {
    return this.state;
};

PromiseStore.prototype.toJSON = function () {
    return this.state;
};

PromiseStore.handlers = {
    'DELAY_PROMISE': 'delay'
};

module.exports = PromiseStore;
