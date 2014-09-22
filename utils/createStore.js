/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var util = require('util'),
    BaseStore = require('./BaseStore'),
    IGNORE_ON_PROTOTYPE = ['statics', 'storeName', 'handlers', 'mixins'];

function createChainedFunction(one, two) {
    return function chainedFunction() {
        one.apply(this, arguments);
        two.apply(this, arguments);
    };
}

/**
 * Helper for creating a store class
 * @method createStore
 * @param {Object} spec
 * @param {String} spec.storeName The name of the store
 * @param {Object} spec.handlers Hash of action name to method name of action handlers
 * @param {Function} spec.initialize Function called during construction for setting the default state
 * @param {Function} spec.dehydrate Function that returns serializable data to send to the client
 * @param {Function} spec.rehydrate Function that takes in serializable data to rehydrate the store
 */
module.exports = function createStore(spec) {
    spec.statics = spec.statics || {};
    if (!spec.storeName && !spec.statics.storeName) {
        throw new Error('createStore called without a storeName');
    }
    var Store = function (dispatcher) {
        BaseStore.call(this, dispatcher);
    };

    util.inherits(Store, BaseStore);

    if (spec.statics) {
        Object.keys(spec.statics).forEach(function (prop) {
            Store[prop] = spec.statics[prop];
        });
    }
    Store.storeName = spec.storeName || Store.storeName;
    Store.handlers = spec.handlers || Store.handlers;
    Store.mixins = spec.mixins || Store.mixins;

    Object.keys(spec).forEach(function (prop) {
        if (-1 !== IGNORE_ON_PROTOTYPE.indexOf(prop)) {
            return;
        }
        Store.prototype[prop] = spec[prop];
    });

    if (Store.mixins) {
        Store.mixins.forEach(function(mixin) {
            Object.keys(mixin).forEach(function (prop) {
                if ('initialize' === prop) {
                    if (!Store.prototype[prop]) {
                        Store.prototype[prop] = mixin[prop];
                    } else {
                        Store.prototype[prop] = createChainedFunction(Store.prototype[prop], mixin[prop]);
                    }
                } else {
                    if (!Store.prototype[prop]) {
                        Store.prototype[prop] = mixin[prop];
                    } else {
                        throw new Error('Mixin property collision for property "' + prop + '"');
                    }
                }
            });
        });
    }

    return Store;
};
