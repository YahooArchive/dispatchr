require('setimmediate');
var React = require('react/addons'),
    Dispatchr = require('../../index'),
    ExampleStore = require('./stores/ExampleStore'),
    Application = require('./components/Application.jsx');

window.React = React; // For chrome dev tool support

Dispatchr.registerStore(ExampleStore);

var dispatcher = new Dispatchr({});
dispatcher.rehydrate(App.Dispatcher);

dispatcher.dispatch('BOOTSTRAP', {}, function () {
    var app = Application({dispatcher: dispatcher}),
        mountNode = document.getElementById('app');

    React.renderComponent(app, mountNode, function (err) {
        console.log(err);
    });
});
