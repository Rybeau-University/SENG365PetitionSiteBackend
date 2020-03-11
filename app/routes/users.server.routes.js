const users = require('../controllers/users.server.controller');

module.exports = function (app) {
    app.route('/api/v1/users/register')
        .post(users.register);
    app.route('/api/v1/users/login')
        .post(users.login);
    app.route('/api/v1/users/logout')
        .post(users.logout);
};