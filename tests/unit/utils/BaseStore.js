/*globals describe,it */
"use strict";

var expect = require('chai').expect;
var BaseStore = require('../../../utils/BaseStore');

var contextMock = {
    dimensions: {}
};
var dispatcherMock = {
        getContext: function () {
            return contextMock;
        }
    };

describe('BaseStore', function () {
    it('instantiates correctly', function () {
        var store = BaseStore.create(dispatcherMock);
        expect(store.dispatcher).to.equal(dispatcherMock);
        expect(store.getContext()).to.equal(dispatcherMock.getContext());
    });

    it('allows listening for changes', function (done) {
        var store = BaseStore.create(dispatcherMock);
        var payloadMock = {
            foo: 'bar'
        };
        store.addChangeListener(function (payload) {
            expect(payload.foo).to.equal('bar');
            done();
        });
        store.emitChange(payloadMock);
    });
});
