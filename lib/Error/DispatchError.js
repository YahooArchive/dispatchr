/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

function DispatchError(message) {
    this.message = message || '';
}

DispatchError.prototype = new Error();
DispatchError.prototype.name = 'DispatchError';
DispatchError.prototype.constructor = DispatchError;

module.exports = DispatchError;
