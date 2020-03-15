const User = require('../models/users.server.model');
const Auth = require("../middleware/userAuthentication");

async function checkEmail(email){
    let result = false;
    if (email.includes("@") && await User.checkEmail(email)){
        result = true;
    }
    return result;
}

function errorOccured (err, res) {
    switch (err) {
        case "Bad Request":
            res.status(400)
                .send(err);
            break;
        case "Unauthorized":
            res.status(401)
                .send(err);
            break;
        case "Forbidden":
            res.status(403)
                .send(err);
            break;
        case "Not Found":
            res.status(404)
                .send(err);
            break;
        default:
            res.status(500)
                .send(`Internal Server Error: ${err}`);
            break;
    }
}

exports.register = async function (req, res) {
    try {
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;
        if (password != null && await checkEmail(email) && name != null) {
            const result = await User.insert(name, email, password, req.body.city, req.body.country);
            res.status(201)
                .send({"userId":result.insertId});
        } else {
            throw("Bad Request");
        }
    } catch (err) {
        errorOccured(err, res);
    }
};

exports.login = async function (req, res) {
    try {
        const email = req.body.email;
        const password = req.body.password;
        if (await User.checkEmail(email) || password === null) {throw("Bad Request")}
        else {
            let queryResult = await User.getPass(email);
            const dbPassword = queryResult[0].password;
            const user_id = queryResult[0].user_id;
            if(password === dbPassword){
                let token = Math.random(32).toString().substring(7);
                await User.setAuth(email, token);
                res.status(200)
                    .send({"userId": user_id, "token":token});
        } else {
                throw("Bad Request");
            }
        }
    } catch (err) {
        errorOccured(err, res);
    }
};

exports.logout = async function (req, res) {
    try {
        const auth_token = req.header('X-Authorization');
        if (auth_token === undefined){
            throw("Unauthorized");
        } else {
            const result = await User.removeAuth(auth_token);
            if (result.affectedRows === 0){
                throw("Unauthorized");
            } else {
                res.status(200)
                    .send("OK");
            }
        }
    } catch (err) {
        errorOccured(err, res);
    }
};

exports.viewUser = async function (req, res) {
    try {
        const user_id = req.params.user_id;
        const req_auth_token = req.header('X-Authorization');
        const result = await User.getUser(user_id);
        if (result.length === 0){
            throw("Not Found");
        } else {
            let responseBody = result[0];
            if (req_auth_token != undefined){
                if (await Auth.authenticate(req_auth_token, user_id)) {
                    delete responseBody.email;
                }
            } else {
                delete responseBody.email;
            }
            res.status(200)
                .send(responseBody);
        }
    } catch (err) {
        errorOccured(err, res);
    }
};

exports.updateUser = async function (req, res) {
    try {
        const user_id = req.params.user_id;
        const auth_token = req.header("X-Authorization");
        if(Object.getOwnPropertyNames(req.body).length === 0) throw("Bad Request");
        if (auth_token != undefined && await Auth.authenticate(auth_token, user_id)) {
            const originalUser = (await User.getUser(user_id))[0];
            const oldPassword = (await User.getPass(originalUser.email))[0].password;
            const name = req.body.name === undefined ? originalUser.name: req.body.name;
            const city = req.body.city === undefined ? originalUser.city: req.body.city;
            const country = req.body.country === undefined ? originalUser.country: req.body.country;
            let email = req.body.email;
            let password = req.body.password;
            let currentPassword = req.body.currentPassword;
            if (email != undefined){
                if (!(await checkEmail(email)) && email !== originalUser.email){
                    throw("Forbidden");
                }
            } else if (req.hasOwnProperty('email')){
                throw("Forbidden");
            } else {
                email = originalUser.email;
            }
            if (password != undefined) {
                if (currentPassword !== oldPassword){
                    throw("Forbidden");
                }
            } else if (req.hasOwnProperty('password')) {
                throw("Forbidden");

            } else {
                    password = originalUser.password;
            }
            const result = await User.updateUser(name, email, password, city, country, user_id);
            res.status(200)
                .send("OK");
        } else {
            throw("Unauthorized")
        }
    } catch (err) {
        errorOccured(err, res);
    }
};

exports.viewPhoto = async function (req, res) {
    try {
        const user_id = req.params.user_id;
        const filename = (await User.getPhoto(user_id))[0].photo_filename;
        if(filename != null){
            res.status(200)
                .sendFile("/storage/photos/"  + filename, {root: process.cwd() });
        } else {
            throw("Not Found");
        }
    } catch (err){
        errorOccured(err, res);
    }
};