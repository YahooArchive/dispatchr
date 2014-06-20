Dispatchr [![Build Status](https://travis-ci.org/mridgway/dispatchr.svg?branch=master)](https://travis-ci.org/ouchtown/dispatchr) [![Dependency Status](https://david-dm.org/ouchtown/dispatchr.svg)](https://david-dm.org/ouchtown/dispatchr)
=========

A [Flux](http://facebook.github.io/react/docs/flux-overview.html) dispatcher for applications that run on the server and the client.

Usage
-----

For a more detailed example, see our [example application](https://github.com/ouchtown/dispatchr/tree/master/examples/simple).

Let's start with a store that can handle the actions:

```js
var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function ExampleStore(context) {
    this.navigating = false;
}

ExampleStore.storeName = 'ExampleStore';

util.inherits(ExampleStore, EventEmitter);

ExampleStore.handlers = {
    'NAVIGATE': 'handleNavigate'
};

ExampleStore.prototype.handleNavigate = function (payload, done) {
    this.navigating = true;
    this.emit('update'); // Component may be listening for updates to state
    done(); // Action has been fully handled
};

ExampleStore.prototype.getState = function () {
    return {
        navigating: this.navigating
    };
};
```

Now let's initialize our dispatcher and dispatch an action:
```js
var Dispatchr = require('dispatchr'),
    ExampleStore = require('./example-store.js'),
    context = {};

Dispatchr.registerStore(ExampleStore);

var dispatcher = new Dispatchr(context);

dispatcher.dispatch('NAVIGATE', {}, function (err) {
    // Action has been handled fully
});
```


License
-------
This software is free to use under the Yahoo! Inc. BSD license.
See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: https://github.com/ouchtown/dispatchr/blob/master/LICENSE.md
