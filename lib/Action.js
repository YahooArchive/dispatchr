var debug = require('debug')('Dispatchr:Action');

function Action(name, payload) {
    this.name = name;
    this.payload = payload;
    this._handlers = null;
    this._isDispatched = false;
    this._isCompleted = null;
}

/**
 * Gets a name from a store
 * @param {String|Object} store The store name or class from which to extract
 *      the name
 * @returns {String}
 */
Action.prototype.getStoreName = function (store) {
    if ('string' === typeof store) {
        return store;
    }
    return store.storeName;
};

Action.prototype.dispatch = function (handlers) {
    if (this._isDispatched) {
        throw new Error('Action is already dispatched');
    }
    var self = this;
    this._handlers = handlers;
    this._isDispatched = true;
    this._isCompleted = {};
    Object.keys(handlers).forEach(function (storeName) {
        self._isCompleted[storeName] = false;
        self._callHandler(storeName);
        self._isCompleted[storeName] = true;
    });
};

Action.prototype._callHandler = function (storeName) {
    var self = this,
        handlerFn = self._handlers[storeName];
    if (!handlerFn) {
        throw new Error(storeName + ' does not have a handler for action ' + self.name);
    }
    if (self._isCompleted[storeName]) {
        return;
    }
    handlerFn(self);
};

/**
 * Waits until all stores have finished handling an action and then calls
 * the callback
 * @method waitFor
 * @param {String|Array} stores An array of stores as strings to wait for
 * @param {Function} [callback] Called after all stores have completed handling their actions
 */
Action.prototype.waitFor = function (stores, callback) {
    var self = this;
    if (!self._isDispatched) {
        throw new Error('waitFor called even though there is no action being handled!');
    }
    if (!Array.isArray(stores)) {
        stores = [stores];
    }

    stores.forEach(function (storeName) {
        storeName = self.getStoreName(storeName);
        self._callHandler(storeName);
    });

    callback();
};

module.exports = Action;