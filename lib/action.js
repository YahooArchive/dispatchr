var debug = require('debug')('Dispatchr:Action'),
    Promise = global.Promise || require('es6-promise').Promise;

/**
 * @class Action
 * @param {String} name
 * @param {Object} payload
 * @param {Function} [callback]
 * @constructor
 */
function Action(name, payload, callback) {
    var self = this;
    self.name = name;
    self.payload = payload;
    self.callback = callback;
    // Handle deferred Promise
    self.promise = new Promise(function (fulfill, reject) {
        self._fulfill = fulfill;
        self._reject = reject;
    });
    self._handlerPromises = {};
    self._handling = false;
}

/**
 * Calls handler functions and fulfills Action promise upon completion of all handlers
 * @param {Object} handlers A hash of storeNames to handler function
 * @returns {Promise}
 * @throws {Error} if handle has already been called
 */
Action.prototype.handle = function handle(handlers) {
    if (this._handling) {
        throw new Error('Action is already being handled');
    }
    this._handling = true;
    var self = this,
        actionPromises = [];
    Object.keys(handlers).forEach(function (storeName) {
        var handler = handlers[storeName],
            handlerPromise;

        handlerPromise = new Promise (function (resolve, reject) {
            // Ensure that all handler promises are registered before executing
            setImmediate(function () {
                if (handler.length > 1) {
                    handler(self.payload, function storeHandlerDone(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                } else {
                    var handlerReturn = handler(self.payload) || Promise.resolve();
                    handlerReturn.then(resolve, reject);
                }
            });
        });
        actionPromises.push(handlerPromise);
        self._handlerPromises[storeName] = handlerPromise;
    });

    Promise.all(actionPromises).then(self._fulfill, self._reject);

    return self.promise;
};

/**
 * Waits for other handlers to complete
 * @param {String[]} storeNames stores to wait for
 * @returns {Promise}
 */
Action.prototype.waitFor = function waitFor(storeNames) {
    var self = this,
        waitHandlers = [];

    storeNames.forEach(function (storeName) {
        var actionHandler = self._handlerPromises[storeName];
        if (actionHandler) {
            debug(self.name + ' action waiting on ' + storeName);
            waitHandlers.push(actionHandler);
        }
    });

    return Promise.all(waitHandlers);
};

module.exports = Action;