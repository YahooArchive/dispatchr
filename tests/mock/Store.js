/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var util = require('util');
var createStore = require('../../utils/createStore');
var DelayedStore = require('./DelayedStore');


module.exports = createStore({
    storeName: 'Store',
    handlers: {
        'NAVIGATE': function navigate() {
            this.state.called = true;
            this.state.page = 'home';
        },
        'DELAY': 'delay',
        'ERROR': 'error'
    },
    initialize: function () {
        this.state = {
            called: false
        };
    },
    delay: function (payload) {
        var self = this;
        self.state.called = true;

        self.dispatcher.waitFor(DelayedStore, function () {
            var delayedStore = self.dispatcher.getStore(DelayedStore);

            if (!delayedStore.getState().final) {
                throw new Error('Delayed store didn\'t finish first!');
            }

            self.state.page = 'delay';
        });
    },
    getState: function () {
        return this.state;
    },
    dehydrate: function () {
        return this.state;
    },
    rehydrate: function (state) {
        this.state = state;
    }
});
