/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    DelayedStore = require('./delayedStore');

function Store(dispatcher) {
    this.dispatcher = dispatcher;
    this.getInitialState();
}

Store.storeName = 'Store';
util.inherits(Store, EventEmitter);

Store.prototype.getInitialState = function () {
    this.state = {
        called: false
    };
};

Store.prototype.navigate = function (payload) {
    this.state.called = true;
    this.state.page = 'home';
};

Store.prototype.delay = function (payload) {
    var self = this;
    self.state.called = true;
    self.dispatcher.waitFor(DelayedStore, function () {
        var delayedStore = self.dispatcher.getStore(DelayedStore);
        if (!delayedStore.getState().final) {
            throw new Error('Delayed store didn\'t finish first!');
        }
        self.state.page = 'delay';
    });
};

Store.prototype.getState = function () {
    return this.state;
};

Store.prototype.rehydrate = function (state) {
    this.state = state;
};

Store.handlers = {
    'NAVIGATE': 'navigate',
    'DELAY': 'delay',
    'ERROR': 'error'
};

module.exports = Store;
