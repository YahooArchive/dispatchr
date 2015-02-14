/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

var Action = require('./Action'),
    BaseStore = require('../utils/BaseStore'),
    DEFAULT = 'default',
    debug = require('debug')('Dispatchr:dispatcher');

/**
 * @class Dispatcher
 * @param {Object} context The context to be used for store instances
 * @constructor
 */
module.exports = {
    stores: {},
    handlers: {
        'default': []
    },

    /**
     * Creates a new dispatchr instance
     * @param {Object} context The context to be used for store instances
     * @constructor
     */
    create: function (context) {
        var obj = Object.create(this);
        obj.storeInstances = {};
        obj.currentAction = null;
        obj.dispatcherInterface = {
            getContext: function getContext() { return context; },
            getStore: obj.getStore.bind(obj),
            waitFor: obj.waitFor.bind(obj)
        };

        return obj;
    },

    /**
     * Registers a store so that it can handle actions.
     * @method registerStore
     * @static
     * @param {Object} store A store class to be registered. The store should have a static
     *      `name` property so that it can be loaded later.
     * @throws {Error} if store is invalid
     * @throws {Error} if store is already registered
     */
    registerStore: function registerStore(store) {
        if (!BaseStore.isPrototypeOf(store)) {
            throw new Error('registerStore requires a constructor as first parameter');
        }

        var storeName = this.getStoreName(store);
        if (!storeName) {
            throw new Error('Store is required to have a `storeName` property.');
        }

        if (!this.hasOwnProperty('stores')) {
            this.stores = {};
        }

        if (this.stores[storeName]) {
            if (this.stores[storeName] === store) {
                // Store is already registered, nothing to do
                return;
            }
            throw new Error('Store with name `' + storeName + '` has already been registered.');
        }
        this.stores[storeName] = store;
        if (store.handlers) {
            Object.keys(store.handlers).forEach(function storeHandlersEach(action) {
                var handler = store.handlers[action];
                this._registerHandler(action, storeName, handler);
            }, this);
        }
    },

    /**
     * Method to discover if a storeName has been registered
     * @method isRegistered
     * @static
     * @param {Object|String} store The store to check
     * @returns {boolean}
     */
    isRegistered: function isRegistered(store) {
        var storeName = this.getStoreName(store),
            storeInstance = this.stores[storeName];

        if (!storeInstance) {
            return false;
        }

        if ('function' === typeof store) {
            if (store !== storeInstance) {
                return false;
            }
        }
        return true;
    },

    /**
     * Gets a name from a store
     * @method getStoreName
     * @static
     * @param {String|Object} store The store name or class from which to extract
     *      the name
     * @returns {String}
     */
    getStoreName: function getStoreName(store) {
        if ('string' === typeof store) {
            return store;
        }
        return store.storeName;
    },

    /**
     * Adds a handler function to be called for the given action
     * @method registerHandler
     * @private
     * @static
     * @param {String} action Name of the action
     * @param {String} name Name of the store that handles the action
     * @param {String|Function} handler The function or name of the method that handles the action
     * @returns {number}
     */
    _registerHandler: function registerHandler(action, name, handler) {
        if (!this.hasOwnProperty('handlers')) {
            this.handlers = {};
        }

        this.handlers[action] = this.handlers[action] || [];
        this.handlers[action].push({
            name: this.getStoreName(name),
            handler: handler
        });
        return this.handlers.length - 1;
    },

    /**
     * Returns a single store instance and creates one if it doesn't already exist
     * @method getStore
     * @param {String} name The name of the instance
     * @returns {Object} The store instance
     * @throws {Error} if store is not registered
     */
    getStore: function getStore(name) {
        var storeName = this.getStoreName(name);
        if (!this.storeInstances[storeName]) {
            var Store = this.stores[storeName];
            if (!Store) {
                throw new Error('Store ' + storeName + ' was not registered.');
            }
            this.storeInstances[storeName] = this.stores[storeName].create(this.dispatcherInterface);
        }
        return this.storeInstances[storeName];
    },

    /**
     * Dispatches a new action or queues it up if one is already in progress
     * @method dispatch
     * @param {String} actionName Name of the action to be dispatched
     * @param {Object} payload Parameters to describe the action
     * @throws {Error} if store has handler registered that does not exist
     */
    dispatch: function dispatch(actionName, payload) {
        if (this.currentAction) {
            throw new Error('Cannot call dispatch while another dispatch is executing. Attempted to execute \'' + actionName + '\' but \'' + this.currentAction.name + '\' is already executing.');
        }
        var actionHandlers = this.handlers[actionName] || [],
            defaultHandlers = this.handlers[DEFAULT] || [];
        if (!actionHandlers.length && !defaultHandlers.length) {
            debug(actionName + ' does not have any registered handlers');
            return;
        }
        debug('dispatching ' + actionName, payload);
        this.currentAction = new Action(actionName, payload);
        var allHandlers = actionHandlers.concat(defaultHandlers),
            handlerFns = {};

        try {
            allHandlers.forEach(function actionHandlersEach(store) {
                if (handlerFns[store.name]) {
                    // Don't call the default if the store has an explicit action handler
                    return;
                }
                var storeInstance = this.getStore(store.name);
                if ('function' === typeof store.handler) {
                    handlerFns[store.name] = store.handler.bind(storeInstance);
                } else {
                    if (!storeInstance[store.handler]) {
                        throw new Error(store.name + ' does not have a method called ' + store.handler);
                    }
                    handlerFns[store.name] = storeInstance[store.handler].bind(storeInstance);
                }
            }, this);
            this.currentAction.execute(handlerFns);
        } catch (e) {
            throw e;
        } finally {
            debug('finished ' + actionName);
            this.currentAction = null;
        }
    },

    /**
     * Returns a raw data object representation of the current state of the
     * dispatcher and all store instances. If the store implements a shouldDehdyrate
     * function, then it will be called and only dehydrate if the method returns `true`
     * @method dehydrate
     * @returns {Object} dehydrated dispatcher data
     */
    dehydrate: function dehydrate() {
        var stores = {};
        Object.keys(this.storeInstances).forEach(function storeInstancesEach(storeName) {
            var store = this.storeInstances[storeName];
            if (!store.dehydrate || (store.shouldDehydrate && !store.shouldDehydrate())) {
                return;
            }
            stores[storeName] = store.dehydrate();
        }, this);
        return {
            stores: stores
        };
    },

    /**
     * Takes a raw data object and rehydrates the dispatcher and store instances
     * @method rehydrate
     * @param {Object} dispatcherState raw state typically retrieved from `dehydrate`
     *      method
     */
    rehydrate: function rehydrate(dispatcherState) {
        if (dispatcherState.stores) {
            Object.keys(dispatcherState.stores).forEach(function storeStateEach(storeName) {
                var state = dispatcherState.stores[storeName],
                    store = this.getStore(storeName);
                if (store.rehydrate) {
                    store.rehydrate(state);
                }
            }, this);
        }
    },

    /**
     * Waits until all stores have finished handling an action and then calls
     * the callback
     * @method waitFor
     * @param {String|String[]} stores An array of stores as strings to wait for
     * @param {Function} callback Called after all stores have completed handling their actions
     * @throws {Error} if there is no action dispatching
     */
    waitFor: function waitFor(stores, callback) {
        if (!this.currentAction) {
            throw new Error('waitFor called even though there is no action dispatching');
        }
        this.currentAction.waitFor(stores, callback);
    }
};
