/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*globals describe,it,before,beforeEach */
'use strict';

var expect = require('chai').expect;
var DispatchError = require('../../../lib/Error/DispatchError');

describe('DispatchError', function () {
    it('exists', function () {
        var err = new DispatchError();
        expect(err).to.be.an.instanceof(DispatchError);
        expect(err.name).to.equal('DispatchError');
    });

    it('has a message', function () {
        var err = new DispatchError('foo');
        expect(err.message).to.equal('foo');
    });

    it('is an Error', function () {
        var err = new DispatchError();
        expect(err).to.be.an.instanceof(Error);
    });
});
