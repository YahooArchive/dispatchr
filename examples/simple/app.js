require('node-jsx').install({ extension: '.jsx' });
var http = require('http'),
    React = require('react/addons'),
    Dispatchr = require('../../index'),
    ExampleStore = require('./stores/ExampleStore'),
    Application = require('./components/Application.jsx');

Dispatchr.registerStore(ExampleStore);

var server = http.createServer(function (req, res) {
    var dispatcher = new Dispatchr(req.context || {});

    dispatcher.dispatch('NAVIGATE', {
        url: req.url
    }, function () {
        var app = Application({dispatcher: dispatcher});
        var html = React.renderComponentToString(app);
        res.write(html);
        res.end();
    });
});

server.listen(process.env.PORT || 3000);
