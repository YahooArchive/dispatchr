/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util'),
    BaseStore = require('../../utils/BaseStore'),
    DelayedStore = require('./DelayedStore');

var Store = BaseStore.create();

Store.storeName = 'Store';

Store.initialize = function () {
    this.state = {
        called: false
    };
};

Store.delay = function (payload) {
    var self = this;
    self.state.called = true;
    self.dispatcher.waitFor(DelayedStore, function () {
        var delayedStore = self.dispatcher.getStore(DelayedStore);
        if (!delayedStore.getState().final) {
            throw new Error('Delayed store didn\'t finish first!');
        }
        self.state.page = 'delay';
        self.emitChange();
    });
};

Store.dispatch = function (payload) {
    payload.dispatcher.dispatch('DISPATCH_IN_DISPATCH');
    this.emitChange();
};

Store.getState = function () {
    return this.state;
};

Store.dehydrate = function () {
    return this.state;
};

Store.rehydrate = function (state) {
    this.state = state;
};

Store.handlers = {
    'NAVIGATE': function navigate() {
        this.state.called = true;
        this.state.page = 'home';
        this.emitChange();
    },
    'DELAY': 'delay',
    'ERROR': 'error',
    'DISPATCH': 'dispatch'
};

module.exports = Store;
